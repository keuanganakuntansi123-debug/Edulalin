import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getModuleForGuru } from "@/lib/module-service";
import { fileUrl } from "@/lib/file-url";
import { LEVEL_LABEL } from "@/lib/constants";
import { PdfAutoReader } from "@/app/dashboard/murid/materi/[id]/pdf-auto-reader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleThumbnail } from "@/components/dashboard/module-thumbnail";
import { ArrowLeft, Clock, FileText, Video, Link as LinkIcon } from "lucide-react";

export const instant = false;

/**
 * Guru membuka/membaca modul untuk sekolahnya (mode baca).
 * Tidak ada aksi ubah — hanya pratinjau konten dan jumlah murid yang membaca.
 */
export default async function GuruModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("GURU");

  const mod = await getModuleForGuru({
    moduleId: id,
    schoolId: user.schoolId,
    educationLevel: user.school?.educationLevel ?? null,
  });
  if (!mod) notFound();

  // Statistik pembacaan HANYA dari murid di sekolah guru (tanpa kebocoran sekolah lain).
  const [readers, completedReaders] = user.schoolId
    ? await Promise.all([
        prisma.moduleProgress.count({
          where: { moduleId: mod.id, user: { schoolId: user.schoolId, deletedAt: null } },
        }),
        prisma.moduleProgress.count({
          where: {
            moduleId: mod.id,
            completed: true,
            user: { schoolId: user.schoolId, deletedAt: null },
          },
        }),
      ])
    : [0, 0];

  const rawSource =
    mod.contentFileId && mod.contentFile ? fileUrl(mod.contentFile.storedName) : mod.contentUrl;
  const contentSource = rawSource ?? null;
  const isPdf =
    mod.moduleType === "PDF" ||
    (mod.moduleType === "DOCUMENT" &&
      (mod.contentFile?.mimeType === "application/pdf" ||
        (!!contentSource && contentSource.toLowerCase().includes(".pdf"))));

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/guru/modules"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke modul
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{LEVEL_LABEL[mod.educationLevel]}</Badge>
        {mod.schoolId == null && <Badge>Global</Badge>}
        <Badge variant="outline">Mode baca</Badge>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-[240px_1fr]">
        {mod.thumbnailFile ? (
          <ModuleThumbnail
            storedName={mod.thumbnailFile.storedName}
            mimeType={mod.thumbnailFile.mimeType}
            title={mod.title}
            className="aspect-3/4 w-full rounded-xl border border-border"
          />
        ) : null}
        <div>
          <h1 className="text-3xl font-extrabold">{mod.title}</h1>
          <p className="mt-2 text-muted-foreground">{mod.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> ± {mod.durationMin ?? "-"} menit
            </span>
            <span className="flex items-center gap-1">
              {mod.moduleType === "VIDEO" ? (
                <Video className="h-4 w-4" />
              ) : mod.moduleType === "LINK" ? (
                <LinkIcon className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Tipe: {mod.moduleType}
            </span>
            {mod.classLevel && <span>Kelas {mod.classLevel}</span>}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 rounded-xl bg-slate-50 p-3 text-sm">
            <span>
              <span className="font-bold">{readers}</span>{" "}
              <span className="text-muted-foreground">murid sekolah Anda membaca</span>
            </span>
            <span>
              <span className="font-bold">{completedReaders}</span>{" "}
              <span className="text-muted-foreground">selesai</span>
            </span>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-5">
          {contentSource ? (
            isPdf ? (
              <PdfAutoReader
                moduleId={mod.id}
                fileUrl={contentSource}
                title={mod.title}
                readOnly
              />
            ) : mod.moduleType === "VIDEO" ? (
              <video controls className="w-full rounded-lg border border-border" src={contentSource} />
            ) : mod.moduleType === "LINK" ? (
              <a
                href={contentSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                <LinkIcon className="h-4 w-4" /> Buka Tautan Materi
              </a>
            ) : (
              <iframe
                src={contentSource}
                className="h-125 w-full rounded-lg border border-border"
                title={mod.title}
              />
            )
          ) : (
            <p className="text-muted-foreground">Konten materi belum tersedia.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
