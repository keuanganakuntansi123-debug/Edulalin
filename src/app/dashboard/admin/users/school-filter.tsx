"use client";

import { useRouter } from "next/navigation";

export function SchoolFilter({
  schools,
  school,
  q,
}: {
  schools: { id: string; name: string }[];
  school?: string;
  q?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={school ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (e.target.value) params.set("school", e.target.value);
        if (q) params.set("q", q);
        router.push(`/dashboard/admin/users?${params.toString()}`);
      }}
      className="h-10 rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
    >
      <option value="">Semua sekolah</option>
      {schools.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}