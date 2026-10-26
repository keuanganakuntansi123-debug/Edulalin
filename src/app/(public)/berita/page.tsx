import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/public/page-hero";
import { fileUrl } from "@/lib/storage";
import { NewsCatalog } from "./news-catalog";
import { NEWS_CATEGORIES, NEWS_CATEGORY_VALUES } from "./news-constants";
import { CategoryImage } from "./category-image";

export const metadata: Metadata = {
  title: "Berita & Edukasi | EDULALIN | Edukasi Lalu Lintas",
  description:
    "Baca berita dan artikel edukasi lalu lintas untuk SD, SMP, SMA, SMK, dan SIM. Materi keselamatan berkendara yang dikelola Admin dan dapat diakses publik tanpa login.",
};
export const instant = false;

export default async function BeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string }>;
}) {
  const { q, kategori } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const activeCategory = NEWS_CATEGORY_VALUES.includes(kategori as (typeof NEWS_CATEGORY_VALUES)[number])
    ? (kategori as string)
    : "";

  const articles = await prisma.article.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { imageFile: { select: { storedName: true } } },
  });

  const displayArticles = articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    content: a.content,
    category: a.category,
    authorName: a.authorName,
    publishedAt: a.publishedAt,
    image:
      a.imageEmbedded ??
      (a.imageFile ? fileUrl(a.imageFile.storedName) : a.imageUrl) ??
      null,
  }));

  const counts = NEWS_CATEGORIES.map((c) => ({
    ...c,
    count: articles.filter((a) => a.category === c.value).length,
  }));

  return (
    <div className="overflow-x-hidden">
      <PageHero
        badge="Berita & Edukasi"
        badgeEmoji="📰"
        title="Belajar Keselamatan Lalu Lintas dari Berita Terkini"
        description="Ragam artikel dan edukasi tertib berlalu lintas untuk SD, SMP, SMA, SMK, dan SIM. Seluruh konten dapat dibaca publik tanpa login."
      />

      <section className="bg-slate-50 py-12 md:py-16">
        <div className="container-page">
          {/* Kategori */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {counts.map((c) => {
              const active = activeCategory === c.value;
              return (
                <a
                  key={c.value}
                  href={active ? "/berita" : `/berita?kategori=${c.value}`}
                  className={`group rounded-2xl border p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    active
                      ? "border-primary bg-linear-to-br from-blue-700 to-sky-600 text-white shadow-md shadow-blue-600/20"
                      : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                    <CategoryImage value={c.value} size={56} className="h-14 w-14" />
                  </span>
                  <p className={`mt-3 font-bold ${active ? "text-white" : "text-foreground"}`}>
                    Kategori {c.label}
                  </p>
                  <p className={`mt-0.5 text-xs ${active ? "text-blue-100" : "text-muted-foreground"}`}>
                    {c.count} artikel
                  </p>
                  <p className={`mt-1 hidden text-[11px] leading-snug sm:block ${active ? "text-blue-50/90" : "text-slate-400"}`}>
                    {c.blurb}
                  </p>
                </a>
              );
            })}
          </div>

          {/* Pencarian + daftar kartu */}
          <div className="mt-10">
            <NewsCatalog
              articles={displayArticles}
              initialQuery={query}
              initialCategory={activeCategory}
            />
          </div>
        </div>
      </section>
    </div>
  );
}