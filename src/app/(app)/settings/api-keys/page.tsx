import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userScope } from "@/lib/db/scoped";
import { PageHeader } from "@/components/ui";
import { ApiKeysClient } from "./client";

export default async function ApiKeysPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const keys = await userScope(userId).listApiKeys();
  return (
    <div className="space-y-6">
      <PageHeader
        title="API keys"
        subtitle="Bearer tokens used by the Relist Chrome extension to send Vinted listing data into your account. Treat them like passwords — the full token is shown only once at creation."
      />
      <ApiKeysClient
        initialKeys={keys.map((k) => ({
          id: k.id,
          name: k.name,
          tokenPrefix: k.tokenPrefix,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          revokedAt: k.revokedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
