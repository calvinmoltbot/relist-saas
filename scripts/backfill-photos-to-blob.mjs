#!/usr/bin/env node
/**
 * Phase 2 of #31. Walk every item whose photo_urls / thumbnail_url still
 * holds `data:image/...;base64,...` strings, decode them, resize the same
 * way the live upload path does (1200x1200 q70 full, 200x200 q60 thumb),
 * push to Vercel Blob, and write the resulting public URLs back.
 *
 * Idempotent. Re-running only touches rows that still contain a data URI.
 * Dry-run by default; pass --apply to actually write.
 *
 * Usage:
 *   node scripts/backfill-photos-to-blob.mjs                # dry-run, all users
 *   node scripts/backfill-photos-to-blob.mjs --apply        # do it
 *   node scripts/backfill-photos-to-blob.mjs --user-id U    # one user only
 *   node scripts/backfill-photos-to-blob.mjs --limit 5      # first 5 items
 *   node scripts/backfill-photos-to-blob.mjs --apply --limit 1   # smoke test
 *
 * Reads DATABASE_URL + BLOB_READ_WRITE_TOKEN from .env.local. Get them with:
 *   vercel env pull .env.local
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import sharp from "sharp";

config({ path: ".env.local", quiet: true });

const args = parseArgs(process.argv.slice(2));
const apply = !!args.apply;
const userFilter = args["user-id"] ?? null;
const limit = args.limit ? Number(args.limit) : null;

if (!process.env.DATABASE_URL) die("DATABASE_URL is not set");
if (apply && !process.env.BLOB_READ_WRITE_TOKEN)
  die("BLOB_READ_WRITE_TOKEN is not set (required with --apply)");

const sql = neon(process.env.DATABASE_URL);
const token = process.env.BLOB_READ_WRITE_TOKEN;

const DATA_URI_RE = /^data:(image\/[^;]+);base64,(.+)$/;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`);
if (userFilter) console.log(`User filter: ${userFilter}`);
if (limit) console.log(`Limit: ${limit}`);

const where = [`(
  EXISTS (SELECT 1 FROM unnest(photo_urls) p WHERE p LIKE 'data:%')
  OR thumbnail_url LIKE 'data:%'
)`];
const params = [];
if (userFilter) {
  params.push(userFilter);
  where.push(`user_id = $${params.length}`);
}
const limitClause = limit ? `LIMIT ${Math.floor(limit)}` : "";
const query = `
  SELECT id, user_id, photo_urls, thumbnail_url
  FROM items
  WHERE ${where.join(" AND ")}
  ORDER BY created_at ASC
  ${limitClause}
`;

const rows = await sql.query(query, params);
console.log(`Found ${rows.length} item(s) with legacy base64 photos.`);

let migrated = 0;
let skipped = 0;
let failed = 0;
let bytesIn = 0;
let bytesOut = 0;

for (const row of rows) {
  const { id, user_id, photo_urls, thumbnail_url } = row;
  const legacyPhotos = (photo_urls ?? []).filter(
    (p) => typeof p === "string" && p.startsWith("data:"),
  );
  const legacyThumb =
    typeof thumbnail_url === "string" && thumbnail_url.startsWith("data:")
      ? thumbnail_url
      : null;

  if (legacyPhotos.length === 0 && !legacyThumb) {
    skipped++;
    continue;
  }

  const tag = `[${id} u=${user_id}] photos=${legacyPhotos.length} thumb=${legacyThumb ? "yes" : "no"}`;
  try {
    const newPhotoUrls = [...(photo_urls ?? [])];
    let newThumbUrl = thumbnail_url;

    // Pick the first photo as the source of the canonical thumbnail
    // (matches the upload-route behaviour). If thumbnail is base64 but the
    // photos are already URLs (mixed state), still rederive from the first
    // photo to keep blob ownership consistent.
    let firstPhotoBuffer = null;

    for (let i = 0; i < newPhotoUrls.length; i++) {
      const p = newPhotoUrls[i];
      if (typeof p !== "string" || !p.startsWith("data:")) continue;
      const decoded = decode(p);
      if (!decoded) {
        console.warn(`${tag} photo[${i}] could not be decoded — leaving as-is`);
        continue;
      }
      bytesIn += decoded.buffer.byteLength;
      const { full } = await resize(decoded.buffer);
      bytesOut += full.byteLength;
      if (apply) {
        const res = await put(`items/${user_id}/${id}/photo.jpeg`, full, {
          access: "public",
          contentType: "image/jpeg",
          addRandomSuffix: true,
          cacheControlMaxAge: ONE_YEAR_SECONDS,
          token,
        });
        newPhotoUrls[i] = res.url;
      } else {
        newPhotoUrls[i] = `<would-upload ${full.byteLength}B>`;
      }
      if (firstPhotoBuffer === null) firstPhotoBuffer = decoded.buffer;
    }

    // Rederive thumbnail when it's still base64. Source = first photo we
    // just decoded, falling back to the legacy thumb itself.
    if (legacyThumb) {
      const src =
        firstPhotoBuffer ??
        (() => {
          const d = decode(legacyThumb);
          return d ? d.buffer : null;
        })();
      if (src) {
        const { thumb } = await resize(src);
        bytesOut += thumb.byteLength;
        if (apply) {
          const res = await put(
            `items/${user_id}/${id}/photo-thumb.jpeg`,
            thumb,
            {
              access: "public",
              contentType: "image/jpeg",
              addRandomSuffix: true,
              cacheControlMaxAge: ONE_YEAR_SECONDS,
              token,
            },
          );
          newThumbUrl = res.url;
        } else {
          newThumbUrl = `<would-upload ${thumb.byteLength}B>`;
        }
      } else {
        console.warn(`${tag} thumb could not be decoded — leaving as-is`);
      }
    }

    if (apply) {
      await sql`
        UPDATE items
        SET photo_urls = ${newPhotoUrls}, thumbnail_url = ${newThumbUrl}
        WHERE id = ${id}
      `;
    }
    migrated++;
    console.log(
      `${apply ? "✓" : "would migrate"} ${tag} → photos[0]=${truncate(newPhotoUrls[0])} thumb=${truncate(newThumbUrl)}`,
    );
  } catch (err) {
    failed++;
    console.error(`✗ ${tag} FAILED:`, err?.message ?? err);
  }
}

console.log("");
console.log(`Done. migrated=${migrated} skipped=${skipped} failed=${failed}`);
console.log(
  `Decoded ~${human(bytesIn)} → re-encoded ~${human(bytesOut)} (${apply ? "uploaded" : "not uploaded"}).`,
);
if (!apply) {
  console.log("");
  console.log("Re-run with --apply to actually upload + update the DB.");
}

// ---------- helpers ----------

function decode(dataUri) {
  const m = dataUri.match(DATA_URI_RE);
  if (!m) return null;
  try {
    return { contentType: m[1], buffer: Buffer.from(m[2], "base64") };
  } catch {
    return null;
  }
}

async function resize(buffer) {
  const [full, thumb] = await Promise.all([
    sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer(),
    sharp(buffer)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer(),
  ]);
  return { full, thumb };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function truncate(s) {
  if (typeof s !== "string") return String(s);
  return s.length > 60 ? s.slice(0, 57) + "..." : s;
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function die(msg) {
  console.error("✗", msg);
  process.exit(1);
}
