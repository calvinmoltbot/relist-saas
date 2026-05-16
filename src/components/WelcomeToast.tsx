"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * One-shot welcome toast shown the first time a signed-in user lands on the
 * dashboard. Dismissal is persisted per-user in localStorage so it never
 * re-shows. Does not auto-dismiss — non-technical users need time to read it.
 */
export function WelcomeToast() {
  const { isLoaded, user } = useUser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (typeof window === "undefined") return;
    const key = `relist:welcome-toast-dismissed:${user.id}`;
    if (window.localStorage.getItem(key) === "1") return;
    setVisible(true);
  }, [isLoaded, user]);

  if (!isLoaded || !user || !visible) return null;

  const firstName = user.firstName?.trim() || "there";

  const dismiss = () => {
    try {
      window.localStorage.setItem(
        `relist:welcome-toast-dismissed:${user.id}`,
        "1",
      );
    } catch {
      // ignore (private mode, quota, etc.)
    }
    setVisible(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6"
    >
      <div className="pointer-events-auto relative flex max-w-md items-start gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-3 shadow-[var(--elev-2)] backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 100% 80% at 0% 0%, rgba(94, 234, 212, 0.12), transparent 60%)",
          }}
        />
        <div className="relative flex-1">
          <p className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
            Welcome, {firstName}.
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Add your first item to get started.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss welcome message"
          className="relative -mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
