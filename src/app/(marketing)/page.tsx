import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { ButtonLink } from "@/components/ui";
import { AnimatedDashboard } from "./AnimatedDashboard";

export default async function MarketingPage() {
  const { userId } = await auth();

  return (
    <main className="aurora-ambient flex min-h-dvh flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)] lg:h-dvh lg:overflow-hidden">
      {/* Top nav */}
      <header className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-3">
          <span className="bg-brand-gradient grid h-8 w-8 place-items-center rounded-[9px] font-bold text-[var(--text-inverse)] shadow-brand-glow">
            R
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Relist</span>
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] sm:inline">
            good times, better profit
          </span>
        </div>
        <div className="flex items-center gap-2">
          {userId ? (
            <>
              <ButtonLink href="/dashboard" size="sm">
                Open dashboard
              </ButtonLink>
              <UserButton />
            </>
          ) : (
            <div className="[&_button]:bg-brand-gradient [&_button]:text-[var(--text-inverse)] [&_button]:shadow-brand-glow [&_button]:inline-flex [&_button]:h-9 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[var(--radius-md)] [&_button]:px-4 [&_button]:text-[13px] [&_button]:font-semibold [&_button]:cursor-pointer [&_button:hover]:brightness-110">
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button>Sign in</button>
              </SignInButton>
            </div>
          )}
        </div>
      </header>

      {/* Hero — fills remaining viewport on desktop */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-6">
        <div className="max-w-xl">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-glass)] py-1 pl-1 pr-3 text-[11px] font-medium text-[var(--text-secondary)] backdrop-blur-sm">
            <span className="bg-brand-gradient rounded-full px-2 py-[2px] font-mono text-[10px] font-bold tracking-wide text-[var(--text-inverse)]">
              v2
            </span>
            Built for Vinted sellers · invite-only
          </div>

          {/* Headline */}
          <h1 className="font-display text-[clamp(3rem,7.5vw,5.5rem)] font-bold leading-[0.95] tracking-tight">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, var(--text-primary) 0%, #8c95a8 130%)",
              }}
            >
              Resale,
            </span>
            <br />
            <span className="text-brand-gradient italic">sorted.</span>
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--text-secondary)]">
            Track your inventory, prices, and profits across{" "}
            <span className="font-medium text-[var(--brand)]">Vinted</span> — without
            spreadsheet wrangling. Photos, margins, and what to ship today, in one
            quiet place.
          </p>

          {/* CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {userId ? (
              <div className="flex items-center gap-3">
                <ButtonLink href="/dashboard" size="md">
                  Open dashboard →
                </ButtonLink>
                <UserButton />
              </div>
            ) : (
              <div className="[&_button]:bg-brand-gradient [&_button]:text-[var(--text-inverse)] [&_button]:shadow-brand-glow [&_button]:inline-flex [&_button]:h-11 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[var(--radius-md)] [&_button]:px-6 [&_button]:text-sm [&_button]:font-semibold [&_button]:cursor-pointer [&_button:hover]:brightness-110">
                <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button>Sign in →</button>
                </SignInButton>
              </div>
            )}
            <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span
                aria-hidden
                className="relative inline-block h-1.5 w-1.5 rounded-full bg-[var(--money-positive)]"
                style={{ boxShadow: "0 0 0 3px rgba(52, 211, 153, 0.18)" }}
              />
              Access is invite-only · ask Calvin
            </p>
          </div>

          {/* Trust strip */}
          <dl className="mt-6 grid grid-cols-3 gap-6 border-t border-[var(--border-subtle)] pt-4">
            <TrustStat value="Vinted" label="Only platform" />
            <TrustStat value="£0" label="Vinted fees · ever" />
            <TrustStat value="Yours" label="Your data, your keys" />
          </dl>
        </div>

        {/* Animated dashboard preview, with teal ambient glow */}
        <div className="relative w-full max-w-full">
          <div
            aria-hidden
            className="absolute -inset-8 -z-10 rounded-[28px]"
            style={{
              background:
                "radial-gradient(ellipse, rgba(94,234,212,0.18), transparent 60%)",
              filter: "blur(20px)",
            }}
          />
          <AnimatedDashboard />
        </div>
      </section>

      {/* Features — compact strip above footer */}
      <section className="mx-auto w-full max-w-6xl shrink-0 border-t border-[var(--border-subtle)] px-6 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FeatureCard
            tone="brand"
            icon={<RectIcon />}
            title="Inventory at a glance"
            body="Photos, prices, status from sourced → sold. Searchable, sortable, with thumbnails on Vercel Blob."
          />
          <FeatureCard
            tone="emerald"
            icon={<TrendIcon />}
            title="Profit, not guesses"
            body="Sale price minus shipping and expenses. Vinted charges nothing, and we don't pretend otherwise."
          />
          <FeatureCard
            tone="violet"
            icon={<ClockIcon />}
            title="What to do today"
            body="Ship, refresh, reprice, photograph — your Plan tells you the next four moves before the kettle's boiled."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="shrink-0 border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 text-[11px] text-[var(--text-muted)]">
          <span>Relist · resale, sorted</span>
          <span className="font-mono">relist-saas.warmwetcircles.com</span>
        </div>
      </footer>
    </main>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[18px] font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
        {value}
      </dt>
      <dd className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </dd>
    </div>
  );
}

type FeatureTone = "brand" | "emerald" | "violet";
const FEATURE_TONE: Record<FeatureTone, string> = {
  brand: "bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]",
  emerald: "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-soft-fg)]",
  violet: "bg-[var(--accent-violet-soft)] text-[var(--accent-violet-soft-fg)]",
};

function FeatureCard({
  tone,
  icon,
  title,
  body,
}: {
  tone: FeatureTone;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="surface-glass flex items-start gap-3 rounded-[var(--radius-lg)] p-3.5">
      <span
        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${FEATURE_TONE[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mt-1 text-[11.5px] leading-snug text-[var(--text-secondary)]">
          {body}
        </p>
      </div>
    </article>
  );
}

/* ----- icons ----- */

function RectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 6.5h11M6 2.5v11" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 12l4-4 3 3 5-6M10 5h4v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 2.5v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
