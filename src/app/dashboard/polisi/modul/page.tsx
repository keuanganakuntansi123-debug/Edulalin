import { requireRole } from "@/lib/guards";
import { LEVEL_LABEL } from "@/lib/constants";
import {
  listModulesForPolisi,
  groupPolisiModulesByLevelThenSchool,
  type PolisiModule,
} from "@/lib/module-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleThumbnail } from "@/components/dashboard/module-thumbnail";
import {
  BookOpen,
  FileText,
  Video,
  Link as LinkIcon,
  Building2,
  School as SchoolIcon,
  Eye,
} from "lucide-react";

export const instant = false;

const TYPE_ICON = { PDF: FileText, VIDEO: Video, LINK: LinkIcon, DOCUMENT: BookOpen };

function ModuleCard({ m }: { m: PolisiModule }) {
  const Icon = TYPE_ICON[m.moduleType];
  return (
    <Card className="hover:shadow-md transition-shadow">
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
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {m._count.progresses} pembacaan • {m._count.quizzes} kuis terkait
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PolisiModulPage() {
  await requireRole("POLISI");

  const modules = await listModulesForPolisi();
  const groups = groupPolisiModulesByLevelThenSchool(modules);

  const totalReads = modules.reduce((a, m) => a + m._count.progresses, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kelola Modul</h1>
          <p className="mt-1 text-muted-foreground">
            Modul edukasi per jenjang dan per sekolah. Total pembacaan di seluruh sekolah ({totalReads}).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Eye className="h-3.5 w-3.5" /> Hanya baca (tanpa penilaian)
        </span>
      </div>

      {groups.length === 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Belum ada modul.
          </CardContent>
        </Card>
      )}

      <div className="mt-6 space-y-8">
        {groups.map((group) => (
          <section key={group.level}>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">
                Jenjang {LEVEL_LABEL[group.level] ?? group.level}
              </h2>
              <Badge variant="outline">{group.moduleCount} modul</Badge>
            </div>

            <div className="mt-4 space-y-6">
              {group.schools.map((school) => (
                <div key={school.schoolId ?? "global"}>
                  <div className="mb-3 flex flex-wrap items-center gap-2 border-l-4 border-primary/60 pl-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <p className="font-semibold">{school.schoolName}</p>
                    <span className="text-xs text-muted-foreground">
                      {school.modules.length} modul
                    </span>
                    {school.schoolId === null && (
                      <Badge variant="outline" className="text-xs">
                        <SchoolIcon className="mr-1 h-3 w-3" /> Semua sekolah
                      </Badge>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {school.modules.map((m) => (
                      <ModuleCard key={`${school.schoolId ?? "global"}-${m.id}`} m={m} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
