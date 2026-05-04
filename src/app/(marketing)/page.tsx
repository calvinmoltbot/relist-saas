import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { ButtonLink } from "@/components/ui";
import { AnimatedDashboard } from "./AnimatedDashboard";

export default async function MarketingPage() {
  const { userId } = await auth();

  return (
    <main className="min-h-dvh bg-[var(--surface-canvas)]">
      {/* Top brand row */}
      <header className="mx-auto flex max-w-6xl items-start justify-between px-6 pt-8">
        <span className="font-display text-2xl tracking-tight text-[var(--text-primary)]">
          Relist
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] sm:inline">
          Good times, better profit
        </span>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-12 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16">
        <div className="max-w-xl">
          <h1 className="font-display text-[clamp(4rem,11vw,8rem)] font-medium leading-[0.92] tracking-tight text-[var(--text-primary)]">
            Relist
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--text-secondary)]">
            Track your resale inventory, prices, and profits across{" "}
            <span className="text-[var(--brand)]">Vinted</span> and beyond.
          </p>

          <div className="mt-10">
            {userId ? (
              <div className="flex items-center gap-3">
                <ButtonLink href="/dashboard" size="md">
                  Open dashboard
                </ButtonLink>
                <UserButton />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="[&_button]:inline-flex [&_button]:h-10 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[var(--radius-md)] [&_button]:bg-[var(--brand)] [&_button]:px-5 [&_button]:text-sm [&_button]:font-medium [&_button]:text-white [&_button]:transition-colors [&_button:hover]:bg-[var(--brand-hover)] [&_button]:cursor-pointer">
                  <SignInButton mode="modal">
                    <button>Sign in</button>
                  </SignInButton>
                </div>
                <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <span
                    aria-hidden
                    className="inline-block h-1 w-1 rounded-full bg-[var(--text-muted)]"
                  />
                  Access is invite-only. Ask Calvin for an invite link.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Animated dashboard preview */}
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[28px] bg-[var(--surface-muted)]/60 blur-2xl" />
          <AnimatedDashboard />
        </div>
      </section>

      {/* Feature section */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-10 border-t border-[var(--border-subtle)] pt-12 md:grid-cols-[auto_1fr] md:gap-16">
          <div className="max-w-sm">
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-inset)] text-[var(--text-muted)]"
            >
              {/* tag icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
                <circle cx="7" cy="7" r="1.4" />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-3xl tracking-tight text-[var(--text-primary)]">
              Everything in one place
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              From thrift finds to sold items, keep every detail organised and
              know exactly what you&apos;re making.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FeatureCard
              swatch="emerald"
              title="Inventory at a glance"
              body="Photos, prices, and status from sourced through sold — searchable and sortable."
            />
            <FeatureCard
              swatch="rose"
              title="Profit, not guesses"
              body="Sale price minus shipping and expenses. Vinted charges sellers nothing, and we don't pretend otherwise."
            />
            <FeatureCard
              swatch="brand"
              title="Trends you can read"
              body="Sparklines and deltas show what's working week over week, without spreadsheet wrangling."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-[var(--text-muted)]">
          <span>Relist · resale, sorted.</span>
          <Link href="/sign-in" className="hover:text-[var(--text-primary)]">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  swatch,
  title,
  body,
}: {
  swatch: "emerald" | "rose" | "brand";
  title: string;
  body: string;
}) {
  const swatchBg: Record<typeof swatch, string> = {
    emerald:
      "bg-gradient-to-br from-[var(--accent-emerald-soft)] to-[var(--surface-muted)]",
    rose: "bg-gradient-to-br from-[var(--accent-rose-soft)] to-[var(--surface-muted)]",
    brand:
      "bg-gradient-to-br from-[var(--brand-soft)] to-[var(--surface-muted)]",
  };

  return (
    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--elev-1)]">
      <div className={`aspect-[4/3] w-full ${swatchBg[swatch]}`} aria-hidden />
      <div className="p-4">
        <h3 className="font-display text-lg tracking-tight text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {body}
        </p>
      </div>
    </article>
  );
}
