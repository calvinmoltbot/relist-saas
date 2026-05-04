import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, expenses, priceData, priceStats } from "@/db/schema";
import { ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
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
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Backup & restore"
        subtitle="Download all your Relist data as a single JSON file, or restore from a previous export. Only your rows are touched — never another user's."
      />

      <Card>
        <CardHeader title="Current row counts" />
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Items" value={it} />
          <Stat label="Transactions" value={tx} />
          <Stat label="Expenses" value={ex} />
          <Stat label="Price data" value={pd} />
          <Stat label="Price stats" value={ps} />
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Download backup"
          description="Includes items, transactions, expenses, price data and price stats. API keys are excluded — tokens are hashed, regenerate them from the API keys page."
          action={
            <ButtonLink href="/api/backup" external size="sm">
              Download {total} rows
            </ButtonLink>
          }
        />
      </Card>

      <Card className="border-[var(--accent-rose)]/40 bg-[var(--accent-rose-soft)]">
        <CardHeader
          title="Restore from backup"
          description="This will delete every row you currently have and replace it with the contents of the uploaded file. Your other Relist accounts (and other users) are not touched. Recommended: download a fresh backup first."
        />
        <div className="mt-4">
          <RestoreForm />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
