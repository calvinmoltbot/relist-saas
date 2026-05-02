import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { userScope } from "@/lib/db/scoped";
import { ItemActions } from "./actions";
import { ItemPhotos } from "./photos";

function gbp(n: string | null) {
  return n == null ? "—" : `£${parseFloat(n).toFixed(2)}`;
}

export default async function ItemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { id } = await params;
  const scope = userScope(userId);
  const item = await scope.getItem(id);
  if (!item) notFound();

  const txns = await scope.listTransactionsForItem(id);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/inventory" className="text-xs text-gray-500 underline">
            ← Inventory
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{item.name}</h1>
          <p className="text-sm text-gray-600">
            {[item.brand, item.category, item.size].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <span className="rounded bg-gray-100 px-2 py-1 text-xs">{item.status}</span>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
        <Row label="Cost" value={gbp(item.costPrice)} />
        <Row label="Listed" value={gbp(item.listedPrice)} />
        <Row label="Sold" value={gbp(item.soldPrice)} />
        <Row label="Condition" value={item.condition ?? "—"} />
        <Row
          label="Listed at"
          value={item.listedAt ? new Date(item.listedAt).toLocaleDateString() : "—"}
        />
        <Row
          label="Sold at"
          value={item.soldAt ? new Date(item.soldAt).toLocaleDateString() : "—"}
        />
      </dl>

      <ItemPhotos itemId={item.id} initialPhotos={item.photoUrls ?? []} />

      {item.description && (
        <p className="whitespace-pre-wrap rounded-md border bg-gray-50 p-4 text-sm">
          {item.description}
        </p>
      )}

      <ItemActions
        id={item.id}
        status={item.status}
        listedPrice={item.listedPrice}
        soldPrice={item.soldPrice}
      />

      <section>
        <h2 className="text-sm font-medium text-gray-600">Transactions</h2>
        {txns.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Gross</th>
                <th className="py-2 pr-4">Shipping</th>
                <th className="py-2 pr-4">Fees</th>
                <th className="py-2 pr-4">Profit</th>
                <th className="py-2 pr-4">Completed</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 pr-4">{t.transactionType}</td>
                  <td className="py-2 pr-4">{gbp(t.grossPrice)}</td>
                  <td className="py-2 pr-4">{gbp(t.shippingCost)}</td>
                  <td className="py-2 pr-4">{gbp(t.platformFees)}</td>
                  <td className="py-2 pr-4">{gbp(t.profit)}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {t.completedAt ? new Date(t.completedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
