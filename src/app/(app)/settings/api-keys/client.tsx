"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader } from "@/components/ui";

type Key = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function ApiKeysClient({ initialKeys }: { initialKeys: Key[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setJustCreated({ name: data.name, token: data.token });
      setCopied(false);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Anything using it will stop working.")) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function purge(id: string) {
    if (!confirm("Permanently delete this revoked key? This cannot be undone.")) return;
    const res = await fetch(`/api/api-keys/${id}?hard=1`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--accent-amber)]/40 bg-[var(--accent-amber-soft)] px-4 py-3 text-sm text-[var(--accent-amber-soft-fg)]">
        <span aria-hidden className="mt-0.5 text-base leading-none">!</span>
        <p>
          Treat your API tokens like passwords. Don&apos;t share them in public
          places — right now, you won&apos;t be able to read a key once it
          leaves this page.
        </p>
      </section>

      <Card>
        <CardHeader
          title="Create a new API key"
          description="Name it after the device or browser profile that will use it."
        />
        <form onSubmit={create} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 min-w-[14rem] flex-col text-sm">
            <span className="mb-1 text-[var(--text-secondary)]">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My laptop, or Work laptop"
              className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-3 py-2 text-sm"
              required
            />
          </label>
          <Button type="submit" disabled={creating || !name}>
            {creating ? "Creating…" : "+ Create key"}
          </Button>
          {error && (
            <span className="text-sm text-[var(--accent-rose)]">{error}</span>
          )}
        </form>
      </Card>

      {justCreated && (
        <section
          role="alert"
          className="rounded-[var(--radius-lg)] border-2 border-[var(--accent-amber)] bg-[var(--accent-amber-soft)] p-5 shadow-[var(--elev-2)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--accent-amber-soft-fg)]">
                Copy this token now — you won&apos;t see it again.
              </h2>
              <p className="mt-1 text-sm text-[var(--accent-amber-soft-fg)]">
                Paste it into the Relist Chrome extension under{" "}
                <em>{justCreated.name}</em>. This token will not be shown again
                after you close this message.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent-amber)]/50 bg-[var(--surface-card)] px-3 py-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-[var(--text-primary)]">
              {justCreated.token}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copyToken(justCreated.token)}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setJustCreated(null)}
            >
              I&apos;ve saved it — close
            </Button>
          </div>
        </section>
      )}

      <Card>
        <CardHeader
          title="Your API keys"
          description={
            initialKeys.length === 0
              ? "No keys yet. Create one above to get started."
              : `${initialKeys.length} ${
                  initialKeys.length === 1 ? "key" : "keys"
                } total.`
          }
        />
        {initialKeys.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            {initialKeys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text-primary)]">
                    {k.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                    <span className="font-mono">{k.tokenPrefix}…</span>
                    {" · "}
                    created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt &&
                      ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {k.revokedAt ? (
                    <>
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                        Revoked
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => purge(k.id)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs text-[var(--brand-soft-fg)]">
                        Active
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => revoke(k.id)}
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
