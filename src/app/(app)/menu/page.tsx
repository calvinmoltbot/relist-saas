import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";

const SECTIONS: Array<{
  title: string;
  items: Array<{ href: string; label: string; description: string }>;
}> = [
  {
    title: "Analytics",
    items: [
      { href: "/bestsellers", label: "Bestsellers", description: "Which categories and brands sell fastest." },
      { href: "/health", label: "Health", description: "Inventory freshness, completeness, dead stock." },
      { href: "/market", label: "Market", description: "Competitor pricing data from your extension." },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/expenses", label: "Expenses", description: "Packaging, shipping supplies, fees." },
    ],
  },
  {
    title: "Coming soon",
    items: [
      { href: "/watch", label: "Watch", description: "Bookmark items you're considering." },
      { href: "/describe", label: "Describe", description: "AI-drafted listing copy (BYO key)." },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/api-keys", label: "API keys", description: "Tokens for the Chrome extension." },
      { href: "/settings/backup", label: "Backup & restore", description: "Download or restore your data." },
      { href: "/settings/targets", label: "Targets", description: "Tune thresholds for plan and health." },
    ],
  },
];

export default async function MenuPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="space-y-8">
      <PageHeader title="Menu" subtitle="Everything that doesn't live in the bottom tab bar." />
      {SECTIONS.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {s.title}
          </h2>
          <Card padded={false}>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {s.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--surface-muted)]"
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {it.label}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {it.description}
                      </div>
                    </div>
                    <span className="text-[var(--text-muted)]" aria-hidden>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
