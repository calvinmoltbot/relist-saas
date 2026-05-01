"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
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
    <div className="mt-6 space-y-8">
      <form onSubmit={create} className="flex items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My laptop"
            className="rounded-md border px-3 py-2"
            required
          />
        </label>
        <button
          type="submit"
          disabled={creating || !name}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create key"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>

      {justCreated && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm font-medium">
            Copy this token now — you won&apos;t see it again.
          </p>
          <pre className="mt-2 overflow-x-auto rounded border border-amber-200 bg-white px-3 py-2 text-xs text-gray-900">
            {justCreated.token}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(justCreated.token);
            }}
            className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-1 text-sm text-amber-900 hover:bg-amber-100"
          >
            Copy
          </button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-600">Existing keys</h2>
        {initialKeys.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No keys yet.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-md border">
            {initialKeys.map((k) => (
              <li key={k.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{k.name}</div>
                  <div className="text-xs text-gray-500">
                    {k.tokenPrefix}…{" · "}
                    created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                    {k.revokedAt && ` · revoked`}
                  </div>
                </div>
                {k.revokedAt ? (
                  <button
                    onClick={() => purge(k.id)}
                    className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() => revoke(k.id)}
                    className="rounded-md border px-3 py-1 text-xs"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
