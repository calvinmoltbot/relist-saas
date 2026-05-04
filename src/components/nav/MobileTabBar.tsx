"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/plan", label: "Plan", icon: PlanIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "/profit", label: "Profit", icon: ProfitIcon },
  { href: "/menu", label: "More", icon: MoreIcon },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface-card)]/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/menu"
            ? false
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-1 px-1 pb-2 pt-2 text-[11px] font-medium ${
                  isActive
                    ? "text-[var(--brand)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon active={isActive} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden />
    </nav>
  );
}

type IconProps = { active?: boolean };
const stroke = (active?: boolean) =>
  active ? "var(--brand)" : "currentColor";

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 8.5L10 3l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1V8.5Z" stroke={stroke(active)} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function PlanIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4" width="14" height="13" rx="2" stroke={stroke(active)} strokeWidth="1.5" />
      <path d="M3 8h14M7 3v3M13 3v3M6 12h4M6 15h6" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function InventoryIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1" stroke={stroke(active)} strokeWidth="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1" stroke={stroke(active)} strokeWidth="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1" stroke={stroke(active)} strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1" stroke={stroke(active)} strokeWidth="1.5" />
    </svg>
  );
}
function ProfitIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 16l5-5 3 3 6-7" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7h4v4" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MoreIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="5" cy="10" r="1.5" fill={stroke(active)} />
      <circle cx="10" cy="10" r="1.5" fill={stroke(active)} />
      <circle cx="15" cy="10" r="1.5" fill={stroke(active)} />
    </svg>
  );
}
