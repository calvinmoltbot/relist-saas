import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userScope } from "@/lib/db/scoped";

function fmt(minor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
}

export default async function MarketPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const rows = await userScope(userId).listPriceData(200);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Market</h1>
      <p className="mt-2 text-sm text-gray-600">
        Listings ingested from your Chrome extension. {rows.length} most recent shown.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed p-6 text-sm text-gray-500">
          No data yet. Install the Relist extension, paste an API key from{" "}
          <a className="underline" href="/settings/api-keys">Settings → API keys</a>, then
          browse a Vinted listing.
        </div>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Brand</th>
              <th className="py-2 pr-4">Size</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Observed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-4">
                  {r.url ? (
                    <a className="underline" href={r.url} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                </td>
                <td className="py-2 pr-4">{r.brand ?? "—"}</td>
                <td className="py-2 pr-4">{r.size ?? "—"}</td>
                <td className="py-2 pr-4">{fmt(r.priceMinor, r.currency)}</td>
                <td className="py-2 pr-4 text-xs text-gray-500">
                  {new Date(r.observedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
