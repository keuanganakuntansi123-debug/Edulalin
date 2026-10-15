import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getModuleForUser } from "@/lib/module-service";
import { fileUrl } from "@/lib/storage";
import { LEVEL_LABEL } from "@/lib/constants";
import { SaveProgressForm } from "./save-progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, FileText, Video, Link as LinkIcon } from "lucide-react";

export const instant = false;

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("MURID");
  const mod = await getModuleForUser({
    moduleId: id,
    user: {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
      educationLevel: user.educationLevel,
      birthDate: user.birthDate,
    },
  });

  if (!mod) notFound();

  const progress = await prisma.moduleProgress.findUnique({
    where: { moduleId_userId: { moduleId: mod.id, userId: user.id } },
  });

  const contentSource =
    mod.contentFileId && mod.contentFile
      ? fileUrl(mod.contentFile.storedName)
      : mod.contentUrl;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/murid/materi"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke materi
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {mod.educationLevel === "SIM" ? "SMA/SMK" : LEVEL_LABEL[mod.educationLevel]}
        </Badge>
        {mod.schoolId == null && <Badge>Global</Badge>}
        {mod.status === "ACTIVE" && <Badge variant="success">Aktif</Badge>}
      </div>

      <h1 className="mt-3 text-3xl font-extrabold">{mod.title}</h1>
      <p className="mt-2 text-muted-foreground">{mod.description}</p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ± {mod.durationMin ?? "-"} menit</span>
        <span className="flex items-center gap-1">
          {mod.moduleType === "VIDEO" ? <Video className="h-4 w-4" /> : mod.moduleType === "LINK" ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          Tipe: {mod.moduleType}
        </span>
      </div>

      {/* Materi */}
      <Card className="mt-6">
        <CardContent className="pt-5">
          {contentSource ? (
            <div>
              {mod.moduleType === "PDF" || mod.moduleType === "DOCUMENT" ? (
                <iframe
                  src={contentSource}
                  className="h-125 w-full rounded-lg border border-border"
                  title={mod.title}
                />
              ) : mod.moduleType === "VIDEO" ? (
                <video controls className="w-full rounded-lg border border-border" src={contentSource} />
              ) : (
                <a
                  href={contentSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  <LinkIcon className="h-4 w-4" /> Buka Tautan Materi
                </a>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Konten materi belum tersedia.</p>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Progres Belajar Anda</p>
            <p className="text-sm text-muted-foreground">
              {progress?.completed ? "Modul selesai. Terima kasih sudah belajar!" : "Tandai progres setelah membaca materi."}
            </p>
          </div>
          <span className="text-2xl font-bold">{progress?.progress ?? 0}%</span>
        </div>
        <SaveProgressForm moduleId={mod.id} currentProgress={progress?.progress ?? 0} />
      </div>
    </div>
  );
}
