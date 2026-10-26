import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteContentMap, getPublishedBlocks, getSiteStats } from "@/lib/site-content";
import { HeroAnimation } from "@/components/public/animations/hero-animation";
import { Reveal } from "@/components/public/animations/reveal";
import { CollaborationSection } from "@/components/public/collaboration-section";
import { EdulalinLogo } from "@/components/brand/edulalin-logo";
import { SchoolMarqueeSection } from "@/components/public/school-marquee";
import { fileUrl } from "@/lib/storage";
import { ArrowRight, CalendarDays } from "lucide-react";
import { NEWS_CATEGORY_META } from "./berita/news-constants";
import { CategoryImage } from "./berita/category-image";

export const metadata: Metadata = {
  title: "Beranda | EDULALIN | Edukasi Lalu Lintas",
  description: "EDULALIN — Edukasi Lalu Lintas. Belajar tertib berlalu lintas, mulai dari sekarang.",
};
export const instant = false;

export default async function LandingPage() {
  const [content, blocks, stats, features, latestArticles] = await Promise.all([
    getSiteContentMap(),
    getPublishedBlocks(),
    getSiteStats(),
    getFeatures(),
    getLatestArticles(),
  ]);

  const heroTitle = content.get("HERO_TITLE")?.body ?? "Belajar Tertib Berlalu Lintas, Mulai dari Sekarang!";
  const heroDesc =
    content.get("HERO_SUBTITLE")?.body ??
    "EDULALIN merupakan platform edukasi lalu lintas yang membantu pelajar memahami keselamatan berkendara, mengenali rambu lalu lintas, dan membangun kebiasaan tertib di jalan melalui materi pembelajaran digital dan kuis interaktif.";

  const intro = blocks.get("INTRO");
  const statsSettings = blocks.get("STATS_SETTINGS");
  const cta = blocks.get("CTA");
  const heroAnim = blocks.get("HERO_ANIMATION");
  const animationChoice = heroAnim?.meta?.animation === "police" ? "police" : "bicycle";

  const statsEnabled = Array.isArray(statsSettings?.meta?.enabled)
    ? (statsSettings.meta.enabled as string[])
    : ["schools", "murids", "modules", "quizzes"];

  const statItems = [
    { key: "schools", label: "Sekolah Terdaftar", value: stats.schools },
    { key: "murids", label: "Murid Terdaftar", value: stats.murids },
    { key: "modules", label: "Modul Tersedia", value: stats.modules },
    { key: "quizzes", label: "Kuis Pembelajaran", value: stats.quizzes },
  ].filter((s) => statsEnabled.includes(s.key));

  return (
    <div className="overflow-x-hidden">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-linear-to-br from-blue-800 via-blue-700 to-sky-600 text-white">
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 15% 25%, white 0, transparent 32%), radial-gradient(circle at 85% 20%, white 0, transparent 28%), radial-gradient(circle at 70% 85%, white 0, transparent 34%)" }} />
        <svg viewBox="0 0 1440 320" className="absolute bottom-0 left-0 w-full text-blue-900/30" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,234.7C672,245,768,235,864,213.3C960,192,1056,160,1152,160C1248,160,1344,192,1392,208L1440,224L1440,320L0,320Z" />
        </svg>
        <div className="container-page relative py-16 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <EdulalinLogo size="lg" variant="light" />
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
                🚦 Edukasi Keselamatan Lalu Lintas untuk Semua
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">{heroTitle}</h1>
              <p className="mt-4 max-w-xl text-lg text-blue-50">{heroDesc}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/program">
                  <Button size="lg" className="bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30 hover:bg-yellow-300">
                    Mulai Belajar
                  </Button>
                </Link>
                <Link href="/program">
                  <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/15">
                    Jelajahi Program
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-100">
                {[
                  ["🛡️", "Edukasi Tertib Berlalu Lintas"],
                  ["📚", "Modul & Kuis Interaktif"],
                  ["🤝", "Kolaborasi Sekolah, POLRI & Jasa Raharja"],
                ].map(([e, label]) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true">{e}</span>
                    {label}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={150} className="relative">
              <div className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/25 bg-white/10 shadow-2xl backdrop-blur">
                <HeroAnimation variant={animationChoice} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Statistik (data asli DB) ===== */}
      {statItems.length > 0 && (
        <section className="border-b border-border/60 bg-white">
          <div className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
            {statItems.map((s) => (
              <Reveal key={s.key} className="text-center">
                <p className="text-3xl font-extrabold text-primary md:text-4xl">{s.value.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ===== Sekolah yang Bergabung dengan EDULALIN (data Neon DB) ===== */}
      <SchoolMarqueeSection />

      {/* ===== Apa Itu EDULALIN ===== */}
      {intro && (
        <section className="bg-slate-50 py-20">
          <div className="container-page grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
                🚀 Apa Itu EDULALIN?
              </span>
              <h2 className="mt-4 text-3xl font-bold">{intro.title}</h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{intro.body}</p>
              <Link href="/tentang" className="mt-6 inline-block">
                <Button variant="outline" size="lg" className="border-blue-300 text-blue-700 hover:bg-blue-50">Selengkapnya</Button>
              </Link>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-blue-900/5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-blue-50 p-5 transition-transform hover:scale-[1.02]">
                    <span className="text-3xl">🚸</span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">Peduli Keselamatan</p>
                    <p className="mt-1 text-xs text-slate-500">Utamakan keamanan di setiap perjalanan</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-5 transition-transform hover:scale-[1.02]">
                    <span className="text-3xl">📚</span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">Materi Digital</p>
                    <p className="mt-1 text-xs text-slate-500">Belajar kapan saja, di mana saja</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-5 transition-transform hover:scale-[1.02]">
                    <span className="text-3xl">✅</span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">Evaluasi Terukur</p>
                    <p className="mt-1 text-xs text-slate-500">Kuis interaktif dengan nilai otomatis</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-50 p-5 transition-transform hover:scale-[1.02]">
                    <span className="text-3xl">🏫</span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">Bersama Sekolah</p>
                    <p className="mt-1 text-xs text-slate-500">Terintegrasi dengan kegiatan sekolah</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ===== Keunggulan ===== */}
      <section className="py-20">
        <div className="container-page">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
              ✨ Kenapa EDULALIN?
            </span>
            <h2 className="mt-4 text-3xl font-bold">Keunggulan EDULALIN</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Dirancang untuk mendukung pembelajaran keselamatan berlalu lintas yang mudah, menarik, dan terukur.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.id} delay={i * 90}>
                <Card className="group h-full rounded-3xl border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">
                  <CardContent className="pt-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">
                      {f.emoji ?? "📘"}
                    </span>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Kolaborasi Edukasi ===== */}
      <CollaborationSection />

      {/* ===== Berita & Edukasi (data Neon DB) ===== */}
      <section className="bg-slate-50 py-20">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
                📰 Berita &amp; Edukasi
              </span>
              <h2 className="mt-4 text-3xl font-bold">Artikel Terbaru Edukasi Lalu Lintas</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Ragam artikel edukasi keselamatan berkendara untuk SD, SMP, SMA, SMK, dan SIM —
                diperbarui langsung oleh Admin.
              </p>
            </div>
            <Link
              href="/berita"
              className="group inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-blue-50"
            >
              Lihat Semua Artikel
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((a, i) => (
              <Reveal key={a.id} delay={i * 90}>
                <Link
                  href={`/berita/${a.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl"
                >
                  <div className="relative h-44 overflow-hidden">
                    {a.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.image}
                        alt={a.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-50">
                        <CategoryImage value={a.category} size={72} className="h-18 w-18 rounded-2xl opacity-90" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 py-0.5 pl-1 pr-2.5 text-xs font-semibold shadow-sm">
                      <CategoryImage value={a.category} size={20} className="h-5 w-5 rounded-md" />
                      {NEWS_CATEGORY_META[a.category]?.label}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {a.date}
                    </p>
                    <h3 className="mt-2 font-bold leading-snug text-slate-900 transition-colors line-clamp-2 group-hover:text-primary">
                      {a.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{a.summary}</p>
                    <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary">
                      Baca Artikel
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
            {latestArticles.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center sm:col-span-2 lg:col-span-3">
                <p className="text-lg font-bold">Belum ada artikel</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Artikel edukasi yang diterbitkan Admin akan tampil di sini.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Ajakan Belajar ===== */}
      {cta && (
        <section className="relative overflow-hidden bg-linear-to-r from-blue-800 via-blue-700 to-sky-600 py-16 text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 0, transparent 30%), radial-gradient(circle at 80% 70%, white 0, transparent 25%)" }} />
          <div className="container-page text-center">
            <Reveal>
              <h2 className="text-3xl font-extrabold">{cta.title}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg text-blue-50">{cta.subtitle ?? cta.body}</p>
              <Link href="/register" className="mt-7 inline-block">
                <Button size="lg" className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">
                  {cta.body || "Mulai Belajar Sekarang"}
                </Button>
              </Link>
            </Reveal>
          </div>
        </section>
      )}
    </div>
  );
}

async function getFeatures() {
  const { prisma } = await import("@/lib/prisma");
  return prisma.siteFeature.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
}

async function getLatestArticles() {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.article.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 3,
    include: { imageFile: { select: { storedName: true } } },
  });
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    category: a.category,
    image:
      a.imageEmbedded ??
      (a.imageFile ? fileUrl(a.imageFile.storedName) : a.imageUrl) ??
      null,
    date: a.publishedAt
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
          new Date(a.publishedAt)
        )
      : "",
  }));
}