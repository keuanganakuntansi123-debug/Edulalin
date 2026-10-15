import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPublishedBlocks } from "@/lib/site-content";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/public/animations/reveal";
import { PageHero } from "@/components/public/page-hero";
import { CollaborationSection } from "@/components/public/collaboration-section";

export const metadata: Metadata = { title: "Tentang Kami | EDULALIN | Edukasi Lalu Lintas" };
export const instant = false;

export default async function TentangPage() {
  const [blocks, missions, goals] = await Promise.all([
    getPublishedBlocks(),
    prisma.missionItem.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.goalItem.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  const profile = blocks.get("ABOUT_PROFILE");
  const vision = blocks.get("ABOUT_VISION");
  const mission = blocks.get("ABOUT_MISSION");
  const tujuan = blocks.get("ABOUT_GOALS");
  const partners = blocks.get("ABOUT_PARTNERS");

  const missionText = mission?.body ?? "";
  const missionLines = missions.length > 0 ? missions.map((m) => m.text) : missionText.split("\n").map((s) => s.trim()).filter(Boolean);
  const goalLines = goals.length > 0 ? goals.map((g) => g.text) : (tujuan?.body ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="overflow-x-hidden">
      <PageHero
        badge="Tentang Kami"
        badgeEmoji="🏫"
        title={profile?.title ?? "Mengenal EDULALIN"}
      />

      <section className="py-14 md:py-20">
        <div className="container-page">
          <Reveal>
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
                  🚦 Platform Edukasi Keselamatan
                </span>
                <h2 className="mt-4 text-3xl font-bold">Platform Edukasi Keselamatan Berlalu Lintas</h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {profile?.body ?? "EDULALIN (Edukasi Lalu Lintas) merupakan platform pembelajaran digital yang berfokus pada peningkatan literasi keselamatan berlalu lintas bagi pelajar."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary">Materi Edukasi</Badge>
                  <Badge className="bg-primary/10 text-primary">Modul Digital</Badge>
                  <Badge className="bg-primary/10 text-primary">Kuis Interaktif</Badge>
                  <Badge className="bg-primary/10 text-primary">Pemantauan Hasil</Badge>
                </div>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50 to-sky-100 p-8 text-center shadow-lg shadow-blue-900/5">
                <span className="text-6xl">🚸</span>
                <p className="mt-3 text-lg font-extrabold text-slate-900">Belajar Aman di Jalan</p>
                <p className="mt-1 text-sm font-medium text-blue-700">Tagline EDULALIN</p>
              </div>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Reveal>
              <Card className="h-full rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">🎯</span>
                  <h2 className="mt-4 text-xl font-bold">{vision?.title ?? "Visi"}</h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {vision?.body ?? "Mendorong terwujudnya generasi muda yang memahami, menghargai, dan menerapkan prinsip keselamatan berlalu lintas dalam kehidupan sehari-hari."}
                  </p>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={90}>
              <Card className="h-full rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">🚀</span>
                  <h2 className="mt-4 text-xl font-bold">{mission?.title ?? "Misi"}</h2>
                  <ul className="mt-3 space-y-2">
                    {missionLines.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          <Reveal className="mt-10">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">🎓</span>
                <h2 className="mt-4 text-xl font-bold">{tujuan?.title ?? "Tujuan EDULALIN"}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {goalLines.map((g, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">✓</span>
                      {g}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ===== Kolaborasi Edukasi ===== */}
      <CollaborationSection
        title={partners?.title ?? "Kolaborasi Edukasi"}
        subtitle={
          partners?.body ??
          "EDULALIN mendukung kolaborasi antara sekolah, Kepolisian, dan Jasa Raharja dalam edukasi keselamatan berlalu lintas. Informasi kerja sama resmi ditampilkan sesuai data yang dikelola Admin."
        }
      />
    </div>
  );
}