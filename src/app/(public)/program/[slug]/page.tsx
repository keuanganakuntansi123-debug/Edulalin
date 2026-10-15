import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/public/animations/reveal";
import { levelDisplayLabel } from "@/lib/constants";
import { fileUrl } from "@/lib/storage";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.program.findUnique({ where: { slug } });
  return {
    title: p ? `${p.title} | EDULALIN | Edukasi Lalu Lintas` : "Program | EDULALIN | Edukasi Lalu Lintas",
    description: p?.description,
  };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await prisma.program.findUnique({
    where: { slug },
    include: {
      programModules: {
        where: { module: { deletedAt: null, status: "ACTIVE" } },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              description: true,
              educationLevel: true,
              moduleType: true,
              thumbnailFile: { select: { storedName: true } },
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { module: { order: "asc" } },
      },
    },
  });

  if (!program || program.status !== "ACTIVE") notFound();

  const objectives = (program.objectives ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const modules = program.programModules.map((pm) => pm.module);
  const imageSrc =
    program.imageUrl && (program.imageUrl.startsWith("http") || program.imageUrl.startsWith("/api/"))
      ? program.imageUrl
      : program.imageUrl
        ? fileUrl(program.imageUrl)
        : null;

  return (
    <div className="overflow-x-hidden">
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 py-14 text-white">
        <div className="container-page">
          <Link href="/program" className="text-sm text-blue-100 hover:text-white">
            ← Kembali ke Program
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">{program.title}</h1>
          <p className="mt-3 max-w-2xl text-blue-50">{program.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {program.target && <Badge className="bg-white/20 text-white">Sasaran: {program.target}</Badge>}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="container-page grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {imageSrc && (
              <Reveal>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc} alt={program.title} className="h-64 w-full rounded-2xl object-cover" />
              </Reveal>
            )}
            <Reveal className="mt-6">
              <h2 className="text-2xl font-bold">Tentang Program</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                {program.content || program.description}
              </p>
            </Reveal>

            {objectives.length > 0 && (
              <Reveal className="mt-8">
                <h2 className="text-2xl font-bold">Tujuan Pembelajaran</h2>
                <ul className="mt-3 space-y-2">
                  {objectives.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span>
                      {o}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>

          <div className="space-y-6">
            {modules.length > 0 ? (
              <Reveal>
                <Card>
                  <CardContent className="pt-5">
                    <h3 className="font-bold">Modul Terkait</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Modul yang tersambung dengan program ini.</p>
                    <ul className="mt-4 space-y-3">
                      {modules.map((m) => (
                        <li key={m.id}>
                          <Link
                            href={`/modul?kategori=${m.educationLevel === "SIM" ? "SMA" : m.educationLevel}`}
                            className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                              {m.moduleType === "VIDEO" ? "🎬" : m.moduleType === "LINK" ? "🔗" : "📄"}
                            </span>
                            <span>
                              <span className="block text-sm font-semibold group-hover:text-primary">{m.title}</span>
                              <span className="block text-xs text-muted-foreground">{levelDisplayLabel(m.educationLevel)} · {m.moduleType}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            ) : (
              <Reveal>
                <Card>
                  <CardContent className="pt-5">
                    <h3 className="font-bold">Modul Terkait</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Belum ada modul yang ditautkan ke program ini.</p>
                  </CardContent>
                </Card>
              </Reveal>
            )}

            <Reveal>
              <Card className="bg-gradient-to-br from-blue-50 to-sky-100">
                <CardContent className="pt-5">
                  <h3 className="font-bold">Tertarik mengikuti program?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buka modul terkait untuk mulai belajar atau hubungi Admin sekolahmu.
                  </p>
                  <Link href="/modul" className="mt-4 inline-block">
                    <Button size="sm">Jelajahi Modul</Button>
                  </Link>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
