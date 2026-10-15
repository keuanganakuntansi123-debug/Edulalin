"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function MultiSchoolSelect({
  schools,
  helper,
  defaultValue = [],
}: {
  schools: { id: string; name: string }[];
  helper?: string;
  defaultValue?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const visible = schools.filter(
    (s) => !query || s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium">Sekolah Tujuan</label>
        <span className="text-xs text-muted-foreground">{selected.length} dipilih</span>
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
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {schools
            .filter((s) => selected.includes(s.id))
            .map((s) => (
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
      {selected.length > 0 &&
        schools
          .filter((s) => selected.includes(s.id))
          .map((s) => (
            <input key={s.id} type="hidden" name="schoolIds" value={s.id} />
          ))}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}