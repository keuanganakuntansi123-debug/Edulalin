"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FileText, Video, Link2, File } from "lucide-react";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LEVEL_LABEL, DISPLAY_CATEGORIES, categoryOf } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

const TYPE_ICON: Record<string, typeof FileText> = {
  PDF: FileText,
  VIDEO: Video,
  LINK: Link2,
  DOCUMENT: File,
};

const TYPE_LABEL: Record<string, string> = {
  PDF: "PDF",
  VIDEO: "Video",
  LINK: "Link",
  DOCUMENT: "Dokumen",
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
        (categoryOf(m.educationLevel) === "SMA" && m.educationLevel === "SIM" && "smk".includes(q) ? true : false) ||
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
            {c === "SMA" ? "SMA/SMK" : c}
          </button>
        ))}
      </div>

      {/* Daftar */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-white p-10 text-center">
          <p className="text-lg font-semibold">Modul tidak ditemukan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tidak ada modul yang cocok dengan pencarian atau kategori ini.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const Icon = TYPE_ICON[m.moduleType] ?? FileText;
            return (
              <article
                key={m.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-sky-100">
                  {m.displayThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.displayThumbnail}
                      alt={m.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-7 w-7" />
                    </span>
                  )}
                  <Badge className="absolute left-3 top-3 bg-white/90 text-primary shadow-sm">
                    {m.educationLevel === "SIM" ? "SMA/SMK" : LEVEL_LABEL[m.educationLevel as keyof typeof LEVEL_LABEL]}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-bold leading-snug">{m.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{TYPE_LABEL[m.moduleType] ?? m.moduleType}</Badge>
                    {m.classLevel && <Badge variant="secondary">Kelas {m.classLevel}</Badge>}
                    {m.durationMin != null && <Badge variant="outline">{m.durationMin} mnt</Badge>}
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
                    <Link href={`/modul/${m.id}`} className="flex-1">
                      <Button size="sm" className="w-full">Lihat Modul</Button>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
