"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function MultiSchoolSelect({
  schools,
  helper,
  defaultValue = [],
  filterLevel,
  filterLevels,
}: {
  schools: { id: string; name: string; educationLevel?: string }[];
  helper?: string;
  defaultValue?: string[];
  /** Jika diisi, hanya sekolah dengan jenjang ini yang tampil & dipilih. */
  filterLevel?: string;
  /** Alternatif: beberapa jenjang sekaligus (mis. SIM → SMA+SMK). */
  filterLevels?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");

  const activeLevels = useMemo(() => {
    if (filterLevels && filterLevels.length > 0) return filterLevels;
    if (filterLevel) return [filterLevel];
    return null;
  }, [filterLevel, filterLevels]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const visible = schools.filter((s) => {
    const levelOk = !activeLevels || (s.educationLevel != null && activeLevels.includes(s.educationLevel));
    const qOk = !query || s.name.toLowerCase().includes(query.toLowerCase());
    return levelOk && qOk;
  });
  // Hanya sekolah yang cocok dengan filter yang dianggap terpilih
  // (yang tidak cocok tidak dirender -> tidak ikut ter-submit).
  const validSelected = activeLevels
    ? selected.filter((id) => schools.some((s) => s.id === id && s.educationLevel != null && activeLevels.includes(s.educationLevel)))
    : selected;
  const selectedSchools = schools.filter((s) => validSelected.includes(s.id));
  const filteredTitle = activeLevels
    ? `Sekolah Tujuan (jenjang ${activeLevels.join(" + ")})`
    : "Sekolah Tujuan";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium">{filteredTitle}</label>
        <span className="text-xs text-muted-foreground">{validSelected.length} dipilih</span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari sekolah..."
          className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {visible.length === 0 && (
          <p className="px-2 py-2 text-sm text-muted-foreground">
            {schools.length === 0
              ? "Belum ada sekolah terdaftar. Sekolah tercatat otomatis saat murid mendaftar."
              : "Sekolah tidak ditemukan."}
          </p>
        )}
        {visible.map((s) => {
          const on = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                on ? "bg-primary/10 font-medium text-primary" : "hover:bg-slate-50"
              )}
            >
              <span className="line-clamp-1">{s.name}</span>
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  on ? "border-primary bg-primary text-white" : "border-slate-300"
                )}
              >
                {on && "✓"}
              </span>
            </button>
          );
        })}
      </div>
      {selectedSchools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSchools.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                {s.name}
                <span aria-hidden>×</span>
              </button>
            ))}
        </div>
      )}
      {selectedSchools.map((s) => (
        <input key={s.id} type="hidden" name="schoolIds" value={s.id} />
      ))}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}