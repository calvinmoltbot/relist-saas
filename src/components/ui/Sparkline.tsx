"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

type Props = {
  data: number[];
  tone?: "brand" | "emerald" | "amber" | "violet" | "rose" | "slate";
  height?: number;
};

const TONE: Record<NonNullable<Props["tone"]>, { stroke: string; fill: string }> = {
  brand: { stroke: "var(--brand)", fill: "var(--brand-soft)" },
  emerald: { stroke: "var(--accent-emerald)", fill: "var(--accent-emerald-soft)" },
  amber: { stroke: "var(--accent-amber)", fill: "var(--accent-amber-soft)" },
  violet: { stroke: "var(--accent-violet)", fill: "var(--accent-violet-soft)" },
  rose: { stroke: "var(--accent-rose)", fill: "var(--accent-rose-soft)" },
  slate: { stroke: "var(--accent-slate)", fill: "var(--accent-slate-soft)" },
};

export function Sparkline({ data, tone = "brand", height = 40 }: Props) {
  const series = data.map((v, i) => ({ i, v }));
  const colors = TONE[tone];
  const id = `spark-${tone}`;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colors.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={colors.stroke}
            strokeWidth={2}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
