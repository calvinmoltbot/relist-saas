import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] border border-transparent",
  secondary:
    "bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--surface-muted)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] border border-transparent hover:bg-[var(--surface-muted)]",
  destructive:
    "bg-[var(--accent-rose)] text-white hover:opacity-90 border border-transparent",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-[var(--radius-md)]",
  md: "h-10 px-4 text-sm rounded-[var(--radius-md)]",
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  external = false,
}: ButtonLinkProps) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
