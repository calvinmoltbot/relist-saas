import Link from "next/link";
import { loadSampleDataAction } from "@/app/(app)/dashboard/sample-data-actions";

type Variant = "banner" | "panel";

export function FirstRunNudge({
  variant = "banner",
  heading = "Welcome to Relist",
  body = "You don't have any items yet. Add one manually, set up the Chrome extension to send listings straight from Vinted, or load sample data to see how every page looks first.",
  showSampleData = true,
}: {
  variant?: Variant;
  heading?: string;
  body?: string;
  showSampleData?: boolean;
}) {
  const isPanel = variant === "panel";

  return (
    <section
      className={
        isPanel
          ? "relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-8 py-12 text-center shadow-[var(--elev-1)] md:px-12 md:py-16"
          : "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--elev-1)]"
      }
    >
      {isPanel && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(94, 234, 212, 0.10), transparent 60%)",
          }}
        />
      )}
      <div className="relative">
        <p
          className={
            isPanel
              ? "font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl"
              : "font-display text-lg font-semibold text-[var(--text-primary)]"
          }
        >
          {heading}
        </p>
        <p
          className={
            isPanel
              ? "mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--text-secondary)]"
              : "mt-1 text-[14px] text-[var(--text-secondary)]"
          }
        >
          {body}
        </p>
        <div
          className={`mt-5 flex flex-wrap gap-2 text-sm ${
            isPanel ? "justify-center" : ""
          }`}
        >
          <Link
            href="/inventory/new"
            className="bg-brand-gradient inline-flex items-center rounded-[var(--radius-md)] px-4 py-2 text-[13px] font-semibold text-[var(--text-inverse)] shadow-brand-glow hover:brightness-110"
          >
            Add your first item
          </Link>
          <Link
            href="/settings/api-keys"
            className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-glass)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Set up the extension
          </Link>
          {showSampleData && (
            <form action={loadSampleDataAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-glass)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Show me a tour with fake data
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
