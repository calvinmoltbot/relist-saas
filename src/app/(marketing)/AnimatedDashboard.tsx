"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui";

/* ----- helpers ---------------------------------------------------- */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Count up from 0 to `target` over `durationMs` with ease-out. */
function useCountUp(target: number, durationMs: number, start: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const startTs = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTs;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);

  return value;
}

/* ----- mini sparkline (inline SVG, animatable stroke) ------------- */

type Tone = "brand" | "emerald" | "rose" | "violet";

const TONE_STROKE: Record<Tone, string> = {
  brand: "var(--brand)",
  emerald: "var(--accent-emerald)",
  rose: "var(--accent-rose)",
  violet: "var(--accent-violet)",
};

const TONE_FILL_STOP: Record<Tone, string> = {
  brand: "var(--brand)",
  emerald: "var(--accent-emerald)",
  rose: "var(--accent-rose)",
  violet: "var(--accent-violet)",
};

function MiniSparkline({
  data,
  tone = "brand",
  width = 220,
  height = 44,
  draw,
}: {
  data: number[];
  tone?: Tone;
  width?: number;
  height?: number;
  /** when true, stroke draws in via dash animation */
  draw: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const padY = 4;
  const usableH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = padY + (1 - (v - min) / range) * usableH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;

  const id = `lp-grad-${tone}`;
  const stroke = TONE_STROKE[tone];
  const fillStop = TONE_FILL_STOP[tone];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillStop} stopOpacity={0.3} />
          <stop offset="100%" stopColor={fillStop} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#${id})`}
        style={{
          opacity: draw ? 1 : 0,
          transition: "opacity 600ms ease-out 600ms",
        }}
      />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lp-spark-line"
        style={{ ["--draw" as string]: draw ? "1" : "0" } as React.CSSProperties}
      />
    </svg>
  );
}

/* ----- preview tile (custom — doesn't depend on Recharts) --------- */

function PreviewTile({
  label,
  value,
  sub,
  tone,
  delta,
  deltaDirection,
  spark,
  start,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
  delta: string;
  deltaDirection: "up" | "down" | "flat";
  spark: number[];
  start: boolean;
}) {
  const deltaColor =
    deltaDirection === "up"
      ? "text-[var(--money-positive)]"
      : deltaDirection === "down"
        ? "text-[var(--money-negative)]"
        : "text-[var(--text-muted)]";

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 shadow-[var(--elev-1)]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </div>
        <span className={`text-[10px] font-medium ${deltaColor}`}>{delta}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{sub}</div>}
      <div className="mt-2">
        <MiniSparkline data={spark} tone={tone} draw={start} height={36} />
      </div>
    </div>
  );
}

/* ----- main component --------------------------------------------- */

const SPARK_PROFIT = [12, 18, 14, 22, 28, 25, 34, 31, 42, 48, 45, 58];
const SPARK_LISTED = [40, 42, 41, 44, 46, 48, 47, 50, 52, 54, 53, 56];
const SPARK_SELL = [38, 42, 45, 41, 48, 52, 50, 55, 58, 60, 62, 64];

export function AnimatedDashboard() {
  const [start, setStart] = useState(false);
  const [pillSold, setPillSold] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    if (r) {
      setStart(true);
      setPillSold(true);
      return;
    }
    // Kick off animations next frame so the SVG dashoffset starts at full length.
    const raf = requestAnimationFrame(() => setStart(true));
    const flip = window.setTimeout(() => setPillSold(true), 2500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(flip);
    };
  }, []);

  const profitTarget = 1246.78;
  const listedTarget = 28;
  const sellTarget = 64;

  const profit = useCountUp(profitTarget, 1200, start);
  const listed = useCountUp(listedTarget, 1200, start);
  const sell = useCountUp(sellTarget, 1200, start);

  const profitStr = `£${(reduced ? profitTarget : profit).toFixed(2)}`;
  const listedStr = `${Math.round(reduced ? listedTarget : listed)}`;
  const sellStr = `${(reduced ? sellTarget : sell).toFixed(0)}%`;

  return (
    <div
      className="lp-device relative w-full"
      role="img"
      aria-label="Animated preview of the Relist dashboard"
    >
      {/* Device chrome */}
      <div className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--elev-3)] overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]/70" />
          <span className="ml-3 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            relist · overview
          </span>
        </div>

        {/* Body */}
        <div className="bg-[var(--surface-canvas)] p-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-display text-[var(--text-primary)]">
                Dashboard
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                November 2026
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                This month
              </span>
            </div>
          </div>

          {/* Tile grid */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <PreviewTile
              label="Total profit"
              value={profitStr}
              sub="Net of shipping & expenses"
              tone="emerald"
              delta="+12.4%"
              deltaDirection="up"
              spark={SPARK_PROFIT}
              start={start}
            />
            <PreviewTile
              label="Items listed"
              value={listedStr}
              sub="Active across Vinted"
              tone="brand"
              delta="+3"
              deltaDirection="up"
              spark={SPARK_LISTED}
              start={start}
            />
            <PreviewTile
              label="Sell-through"
              value={sellStr}
              sub="Last 30 days"
              tone="violet"
              delta="+5.1%"
              deltaDirection="up"
              spark={SPARK_SELL}
              start={start}
            />
          </div>

          {/* Recent activity row with the flipping pill */}
          <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Recent activity
            </div>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-[var(--radius-sm)] bg-[var(--surface-inset)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      Wool cardigan, beige
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      £24.00 · listed 2h ago
                    </div>
                  </div>
                </div>
                <div className="lp-pill-flip relative">
                  <span
                    className="lp-pill-listed"
                    style={{ opacity: pillSold ? 0 : 1 }}
                  >
                    <StatusPill status="listed" />
                  </span>
                  <span
                    className="lp-pill-sold"
                    style={{ opacity: pillSold ? 1 : 0 }}
                  >
                    <StatusPill status="sold" />
                  </span>
                </div>
              </li>
              <li className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-[var(--radius-sm)] bg-[var(--surface-inset)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      Linen shirt, white
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      £16.50 · listed 6h ago
                    </div>
                  </div>
                </div>
                <StatusPill status="listed" />
              </li>
              <li className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-[var(--radius-sm)] bg-[var(--surface-inset)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      Vintage denim jacket
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      £38.00 · sold yesterday
                    </div>
                  </div>
                </div>
                <StatusPill status="sold" />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .lp-spark-line {
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          transition: stroke-dashoffset 1500ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-device .lp-spark-line[style*="--draw: 1"] {
          stroke-dashoffset: 0;
        }
        .lp-pill-flip {
          display: inline-grid;
        }
        .lp-pill-flip > .lp-pill-listed,
        .lp-pill-flip > .lp-pill-sold {
          grid-area: 1 / 1;
          transition: opacity 250ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-spark-line {
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
            transition: none !important;
          }
          .lp-pill-flip > .lp-pill-listed,
          .lp-pill-flip > .lp-pill-sold {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
