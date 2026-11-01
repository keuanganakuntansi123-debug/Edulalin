import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABEL } from "@/lib/constants";
import { listModulesForGuru } from "@/lib/module-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OwnSchoolCard } from "@/components/school/own-school-card";
import { ModuleThumbnail } from "@/components/dashboard/module-thumbnail";
import Link from "next/link";
import { BookOpen, FileText, Video, Link as LinkIcon } from "lucide-react";

export const instant = false;

export default async function GuruModulesPage() {
  const user = await requireRole("GURU");

  const [modules, studentCount, teacherCount, moduleCount] = await Promise.all([
    listModulesForGuru({
      schoolId: user.schoolId,
      educationLevel: user.school?.educationLevel ?? null,
    }),
    prisma.user.count({ where: { schoolId: user.schoolId, role: "MURID", deletedAt: null } }),
    prisma.user.count({ where: { schoolId: user.schoolId, role: "GURU", deletedAt: null } }),
    user.schoolId
      ? prisma.module.count({
          where: {
            deletedAt: null,
            status: "ACTIVE",
            OR: [
              { schoolId: user.schoolId },
              { moduleToSchools: { some: { schoolId: user.schoolId } } },
            ],
          },
        })
      : Promise.resolve(0),
  ]);

  const TYPE_ICON = { PDF: FileText, VIDEO: Video, LINK: LinkIcon, DOCUMENT: BookOpen };

  return (
    <div>
      <h1 className="text-2xl font-bold">Kelola Modul</h1>
      <p className="mt-1 text-muted-foreground">
        Modul yang tersedia untuk sekolah Anda ({user.school?.name ?? "semua sekolah"}).
      </p>

      {user.school && (
        <div className="mt-6">
          <OwnSchoolCard
            school={{
              id: user.school.id,
              code: user.school.code,
              name: user.school.name,
              educationLevel: user.school.educationLevel,
              address: user.school.address,
              city: user.school.city,
              province: user.school.province,
              logoUrl: user.school.logoUrl,
              logoEmbedded: user.school.logoEmbedded,
              studentCount,
              teacherCount,
              moduleCount,
            }}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = TYPE_ICON[m.moduleType];
          return (
            <Link key={m.id} href={`/dashboard/guru/modules/${m.id}`} className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-slate-100">
                  <ModuleThumbnail
                    storedName={m.thumbnailFile?.storedName}
                    mimeType={m.thumbnailFile?.mimeType}
                    title={m.title}
                    className="h-full w-full"
                  />
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{LEVEL_LABEL[m.educationLevel]}</Badge>
                    {m.schoolId ? <Badge variant="warning">Sekolah</Badge> : <Badge variant="outline">Global</Badge>}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold line-clamp-1">{m.title}</h3>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {m.classLevel && <span>Kelas {m.classLevel}</span>}
                    {m.durationMin && <span>± {m.durationMin} menit</span>}
                    <span>{m._count.progresses} dibaca</span>
                    <span>{m._count.quizzes} kuis</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          );
        })}
        {modules.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada modul untuk sekolah Anda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
