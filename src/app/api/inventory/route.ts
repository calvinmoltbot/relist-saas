import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";

export const runtime = "nodejs";

async function withUser(req: NextRequest) {
  try {
    return { userId: await getUserId(req) } as const;
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return { error: NextResponse.json({ error: e.message }, { status: 401 }) } as const;
    throw e;
  }
}

export async function GET(req: NextRequest) {
  const u = await withUser(req);
  if ("error" in u) return u.error;

  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort");
  const items = await userScope(u.userId).listItems({
    status: sp.get("status"),
    search: sp.get("search"),
    sort: sort === "price" || sort === "brand" || sort === "date" ? sort : null,
    incompleteOnly: sp.get("incompleteOnly") === "1",
  });

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=300" } },
  );
}

const numStr = z
  .union([z.number(), z.string()])
  .transform((v) => String(v))
  .nullable()
  .optional();

const CreateSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullish(),
  category: z.string().nullish(),
  condition: z.string().nullish(),
  size: z.string().nullish(),
  costPrice: numStr,
  listedPrice: numStr,
  description: z.string().nullish(),
  sourceType: z.string().nullish(),
  sourceLocation: z.string().nullish(),
  vintedUrl: z.string().url().nullish(),
  photoUrls: z.array(z.string()).nullish(),
  thumbnailUrl: z.string().nullish(),
  status: z.enum(["sourced", "listed", "sold", "shipped"]).optional(),
});

export async function POST(req: NextRequest) {
  const u = await withUser(req);
  if ("error" in u) return u.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const scope = userScope(u.userId);

  // Dedup within this user: prefer vintedUrl, fall back to name match
  let existing = data.vintedUrl ? await scope.findItemByVintedUrl(data.vintedUrl) : null;
  if (!existing) existing = await scope.findItemByName(data.name);

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (!existing.brand && data.brand) updates.brand = data.brand;
    if (!existing.category && data.category) updates.category = data.category;
    if (!existing.condition && data.condition) updates.condition = data.condition;
    if (!existing.size && data.size) updates.size = data.size;
    if (!existing.listedPrice && data.listedPrice) updates.listedPrice = data.listedPrice;
    if (!existing.description && data.description) updates.description = data.description;
    if (!existing.vintedUrl && data.vintedUrl) updates.vintedUrl = data.vintedUrl;
    if (data.photoUrls?.length && !existing.hasPhotos) {
      updates.photoUrls = data.photoUrls;
      if (data.thumbnailUrl && !existing.thumbnailUrl) updates.thumbnailUrl = data.thumbnailUrl;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ item: existing, updated: false });
    }
    const [updated] = await scope.updateItem(existing.id, updates);
    return NextResponse.json({ item: updated, updated: true });
  }

  const status = data.status ?? "sourced";
  const now = new Date();
  const [item] = await scope.insertItem({
    name: data.name,
    brand: data.brand ?? null,
    category: data.category ?? null,
    condition: data.condition ?? null,
    size: data.size ?? null,
    costPrice: data.costPrice ?? null,
    listedPrice: data.listedPrice ?? null,
    description: data.description ?? null,
    sourceType: data.sourceType ?? null,
    sourceLocation: data.sourceLocation ?? null,
    vintedUrl: data.vintedUrl ?? null,
    photoUrls: data.photoUrls ?? null,
    thumbnailUrl: data.thumbnailUrl ?? null,
    status,
    listedAt: status === "listed" ? now : null,
  });

  return NextResponse.json({ item }, { status: 201 });
}
