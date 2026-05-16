import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
};

export function Card({ children, className = "", padded = true }: Props) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--elev-1)] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
