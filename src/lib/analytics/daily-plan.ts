import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";

// Constants — restored from a user_settings table later.
const STALE_LISTING_DAYS = 2;

export type TaskType = "ship" | "update" | "reprice" | "photo";

export interface DailyTask {
  id: string;
  type: TaskType;
  priority: number;
  title: string;
  subtitle: string;
  itemId: string;
  itemName: string;
  action: string;
  estimatedMinutes: number;
}

export interface DailyPlan {
  tasks: DailyTask[];
  totalEstimatedMinutes: number;
  countsByType: Record<TaskType, number>;
}

const gbp0 = (s: string | null) => (s ? `£${parseFloat(s).toFixed(0)}` : "");

export async function buildDailyPlan(userId: string): Promise<DailyPlan> {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_LISTING_DAYS * 86_400_000);

  const [soldItems, incompleteItems, staleItems, noPhotoItems] = await Promise.all([
    db
      .select({ id: items.id, name: items.name, soldPrice: items.soldPrice })
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.status, "sold"))),

    db
      .select({
        id: items.id,
        name: items.name,
        costPrice: items.costPrice,
        category: items.category,
        brand: items.brand,
      })
      .from(items)
      .where(
        and(
          eq(items.userId, userId),
          sql`${items.status} != 'shipped'`,
          or(
            isNull(items.costPrice),
            isNull(items.category),
            isNull(items.brand),
          )!,
        ),
      ),

    db
      .select({
        id: items.id,
        name: items.name,
        listedPrice: items.listedPrice,
        listedAt: items.listedAt,
      })
      .from(items)
      .where(
        and(
          eq(items.userId, userId),
          eq(items.status, "listed"),
          lt(items.listedAt, staleCutoff),
        ),
      ),

    db
      .select({ id: items.id, name: items.name })
      .from(items)
      .where(
        and(
          eq(items.userId, userId),
          eq(items.status, "listed"),
          or(
            isNull(items.photoUrls),
            sql`array_length(${items.photoUrls}, 1) IS NULL`,
          )!,
        ),
      ),
  ]);

  const tasks: DailyTask[] = [];

  for (const item of soldItems) {
    const price = gbp0(item.soldPrice);
    tasks.push({
      id: `ship-${item.id}`,
      type: "ship",
      priority: 1,
      title: "Ship to buyer",
      subtitle: `${item.name}${price ? ` — sold for ${price}` : ""}`,
      itemId: item.id,
      itemName: item.name,
      action: "Mark shipped",
      estimatedMinutes: 2,
    });
  }

  for (const item of incompleteItems) {
    const missing: string[] = [];
    if (!item.costPrice) missing.push("cost price");
    if (!item.category) missing.push("category");
    if (!item.brand) missing.push("brand");
    tasks.push({
      id: `update-${item.id}`,
      type: "update",
      priority: 2,
      title: "Update details",
      subtitle: `${item.name} — missing ${missing.join(", ")}`,
      itemId: item.id,
      itemName: item.name,
      action: "Edit",
      estimatedMinutes: 1,
    });
  }

  for (const item of staleItems) {
    const days = Math.floor(
      (now.getTime() - (item.listedAt?.getTime() ?? now.getTime())) / 86_400_000,
    );
    const price = gbp0(item.listedPrice);
    tasks.push({
      id: `reprice-${item.id}`,
      type: "reprice",
      priority: 3,
      title: "Review pricing",
      subtitle: `${item.name}${price ? ` — listed at ${price}` : ""} · ${days}d`,
      itemId: item.id,
      itemName: item.name,
      action: "Review",
      estimatedMinutes: 2,
    });
  }

  for (const item of noPhotoItems) {
    tasks.push({
      id: `photo-${item.id}`,
      type: "photo",
      priority: 4,
      title: "Add photos",
      subtitle: `${item.name} — no photos yet`,
      itemId: item.id,
      itemName: item.name,
      action: "Add photos",
      estimatedMinutes: 3,
    });
  }

  tasks.sort(
    (a, b) => a.priority - b.priority || a.itemName.localeCompare(b.itemName),
  );

  const countsByType: Record<TaskType, number> = {
    ship: 0,
    update: 0,
    reprice: 0,
    photo: 0,
  };
  for (const t of tasks) countsByType[t.type] += 1;

  return {
    tasks,
    totalEstimatedMinutes: tasks.reduce((s, t) => s + t.estimatedMinutes, 0),
    countsByType,
  };
}
