import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";
import { resolveDateRange } from "@/lib/date-range";

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
  const { from, to } = resolveDateRange(sp.get("preset"), sp.get("from"), sp.get("to"));
  const rows = await userScope(u.userId).listExpenses({ from, to });

  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const amt = parseFloat(r.amount);
    total += amt;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + amt;
  }

  return NextResponse.json(
    {
      expenses: rows,
      summary: { total: Math.round(total * 100) / 100, byCategory, count: rows.length },
    },
    { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=180" } },
  );
}

const CreateSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional().nullable(),
  amount: z.union([z.number(), z.string()]).transform((v) => String(v)),
  itemId: z.string().optional().nullable(),
  incurredAt: z.string().min(1),
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

  const [expense] = await userScope(u.userId).insertExpense({
    category: parsed.data.category,
    description: parsed.data.description ?? null,
    amount: parsed.data.amount,
    itemId: parsed.data.itemId ?? null,
    incurredAt: new Date(parsed.data.incurredAt),
  });

  return NextResponse.json({ expense }, { status: 201 });
}
