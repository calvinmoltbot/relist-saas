// Listing completeness score (0-100). Weights sum to 100; missing fields are
// penalised. `condition` is intentionally omitted (UX choice — see legacy notes);
// `vintedUrl` takes its slot.
//
// Cost is NOT a completeness field. Per AGENTS.md → "Cost handling", items
// with `acquisitionType === "own"` always have cost = 0; treating cost as
// "missing" for them would penalise a perfectly valid listing. The current
// weights ignore cost entirely so own and bought items are scored on the
// same fields, which is what we want.

export const WEIGHTS = {
  brand: 20,
  category: 15,
  size: 10,
  description: 20, // ≥40 chars
  photos: 20, // ≥3
  title: 10, // >3 words
  vintedUrl: 5,
} as const;

export const PHOTO_TARGET = 3;
export const TITLE_TARGET = 4; // words
export const DESCRIPTION_TARGET = 40; // chars

export type CompletenessField = keyof typeof WEIGHTS;

export interface FieldStatus {
  field: CompletenessField;
  /** Short chip-ready label, dynamic when partial state is meaningful
   *  (e.g. "Photos (1/3)", "Title (2/4 words)"). */
  label: string;
  weight: number;
  present: boolean;
  /** Longer guidance — used as title/tooltip on chips. */
  hint: string;
}

export interface CompletenessResult {
  score: number;
  band: "green" | "amber" | "red";
  fields: FieldStatus[];
  missing: FieldStatus[];
}

export interface ItemLike {
  name: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  description: string | null;
  /** Either pass the array (legacy) or a precomputed count (preferred — avoids
   *  pulling base64 blobs from Postgres just to call .length). */
  photoUrls?: string[] | null;
  photoCount?: number | null;
  vintedUrl: string | null;
}

const STATIC_HINTS: Record<CompletenessField, string> = {
  brand: "Add the brand — buyers search for it",
  category: "Pick a category so it shows up in the right browse",
  size: "Size matters for every clothing search",
  description: "Aim for a couple of sentences — fit, feel, styling ideas",
  photos: "More angles = more clicks",
  title: "Stuff the title with keywords buyers actually search",
  vintedUrl: "Paste the Vinted URL so you can jump back to the live listing",
};

function hasText(v: string | null | undefined, minLen = 1): boolean {
  return typeof v === "string" && v.trim().length >= minLen;
}

function wordCount(v: string | null | undefined): number {
  if (!hasText(v)) return 0;
  return (v as string).trim().split(/\s+/).length;
}

function photoCountOf(item: ItemLike): number {
  if (typeof item.photoCount === "number") return item.photoCount;
  return Array.isArray(item.photoUrls) ? item.photoUrls.length : 0;
}

function descriptionLength(item: ItemLike): number {
  return typeof item.description === "string" ? item.description.trim().length : 0;
}

/** Build a per-field FieldStatus with a label that reflects the *current*
 *  state of the item — so a chip can read "Photos (1/3)" instead of
 *  the always-the-same "3+ photos". */
function buildField(field: CompletenessField, item: ItemLike): FieldStatus {
  const weight = WEIGHTS[field];
  const hint = STATIC_HINTS[field];

  switch (field) {
    case "brand": {
      const present = hasText(item.brand);
      return { field, label: "Brand", weight, present, hint };
    }
    case "category": {
      const present = hasText(item.category);
      return { field, label: "Category", weight, present, hint };
    }
    case "size": {
      const present = hasText(item.size);
      return { field, label: "Size", weight, present, hint };
    }
    case "vintedUrl": {
      const present = hasText(item.vintedUrl);
      return { field, label: "Vinted link", weight, present, hint };
    }
    case "photos": {
      const n = photoCountOf(item);
      const present = n >= PHOTO_TARGET;
      const label = present
        ? `Photos (${n})`
        : n === 0
          ? `Photos (0/${PHOTO_TARGET})`
          : `Photos (${n}/${PHOTO_TARGET})`;
      return { field, label, weight, present, hint };
    }
    case "title": {
      const w = wordCount(item.name);
      const present = w >= TITLE_TARGET;
      const label = present
        ? "Title"
        : `Title (${w}/${TITLE_TARGET} words)`;
      return { field, label, weight, present, hint };
    }
    case "description": {
      const len = descriptionLength(item);
      const present = len >= DESCRIPTION_TARGET;
      const label = present
        ? "Description"
        : len === 0
          ? `Description (0/${DESCRIPTION_TARGET} chars)`
          : `Description (${len}/${DESCRIPTION_TARGET} chars)`;
      return { field, label, weight, present, hint };
    }
  }
}

const ALL_FIELDS: CompletenessField[] = [
  "brand",
  "category",
  "size",
  "description",
  "photos",
  "title",
  "vintedUrl",
];

export function scoreItem(item: ItemLike): CompletenessResult {
  const fields = ALL_FIELDS.map((f) => buildField(f, item));
  const score = fields.reduce((sum, f) => sum + (f.present ? f.weight : 0), 0);
  const band: "green" | "amber" | "red" =
    score >= 80 ? "green" : score >= 50 ? "amber" : "red";
  const missing = fields
    .filter((f) => !f.present)
    .sort((a, b) => b.weight - a.weight);
  return { score, band, fields, missing };
}

export interface ItemGap {
  itemId: string;
  score: number;
  /** All missing fields for this item, sorted by weight desc. */
  missing: FieldStatus[];
}

export interface CompletenessSummary {
  count: number;
  averageScore: number;
  healthyPct: number;
  bands: { green: number; amber: number; red: number };
  /** Items with the most impactful gaps. Each row carries the full set of
   *  missing fields so the UI can render every chip, not just the top one. */
  topGaps: ItemGap[];
}

export function summarise(
  items: Array<ItemLike & { id: string }>,
  limit = 5,
): CompletenessSummary {
  if (items.length === 0) {
    return {
      count: 0,
      averageScore: 0,
      healthyPct: 0,
      bands: { green: 0, amber: 0, red: 0 },
      topGaps: [],
    };
  }

  const bands = { green: 0, amber: 0, red: 0 };
  let totalScore = 0;
  const rows: ItemGap[] = [];

  for (const item of items) {
    const r = scoreItem(item);
    totalScore += r.score;
    bands[r.band]++;
    if (r.missing.length > 0) {
      rows.push({ itemId: item.id, score: r.score, missing: r.missing });
    }
  }

  // Rank items by their single biggest gap weight, then by score asc
  // (lower scores surface first when biggest-gap weights tie).
  const topGaps = rows
    .sort((a, b) => (b.missing[0]?.weight ?? 0) - (a.missing[0]?.weight ?? 0) || a.score - b.score)
    .slice(0, limit);

  return {
    count: items.length,
    averageScore: Math.round(totalScore / items.length),
    healthyPct: Math.round((bands.green / items.length) * 100),
    bands,
    topGaps,
  };
}
