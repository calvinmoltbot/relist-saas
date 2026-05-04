"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  children: React.ReactNode;
  /** If set, treat the link as active when the pathname starts with this prefix. */
  matchPrefix?: string;
};

export function NavLink({ href, children, matchPrefix }: Props) {
  const pathname = usePathname();
  const isActive = matchPrefix
    ? pathname.startsWith(matchPrefix)
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </Link>
  );
}
