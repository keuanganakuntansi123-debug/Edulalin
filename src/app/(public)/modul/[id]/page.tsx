import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/public/animations/reveal";
import { LEVEL_LABEL } from "@/lib/constants";
import { fileUrl } from "@/lib/storage";
import { getSessionPayload } from "@/lib/session";
import { dashboardPath } from "@/lib/constants";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const m = await prisma.module.findUnique({
    where: { id },
    select: { title: true, description: true },
  });
  return {
    title: m ? `${m.title} | EDULALIN | Edukasi Lalu Lintas` : "Modul | EDULALIN | Edukasi Lalu Lintas",
    description: m?.description,
  };
}

export default async function PublicModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [module, session] = await Promise.all([
    prisma.module.findUnique({
      where: { id },
      include: {
        thumbnailFile: { select: { storedName: true } },
        contentFile: { select: { originalName: true, mimeType: true, storedName: true } },
      },
    }),
    getSessionPayload(),
  ]);

  if (!module || module.deletedAt !== null || module.status !== "ACTIVE") notFound();

  const displayThumbnail = module.thumbnailFile?.storedName
    ? fileUrl(module.thumbnailFile.storedName)
    : module.thumbnailUrl ?? null;

  const isSim = module.educationLevel === "SIM";
  const loggedIn = Boolean(session);

  return (
    <div className="overflow-x-hidden">
      <section className="bg-linear-to-br from-blue-700 via-blue-600 to-sky-500 py-12 text-white">
        <div className="container-page">
          <Link href="/modul" className="text-sm text-blue-100 hover:text-white">
            ← Kembali ke Modul
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-white/20 text-white">
              {module.educationLevel === "SIM" ? "SMA/SMK" : LEVEL_LABEL[module.educationLevel]}
            </Badge>
            {module.classLevel && <Badge className="bg-white/20 text-white">Kelas {module.classLevel}</Badge>}
            <Badge className="bg-white/20 text-white">{module.moduleType}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold md:text-4xl">{module.title}</h1>
        </div>
      </section>

      <section className="bg-slate-50 py-12 md:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Reveal>
              {displayThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayThumbnail} alt={module.title} className="h-64 w-full rounded-2xl object-cover" />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-linear-to-br from-blue-50 to-sky-100">
                  <span className="text-6xl">📘</span>
                </div>
              )}
              <h2 className="mt-6 text-2xl font-bold">Deskripsi</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{module.description}</p>
            </Reveal>
          </div>

          <div className="space-y-5">
            {isSim && (
              <Reveal>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  🪪 <strong>Modul SIM</strong> tergabung dalam kategori SMA/SMK dan tersedia untuk
                  murid SMA/SMK yang telah berusia minimal 17 tahun.
                </div>
              </Reveal>
            )}

            <Reveal>
              <div className="rounded-2xl border border-border bg-white p-6">
                <h3 className="font-bold">Akses Materi</h3>
                {loggedIn ? (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Anda telah masuk. Buka materi melalui dashboard sesuai hak akses Anda.
                    </p>
                    <Link href={dashboardPath(session!.role)} className="mt-4 inline-block">
                      <Button className="w-full">Buka Dashboard</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Konten modul hanya dapat diakses pengguna yang berhak melalui akun yang terdaftar.
                      Silakan masuk untuk membuka materi.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link href="/login">
                        <Button className="w-full">Login</Button>
                      </Link>
                      <Link href="/register">
                        <Button variant="outline" className="w-full">Daftar</Button>
                      </Link>
                    </div>
                  </>
                )}
                {module.contentFile && (
                  <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    📎 {module.contentFile.originalName}
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
