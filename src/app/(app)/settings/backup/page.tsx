import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, expenses, priceData, priceStats } from "@/db/schema";
import { RestoreForm } from "./restore-form";

export default async function BackupSettings() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const [it, tx, ex, pd, ps] = await Promise.all([
    db.$count(items, eq(items.userId, userId)),
    db.$count(transactions, eq(transactions.userId, userId)),
    db.$count(expenses, eq(expenses.userId, userId)),
    db.$count(priceData, eq(priceData.userId, userId)),
    db.$count(priceStats, eq(priceStats.userId, userId)),
  ]);
  const total = it + tx + ex + pd + ps;

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Backup &amp; restore</h1>
        <p className="mt-1 text-sm text-gray-600">
          Download all your Relist data as a single JSON file, or restore
          from a previous export. Only your rows are touched — never another
          user&apos;s.
        </p>
      </header>

      <section className="rounded-md border p-4">
        <h2 className="text-sm font-medium">Current row counts</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Stat label="Items" value={it} />
          <Stat label="Transactions" value={tx} />
          <Stat label="Expenses" value={ex} />
          <Stat label="Price data" value={pd} />
          <Stat label="Price stats" value={ps} />
        </dl>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="text-sm font-medium">Download backup</h2>
        <p className="mt-1 text-xs text-gray-600">
          Includes items, transactions, expenses, price data and price stats.
          API keys are excluded — tokens are hashed, regenerate them from
          the API keys page.
        </p>
        <a
          href="/api/backup"
          className="mt-3 inline-block rounded-md bg-black px-3 py-1.5 text-sm text-white"
        >
          Download {total} rows
        </a>
      </section>

      <section className="rounded-md border border-red-200 bg-red-50/50 p-4">
        <h2 className="text-sm font-medium text-red-900">Restore from backup</h2>
        <p className="mt-1 text-xs text-red-800">
          This will <strong>delete every row you currently have</strong> and
          replace it with the contents of the uploaded file. Your other Relist
          accounts (and other users) are not touched. Recommended: download a
          fresh backup first.
        </p>
        <RestoreForm />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
