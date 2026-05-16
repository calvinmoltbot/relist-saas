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
  const wrap =
    variant === "banner"
      ? "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--elev-1)] p-5"
      : "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--elev-1)] p-10 text-center";

  return (
    <section className={wrap}>
      <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
        {heading}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{body}</p>
      <div
        className={`mt-4 flex flex-wrap gap-2 text-sm ${
          variant === "panel" ? "justify-center" : ""
        }`}
      >
        <Link
          href="/inventory/new"
          className="bg-brand-gradient inline-flex items-center rounded-[var(--radius-md)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-inverse)] shadow-brand-glow hover:brightness-110"
        >
          Add your first item
        </Link>
        <Link
          href="/settings/api-keys"
          className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-glass)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Set up the extension
        </Link>
        {showSampleData && (
          <form action={loadSampleDataAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-glass)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Show me a tour with fake data
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
