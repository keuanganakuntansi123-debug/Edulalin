"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Newspaper, ArrowRight, CalendarDays, User } from "lucide-react";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORY_META } from "./news-constants";

type DisplayArticle = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  authorName: string | null;
  publishedAt: Date | null;
  image: string | null;
};

export function NewsCatalog({
  articles,
  initialQuery = "",
  initialCategory = "",
}: {
  articles: DisplayArticle[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      const matchCategory = !category || a.category === category;
      const matchQuery =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.authorName?.toLowerCase().includes(q) ?? false);
      return matchCategory && matchQuery;
    });
  }, [articles, query, category]);

  const featured = filtered[0] ?? null;
  const rest = filtered.slice(1);

  const formatDate = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d))
      : "";

  return (
    <div>
      {/* Pencarian */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul, kata kunci, atau penulis..."
          className="h-12 rounded-xl pl-10 text-base shadow-sm"
          aria-label="Cari artikel"
        />
      </div>

      {/* Filter kategori cepat */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
            !category
              ? "border-primary bg-primary text-white shadow-sm shadow-blue-600/25"
              : "border-border bg-white text-slate-600 hover:border-primary/50 hover:text-primary"
          )}
        >
          Semua
        </button>
        {Object.entries(NEWS_CATEGORY_META).map(([value, meta]) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
              category === value
                ? "border-primary bg-primary text-white shadow-sm shadow-blue-600/25"
                : "border-border bg-white text-slate-600 hover:border-primary/50 hover:text-primary"
            )}
          >
            {meta.emoji} {meta.label}
          </button>
        ))}
      </div>

      {/* Hasil */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Newspaper className="h-8 w-8" />
          </span>
          <p className="mt-4 text-lg font-bold text-slate-800">Belum ada artikel</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Tidak ada berita yang cocok dengan pencarian atau kategori ini. Artikel yang diterbitkan
            Admin akan langsung tampil di sini tanpa perlu memuat ulang halaman.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          {/* Artikel unggulan */}
          {featured && (
            <Link
              href={`/berita/${featured.slug}`}
              className="group relative mb-8 block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="grid md:grid-cols-2">
                <div className="relative h-56 overflow-hidden md:h-full">
                  {featured.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.image}
                      alt={featured.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-blue-100 to-sky-50 text-6xl">
                      <span aria-hidden="true">📰</span>
                    </div>
                  )}
                  <span className="absolute left-4 top-4">
                    <Badge className="bg-white/95 shadow-sm">⭐ Artikel Unggulan</Badge>
                  </span>
                </div>
                <div className="flex flex-col justify-center p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge className={NEWS_CATEGORY_META[featured.category]?.classes}>
                      {NEWS_CATEGORY_META[featured.category]?.emoji} {featured.category}
                    </Badge>
                    {featured.authorName && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" /> {featured.authorName}
                      </span>
                    )}
                    {formatDate(featured.publishedAt) && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CalendarDays className="h-3 w-3" /> {formatDate(featured.publishedAt)}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-primary md:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 leading-relaxed text-slate-600">{featured.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Baca Selengkapnya
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Grid kartu */}
          {rest.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {rest.map((a, i) => (
                <NewsCard key={a.id} article={a} date={formatDate(a.publishedAt)} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {filtered.length} artikel ditemukan
      </p>
    </div>
  );
}

function NewsCard({
  article,
  date,
  index,
}: {
  article: DisplayArticle;
  date: string;
  index: number;
}) {
  const meta = NEWS_CATEGORY_META[article.category] ?? NEWS_CATEGORY_META.SMA;
  const delay = Math.min(index % 3, 2) * 70;
  const style = { animationDelay: `${delay}ms` } as React.CSSProperties;

  return (
    <article
      style={style}
      className="group animate-rise flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl"
    >
      <Link href={`/berita/${article.slug}`} className="block" aria-label={article.title}>
        <div className="relative h-48 overflow-hidden">
          {article.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-50 text-5xl transition-transform duration-500 group-hover:scale-110">
              <span aria-hidden="true">📰</span>
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <span className="absolute left-3 top-3">
            <Badge className={cn("shadow-sm", meta.classes)}>
              {meta.emoji} {meta.label}
            </Badge>
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> {date}
            </span>
          )}
          {article.authorName && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {article.authorName}
            </span>
          )}
        </div>
        <Link href={`/berita/${article.slug}`} className="mt-2">
          <h3 className="font-bold leading-snug text-slate-900 transition-colors line-clamp-2 group-hover:text-primary">
            {article.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{article.summary}</p>
        <Link
          href={`/berita/${article.slug}`}
          className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary"
        >
          Baca Artikel
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}