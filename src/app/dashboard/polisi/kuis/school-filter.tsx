"use client";

import { useRouter } from "next/navigation";

export function SchoolFilter({
  schools,
  current,
}: {
  schools: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="school-filter" className="text-sm font-medium text-muted-foreground">
        Sekolah:
      </label>
      <select
        id="school-filter"
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v === "all" ? "/dashboard/polisi/kuis" : `/dashboard/polisi/kuis?schoolId=${v}`);
        }}
        className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
      >
        <option value="all">Semua Sekolah</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
