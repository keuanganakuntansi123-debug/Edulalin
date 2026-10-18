"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/form";
import { LEVEL_LABEL, DISPLAY_CATEGORIES, categoryOf } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ModuleCarousel } from "./module-carousel";

type DisplayModule = {
  id: string;
  title: string;
  description: string;
  educationLevel: string;
  classLevel: string | null;
  moduleType: string;
  displayThumbnail: string | null;
  contentFile: { originalName: string; mimeType: string } | null;
  durationMin: number | null;
};

export function ModuleCatalog({
  modules,
  initialQuery = "",
  initialCategory = "",
}: {
  modules: DisplayModule[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter((m) => {
      const matchCategory = !category || categoryOf(m.educationLevel) === category;
      const matchQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        LEVEL_LABEL[m.educationLevel as keyof typeof LEVEL_LABEL]?.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [modules, query, category]);

  return (
    <div className="mt-10">
      {/* Pencarian */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul modul..."
          className="pl-9"
          aria-label="Cari modul"
        />
      </div>

      {/* Filter kategori */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            !category
              ? "border-primary bg-primary text-white"
              : "border-border bg-white hover:border-primary/50"
          )}
        >
          Semua
        </button>
        {DISPLAY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              category === c
                ? "border-primary bg-primary text-white"
                : "border-border bg-white hover:border-primary/50"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Daftar (carousel horizontal) */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-white p-10 text-center">
          <p className="text-lg font-semibold">Materi belum tersedia</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada modul yang sesuai dengan pencarian atau kategori ini. Silakan cek kembali
            nanti — modul yang diterbitkan Admin akan otomatis tampil di sini.
          </p>
        </div>
      ) : (
        <div className="mt-10">
          <ModuleCarousel
            modules={filtered.map((m) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              educationLevel: m.educationLevel,
              moduleType: m.moduleType,
              displayThumbnail: m.displayThumbnail,
            }))}
          />
        </div>
      )}
    </div>
  );
}
