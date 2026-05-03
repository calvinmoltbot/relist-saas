import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, expenses } from "@/db/schema";

type SampleItem = {
  name: string;
  brand: string;
  category: string;
  condition: "new" | "like_new" | "good" | "fair";
  size: string;
  costPrice: string;
  listedPrice: string;
  soldPrice?: string;
  status: "sourced" | "listed" | "sold";
  daysAgoCreated: number;
  daysAgoListed?: number;
  daysAgoSold?: number;
  shippingCost?: string;
  platformFees?: string;
};

const SAMPLES: SampleItem[] = [
  {
    name: "Nike Air Max 90",
    brand: "Nike",
    category: "Shoes",
    condition: "good",
    size: "UK 9",
    costPrice: "12.00",
    listedPrice: "45.00",
    soldPrice: "42.00",
    status: "sold",
    daysAgoCreated: 30,
    daysAgoListed: 28,
    daysAgoSold: 4,
    shippingCost: "3.50",
    platformFees: "2.10",
  },
  {
    name: "Zara Wool Coat",
    brand: "Zara",
    category: "Outerwear",
    condition: "like_new",
    size: "M",
    costPrice: "20.00",
    listedPrice: "55.00",
    status: "listed",
    daysAgoCreated: 10,
    daysAgoListed: 9,
  },
  {
    name: "Levi's 501 Jeans",
    brand: "Levi's",
    category: "Jeans",
    condition: "good",
    size: "W32 L32",
    costPrice: "8.00",
    listedPrice: "28.00",
    soldPrice: "25.00",
    status: "sold",
    daysAgoCreated: 60,
    daysAgoListed: 58,
    daysAgoSold: 14,
    shippingCost: "3.20",
    platformFees: "1.25",
  },
  {
    name: "Uniqlo Heattech Crew",
    brand: "Uniqlo",
    category: "Tops",
    condition: "good",
    size: "L",
    costPrice: "3.00",
    listedPrice: "12.00",
    status: "listed",
    daysAgoCreated: 21,
    daysAgoListed: 20,
  },
  {
    name: "H&M Floral Midi Dress",
    brand: "H&M",
    category: "Dresses",
    condition: "like_new",
    size: "S",
    costPrice: "5.00",
    listedPrice: "18.00",
    status: "sourced",
    daysAgoCreated: 2,
  },
  {
    name: "Adidas Stan Smith",
    brand: "Adidas",
    category: "Shoes",
    condition: "good",
    size: "UK 8",
    costPrice: "15.00",
    listedPrice: "38.00",
    status: "listed",
    daysAgoCreated: 45,
    daysAgoListed: 44,
  },
  {
    name: "Ralph Lauren Polo",
    brand: "Ralph Lauren",
    category: "Tops",
    condition: "good",
    size: "M",
    costPrice: "6.00",
    listedPrice: "22.00",
    soldPrice: "20.00",
    status: "sold",
    daysAgoCreated: 50,
    daysAgoListed: 48,
    daysAgoSold: 7,
    shippingCost: "3.20",
    platformFees: "1.00",
  },
  {
    name: "Mango Trench Coat",
    brand: "Mango",
    category: "Outerwear",
    condition: "new",
    size: "S",
    costPrice: "25.00",
    listedPrice: "65.00",
    status: "sourced",
    daysAgoCreated: 1,
  },
];

const SAMPLE_EXPENSES = [
  {
    category: "shipping_supplies",
    description: "Polymailers + tissue paper",
    amount: "15.40",
    daysAgo: 12,
  },
  {
    category: "packaging",
    description: "Bubble wrap roll",
    amount: "8.20",
    daysAgo: 25,
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export async function hasSampleData(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.isSample, true)))
    .limit(1);
  return rows.length > 0;
}

export async function seedSampleData(userId: string): Promise<{
  items: number;
  transactions: number;
  expenses: number;
}> {
  if (await hasSampleData(userId)) {
    return { items: 0, transactions: 0, expenses: 0 };
  }

  let itemCount = 0;
  let txCount = 0;

  for (const s of SAMPLES) {
    const createdAt = daysAgo(s.daysAgoCreated);
    const listedAt = s.daysAgoListed != null ? daysAgo(s.daysAgoListed) : null;
    const soldAt = s.daysAgoSold != null ? daysAgo(s.daysAgoSold) : null;

    const [row] = await db
      .insert(items)
      .values({
        userId,
        name: s.name,
        brand: s.brand,
        category: s.category,
        condition: s.condition,
        size: s.size,
        costPrice: s.costPrice,
        listedPrice: s.listedPrice,
        soldPrice: s.soldPrice ?? null,
        status: s.status,
        platform: "vinted",
        listedAt,
        soldAt,
        isSample: true,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: items.id });

    itemCount++;

    await db.insert(transactions).values({
      userId,
      itemId: row.id,
      transactionType: "buy",
      grossPrice: s.costPrice,
      shippingCost: "0",
      platformFees: "0",
      profit: null,
      completedAt: createdAt,
      isSample: true,
    });
    txCount++;

    if (s.status === "sold" && s.soldPrice && soldAt) {
      const gross = parseFloat(s.soldPrice);
      const ship = parseFloat(s.shippingCost ?? "0");
      const fees = parseFloat(s.platformFees ?? "0");
      const cost = parseFloat(s.costPrice);
      const profit = (gross - ship - fees - cost).toFixed(2);

      await db.insert(transactions).values({
        userId,
        itemId: row.id,
        transactionType: "sell",
        grossPrice: s.soldPrice,
        shippingCost: s.shippingCost ?? "0",
        platformFees: s.platformFees ?? "0",
        profit,
        completedAt: soldAt,
        isSample: true,
      });
      txCount++;
    }
  }

  let expenseCount = 0;
  for (const e of SAMPLE_EXPENSES) {
    await db.insert(expenses).values({
      userId,
      category: e.category,
      description: e.description,
      amount: e.amount,
      incurredAt: daysAgo(e.daysAgo),
      isSample: true,
    });
    expenseCount++;
  }

  return { items: itemCount, transactions: txCount, expenses: expenseCount };
}

export async function clearSampleData(userId: string): Promise<{
  items: number;
  transactions: number;
  expenses: number;
}> {
  const txDeleted = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isSample, true)))
    .returning({ id: transactions.id });

  const expDeleted = await db
    .delete(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.isSample, true)))
    .returning({ id: expenses.id });

  const itemDeleted = await db
    .delete(items)
    .where(and(eq(items.userId, userId), eq(items.isSample, true)))
    .returning({ id: items.id });

  return {
    items: itemDeleted.length,
    transactions: txDeleted.length,
    expenses: expDeleted.length,
  };
}
