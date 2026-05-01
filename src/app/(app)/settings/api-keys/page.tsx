import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userScope } from "@/lib/db/scoped";
import { ApiKeysClient } from "./client";

export default async function ApiKeysPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const keys = await userScope(userId).listApiKeys();
  return (
    <div>
      <h1 className="text-2xl font-semibold">API keys</h1>
      <p className="mt-2 text-sm text-gray-600">
        Used by the Relist Chrome extension to send Vinted listing data to your account.
        Treat them like passwords. The full token is shown only once at creation.
      </p>
      <ApiKeysClient initialKeys={keys.map((k) => ({
        id: k.id,
        name: k.name,
        tokenPrefix: k.tokenPrefix,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
      }))} />
    </div>
  );
}
