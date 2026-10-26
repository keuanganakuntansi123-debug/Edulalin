"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export type BarPoint = { label: string; value: number; color?: string };

/**
 * Grafik batang horizontal (mis. progress per modul).
 * Data asli dari Neon DB. `suffix` untuk satuan (mis. "%").
 */
export function ProgressBars({
  data,
  suffix = "%",
  max = 100,
  color = "#0ea5e9",
  valueName = "Progress",
}: {
  data: BarPoint[];
  suffix?: string;
  max?: number;
  color?: string;
  valueName?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  const height = Math.max(240, data.length * 40);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" domain={[0, max]} allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "rgba(14,165,233,0.06)" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
            formatter={(value) => [`${value ?? 0}${suffix}`, valueName]}
          />
          <Bar dataKey="value" name={valueName} radius={[0, 6, 6, 0]} barSize={16}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
