"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type TrendPoint = { label: string; score: number };

/**
 * Grafik tren nilai kuis (data asli dari Neon DB).
 * Menampilkan perkembangan nilai dari waktu ke waktu.
 */
export function ScoreTrend({
  data,
  color = "#1d4ed8",
  valueName = "Nilai",
}: {
  data: TrendPoint[];
  color?: string;
  valueName?: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
            formatter={(value) => [`${value ?? 0}/100`, valueName]}
          />
          <Line
            type="monotone"
            dataKey="score"
            name={valueName}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
