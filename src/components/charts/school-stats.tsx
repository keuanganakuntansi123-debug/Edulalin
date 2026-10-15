"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function SchoolStats({
  data,
  bars,
  color,
}: {
  data: Record<string, string | number>[];
  bars: string[];
  color: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "rgba(29,78,216,0.06)" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          {bars.map((b) => (
            <Bar key={b} dataKey={b} fill={color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}