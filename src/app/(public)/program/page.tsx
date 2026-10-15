import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/public/animations/reveal";
import { PageHero } from "@/components/public/page-hero";
import { fileUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Program | EDULALIN | Edukasi Lalu Lintas",
  description: "Program edukasi keselamatan lalu lintas untuk pelajar di EDULALIN.",
};
export const instant = false;

const EMOJI_BY_SLUG: Record<string, string> = {
  "pengenalan-keselamatan-lalu-lintas": "🚸",
  "edukasi-keselamatan-untuk-pelajar": "🎒",
  "edukasi-berkendara-aman": "🛵",
  "edukasi-persiapan-sim": "🪪",
};

export default async function ProgramPage() {
  const programs = await prisma.program.findMany({
    where: { status: "ACTIVE" },
    orderBy: { order: "asc" },
    include: { _count: { select: { programModules: true } } },
  });

  return (
    <div className="overflow-x-hidden">
      <PageHero
        badge="Program Edukasi"
        badgeEmoji="📋"
        title="Program Edukasi Lalu Lintas"
        description="Temukan berbagai program pembelajaran yang membantu pelajar mengenal aturan, memahami risiko, dan menerapkan perilaku aman dalam berlalu lintas."
      />

      <section className="bg-slate-50 py-14 md:py-20">
        <div className="container-page">
          {programs.length === 0 ? (
            <div className="rounded-3xl border border-border bg-white p-10 text-center">
              <p className="text-lg font-semibold">Belum ada program tersedia</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Admin dapat menambahkan program edukasi melalui dashboard Kelola Konten Website.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {programs.map((p, i) => (
                <Reveal key={p.id} delay={i * 90}>
                  <Card className="group h-full overflow-hidden rounded-3xl border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">
                    <div className="flex h-44 items-center justify-center bg-linear-to-br from-blue-50 via-sky-50 to-indigo-100">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl.startsWith("http") || p.imageUrl.startsWith("/api/") ? p.imageUrl : fileUrl(p.imageUrl)}
                          alt={p.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-6xl transition-transform duration-300 group-hover:scale-110">
                          {EMOJI_BY_SLUG[p.slug] ?? "📘"}
                        </span>
                      )}
                    </div>
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xl font-bold">{p.title}</h2>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {p.target && (
                          <Badge variant="secondary">Sasaran: {p.target}</Badge>
                        )}
                        <Badge variant="outline">{p._count.programModules} modul terkait</Badge>
                      </div>
                      <Link href={`/program/${p.slug}`} className="mt-5 inline-block">
                        <Button className="bg-linear-to-r from-blue-700 to-sky-600 shadow-md shadow-blue-600/20 group-hover:from-blue-800 group-hover:to-sky-700">
                          Lihat Detail
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}

          {/* Info SIM */}
          <Reveal className="mt-12">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge className="bg-amber-500 text-white">Kategori Khusus</Badge>
                  <h3 className="mt-2 text-xl font-bold">Materi Khusus SIM</h3>
                  <p className="mt-1 max-w-xl text-sm text-amber-800">
                    Materi khusus SIM tergabung dalam kategori SMA/SMK dan hanya dapat diakses
                    oleh murid SMA/SMK yang memenuhi ketentuan usia minimal 17 tahun dalam sistem
                    EDULALIN. Akses divalidasi otomatis pada frontend dan backend.
                  </p>
                </div>
                <Link href="/modul?kategori=SMA">
                  <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                    Lihat Modul SIM
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
