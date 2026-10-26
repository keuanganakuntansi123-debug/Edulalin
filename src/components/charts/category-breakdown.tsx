"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export type BreakdownItem = { name: string; value: number; color: string };

/**
 * Grafik donat untuk komposisi data (mis. Lulus vs Belum Lulus).
 * Data asli dari Neon DB.
 */
export function CategoryBreakdown({
  data,
  centerLabel,
  centerValue,
}: {
  data: BreakdownItem[];
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Label tengah */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
        <span className="text-2xl font-extrabold text-slate-900">
          {centerValue ?? total}
        </span>
        {centerLabel && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}
