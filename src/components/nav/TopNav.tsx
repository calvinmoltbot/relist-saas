import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { MoreMenu } from "./MoreMenu";
import { NavLink } from "./NavLink";

const PRIMARY = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Plan" },
  { href: "/inventory", label: "Inventory" },
  { href: "/profit", label: "Profit" },
  { href: "/bestsellers", label: "Bestsellers" },
  { href: "/health", label: "Health" },
  { href: "/market", label: "Market" },
];

const MORE = [
  { href: "/expenses", label: "Expenses" },
  { href: "/watch", label: "Watch" },
  { href: "/describe", label: "Describe" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]"
        >
          Relist
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {PRIMARY.map((l) => (
            <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
          ))}
          <MoreMenu items={MORE} />
          <NavLink href="/settings/api-keys" matchPrefix="/settings">Settings</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
        </div>
      </div>
    </header>
  );
}
