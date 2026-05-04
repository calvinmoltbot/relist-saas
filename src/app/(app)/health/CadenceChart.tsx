"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Week = {
  weekStart: string;
  count: number;
  current: boolean;
};

type Props = {
  weeks: Week[];
  target: number;
};

function shortLabel(week: Week): string {
  if (week.current) return "This week";
  return new Date(week.weekStart).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function CadenceChart({ weeks, target }: Props) {
  const data = weeks.map((w) => ({
    label: shortLabel(w),
    count: w.count,
    current: w.current,
  }));
  const maxCount = Math.max(target, ...weeks.map((w) => w.count), 1);
  const yMax = Math.ceil(maxCount * 1.15);

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--border-subtle)" }}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, yMax]}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-muted)" }}
            contentStyle={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-card)",
              fontSize: 12,
              boxShadow: "var(--elev-2)",
            }}
            labelStyle={{ color: "var(--text-secondary)" }}
            formatter={(value) => [`${value} listed`, ""]}
          />
          <ReferenceLine
            y={target}
            stroke="var(--accent-amber)"
            strokeDasharray="4 4"
            label={{
              value: `Target ${target}`,
              position: "insideTopRight",
              fill: "var(--accent-amber-soft-fg)",
              fontSize: 10,
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.current ? "var(--brand)" : "var(--accent-slate-soft)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
