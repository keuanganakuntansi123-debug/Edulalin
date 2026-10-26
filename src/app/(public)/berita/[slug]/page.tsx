import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { fileUrl } from "@/lib/storage";
import { CalendarDays, User, ArrowLeft, Share2, Newspaper } from "lucide-react";
import { NEWS_CATEGORY_META, NEWS_CATEGORY_VALUES } from "../news-constants";
import { CategoryImage } from "../category-image";
import { ShareArticleButton } from "./share-article-button";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug, deletedAt: null, status: "ACTIVE" },
    select: { title: true, summary: true, category: true },
  });
  return {
    title: article
      ? `${article.title} | EDULALIN | Edukasi Lalu Lintas`
      : "Artikel | EDULALIN | Edukasi Lalu Lintas",
    description: article?.summary,
  };
}

function paragraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function BeritaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug, deletedAt: null, status: "ACTIVE" },
    include: { imageFile: { select: { storedName: true } } },
  });
  if (!article) notFound();

  const image =
    article.imageEmbedded ??
    (article.imageFile ? fileUrl(article.imageFile.storedName) : article.imageUrl) ??
    null;
  const meta = NEWS_CATEGORY_META[article.category] ?? NEWS_CATEGORY_META.SD;
  const published = article.publishedAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(article.publishedAt))
    : "";

  const related = await prisma.article.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      category: article.category,
      id: { not: article.id },
    },
    orderBy: [{ publishedAt: "desc" }],
    take: 3,
    include: { imageFile: { select: { storedName: true } } },
  });
  const relatedCards = related.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    category: r.category,
    image:
      r.imageEmbedded ?? (r.imageFile ? fileUrl(r.imageFile.storedName) : r.imageUrl) ?? null,
  }));

  return (
    <div className="overflow-x-hidden">
      {/* Header artikel */}
      <section className="relative overflow-hidden bg-linear-to-br from-blue-800 via-blue-700 to-sky-600 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, white 0, transparent 30%), radial-gradient(circle at 85% 25%, white 0, transparent 28%)",
          }}
          aria-hidden="true"
        />
        <div className="container-page relative py-14 md:py-20">
          <Link href="/berita" className="inline-flex items-center gap-1.5 text-sm text-blue-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Berita &amp; Edukasi
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <Badge className={meta.classes}>
              <CategoryImage value={article.category} size={16} className="mr-1.5 h-4 w-4 rounded-sm" />
              Artikel Kategori {meta.label}
            </Badge>
            {article.authorName && (
              <span className="inline-flex items-center gap-1.5 text-blue-100">
                <User className="h-3.5 w-3.5" /> {article.authorName}
              </span>
            )}
            {published && (
              <span className="inline-flex items-center gap-1.5 text-blue-100">
                <CalendarDays className="h-3.5 w-3.5" /> {published}
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
            {article.title}
          </h1>
        </div>
      </section>

      {/* Isi artikel */}
      <section className="bg-slate-50 py-12 md:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0">
            {image && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-lg shadow-slate-900/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={article.title}
                  className="max-h-115 w-full object-cover"
                />
              </div>
            )}

            {!image && (
              <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white">
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Newspaper className="h-10 w-10" />
                </span>
              </div>
            )}

            {/* Lead */}
            <p className="mt-8 text-xl font-semibold leading-relaxed text-slate-900">
              {article.summary}
            </p>

            {/* Isi */}
            <div className="mt-6 space-y-5">
              {paragraphs(article.content).map((p, i) => (
                <p key={i} className="text-base leading-8 text-slate-700 md:text-lg md:leading-9">
                  {p}
                </p>
              ))}
            </div>

            {/* Pembagian */}
            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-sm text-muted-foreground">
                Artikel ini disusun sebagai bahan edukasi keselamatan berlalu lintas oleh
                EDULALIN bekerja sama dengan sekolah, Kepolisian, dan Jasa Raharja.
              </p>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {/* Bagikan */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold">
                <Share2 className="h-4 w-4 text-primary" /> Bagikan Artikel
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">Salin tautan untuk berbagi:</p>
              <ShareArticleButton slug={article.slug} />
            </div>

            {/* Kategori lain */}
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold">🪪 Kategori Edukasi</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {NEWS_CATEGORY_VALUES.map((value) => (
                  <Link
                    key={value}
                    href={`/berita?kategori=${value}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 pl-2 pr-3 text-center font-medium text-slate-700 transition-all hover:border-primary/50 hover:bg-blue-50 hover:text-primary"
                  >
                    <CategoryImage value={value} size={22} className="h-5.5 w-5.5 rounded-md" />
                    {value}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Artikel terkait */}
        {relatedCards.length > 0 && (
          <div className="container-page mt-14">
            <h2 className="text-2xl font-bold">Artikel Lainnya — Kategori {meta.label}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedCards.map((r) => (
                <Link
                  key={r.id}
                  href={`/berita/${r.slug}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-36 overflow-hidden">
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image}
                        alt={r.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-50">
                        <CategoryImage value={r.category} size={64} className="h-16 w-16 rounded-xl opacity-80" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold leading-snug line-clamp-2 text-slate-900 group-hover:text-primary">
                      {r.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}