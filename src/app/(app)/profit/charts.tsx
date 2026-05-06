"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfitSeriesPoint } from "@/lib/analytics/profit-series";

const gbp = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export function RevenueVsCostsChart({ data }: { data: ProfitSeriesPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
        No data in this period.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="profit-rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profit-cost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-rose)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--accent-rose)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profit-net" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-emerald)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent-emerald)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `£${v}`}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelFormatter={(label) => fmtDate(label as string)}
            formatter={(value, name) => [gbp(Number(value)), name as string]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#profit-rev)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="cost"
            name="Cost"
            stroke="var(--accent-rose)"
            strokeWidth={2}
            fill="url(#profit-cost)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="netProfit"
            name="Net profit"
            stroke="var(--accent-emerald)"
            strokeWidth={2}
            fill="url(#profit-net)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

