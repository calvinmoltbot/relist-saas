import { auth } from "@clerk/nextjs/server";
import { eq, and, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  // 32 random bytes → 43-char URL-safe base64. Prefix with "rk_" for easy spotting.
  const raw = "rk_" + randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw), prefix: raw.slice(0, 8) };
}

/**
 * Resolve the authenticated user for a request.
 * - If a Clerk session cookie is present (web), use it.
 * - Else if Authorization: Bearer <token> is present, look up an api_keys row.
 * Throws UnauthorizedError on failure. The route catches and returns 401.
 */
export async function getUserId(req: Request): Promise<string> {
  // Web/session path
  try {
    const { userId } = await auth();
    if (userId) return userId;
  } catch {
    // ignore — fall through to bearer
  }

  // Extension/API path
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new UnauthorizedError("Missing credentials");

  const raw = match[1].trim();
  const tokenHash = hashToken(raw);

  const rows = await db
    .select({ userId: apiKeys.userId, id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.tokenHash, tokenHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new UnauthorizedError("Invalid token");

  // fire-and-forget last-used update
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => {});

  return row.userId;
}
