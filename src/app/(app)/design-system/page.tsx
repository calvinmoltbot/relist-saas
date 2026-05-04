import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  PageHeader,
  Sparkline,
  StatusPill,
  Tile,
} from "@/components/ui";

const SPARK = [4, 6, 5, 8, 7, 10, 9, 12, 14, 13, 16, 18];

export default async function DesignSystemPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="space-y-10">
      <PageHeader
        title="Design system"
        subtitle="Tokens and primitives shared across every page. Tweak values in src/app/globals.css."
        actions={
          <>
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              Back to app
            </ButtonLink>
            <Button size="sm">Primary action</Button>
          </>
        }
      />

      {/* ----- Surfaces ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Surfaces</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { name: "canvas", v: "var(--surface-canvas)" },
            { name: "card", v: "var(--surface-card)" },
            { name: "muted", v: "var(--surface-muted)" },
            { name: "inset", v: "var(--surface-inset)" },
          ].map((s) => (
            <div key={s.name} className="rounded-[var(--radius-md)] border border-[var(--border-default)]">
              <div className="h-16 rounded-t-[var(--radius-md)]" style={{ background: s.v }} />
              <div className="p-2 text-xs">
                <div className="font-medium">surface-{s.name}</div>
                <div className="text-[var(--text-muted)]">{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----- Accents ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Accents</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {[
            { name: "brand", solid: "var(--brand)", soft: "var(--brand-soft)", fg: "var(--brand-soft-fg)" },
            { name: "amber", solid: "var(--accent-amber)", soft: "var(--accent-amber-soft)", fg: "var(--accent-amber-soft-fg)" },
            { name: "violet", solid: "var(--accent-violet)", soft: "var(--accent-violet-soft)", fg: "var(--accent-violet-soft-fg)" },
            { name: "rose", solid: "var(--accent-rose)", soft: "var(--accent-rose-soft)", fg: "var(--accent-rose-soft-fg)" },
            { name: "emerald", solid: "var(--accent-emerald)", soft: "var(--accent-emerald-soft)", fg: "var(--accent-emerald-soft-fg)" },
            { name: "blue", solid: "var(--accent-blue)", soft: "var(--accent-blue-soft)", fg: "var(--accent-blue-soft-fg)" },
            { name: "slate", solid: "var(--accent-slate)", soft: "var(--accent-slate-soft)", fg: "var(--accent-slate-soft-fg)" },
          ].map((a) => (
            <div key={a.name} className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
              <div className="h-10" style={{ background: a.solid }} />
              <div className="p-2 text-xs" style={{ background: a.soft, color: a.fg }}>
                <div className="font-medium">{a.name}</div>
                <div className="opacity-80">soft + soft-fg</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----- Typography ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Typography</h2>
        <Card>
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase text-[var(--text-muted)]">Display — Fraunces</div>
              <div className="font-display text-4xl font-semibold">£2,842.35 net profit this month</div>
            </div>
            <div>
              <div className="text-xs uppercase text-[var(--text-muted)]">Body — Inter</div>
              <p className="text-sm text-[var(--text-secondary)]">
                Track your resale inventory, prices, and profits across Vinted and beyond.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ----- Status pills ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Status pills</h2>
        <Card>
          <div className="flex flex-wrap gap-3">
            <StatusPill status="sourced" />
            <StatusPill status="listed" />
            <StatusPill status="sold" />
            <StatusPill status="shipped" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <StatusPill status="sourced" size="md" />
            <StatusPill status="listed" size="md" />
            <StatusPill status="sold" size="md" />
            <StatusPill status="shipped" size="md" />
          </div>
        </Card>
      </section>

      {/* ----- Buttons ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Buttons</h2>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" variant="primary">Primary sm</Button>
            <Button size="sm" variant="secondary">Secondary sm</Button>
            <Button size="sm" variant="ghost">Ghost sm</Button>
            <Button size="sm" variant="destructive">Destructive sm</Button>
          </div>
        </Card>
      </section>

      {/* ----- Tiles ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Metric tiles</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Revenue this month"
            value="£1,246.78"
            sub="83 sold"
            tone="brand"
            icon={<span className="text-sm">£</span>}
            delta="+12.4%"
            deltaDirection="up"
            spark={SPARK}
          />
          <Tile
            label="Net profit this month"
            value="£1,128.74"
            sub="38.7% avg margin"
            tone="emerald"
            icon={<span className="text-sm">↗</span>}
            delta="+8.2%"
            deltaDirection="up"
            spark={[3, 5, 4, 7, 6, 9, 8, 11, 10, 12, 14, 16]}
          />
          <Tile
            label="Stock value (listed)"
            value="£3,416.20"
            sub="162 listed"
            tone="amber"
            icon={<span className="text-sm">▤</span>}
            delta="−2.1%"
            deltaDirection="down"
            spark={[8, 9, 7, 6, 8, 7, 6, 5, 6, 5, 4, 5]}
          />
          <Tile
            label="Items sourced"
            value="76"
            sub="ready to list"
            tone="violet"
            icon={<span className="text-sm">+</span>}
          />
        </div>
      </section>

      {/* ----- Sparklines ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Sparklines</h2>
        <Card>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {(["brand", "emerald", "amber", "violet", "rose", "slate"] as const).map((t) => (
              <div key={t}>
                <div className="text-xs text-[var(--text-muted)]">tone={t}</div>
                <Sparkline data={SPARK} tone={t} height={48} />
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ----- Cards ----- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Cards</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Plain card" description="Wraps any block of grouped content." />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Default padding is comfortable for short content. Pass <code>padded={"{false}"}</code> for tables.
            </p>
          </Card>
          <Card>
            <CardHeader
              title="With action"
              description="Header optionally takes a right-side actions slot."
              action={<Button size="sm" variant="secondary">View all</Button>}
            />
          </Card>
        </div>
      </section>
    </div>
  );
}
