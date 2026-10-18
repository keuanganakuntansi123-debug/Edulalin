import { requireRole } from "@/lib/guards";
import { LEVEL_LABEL } from "@/lib/constants";
import { listModulesForPolisi } from "@/lib/module-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, Video, Link as LinkIcon, Building2 } from "lucide-react";
import { fileUrl } from "@/lib/storage";

export const instant = false;

export default async function PolisiModulPage() {
  await requireRole("POLISI");

  const modules = await listModulesForPolisi();

  const totalReads = modules.reduce((a, m) => a + m._count.progresses, 0);
  const TYPE_ICON = { PDF: FileText, VIDEO: Video, LINK: LinkIcon, DOCUMENT: BookOpen };

  return (
    <div>
      <h1 className="text-2xl font-bold">Kelola Modul</h1>
      <p className="mt-1 text-muted-foreground">
        Modul edukasi yang tersedia dan total pembacaan (progress) di seluruh sekolah ({totalReads}).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = TYPE_ICON[m.moduleType];
          const thumbUrl = m.thumbnailFile?.storedName ? fileUrl(m.thumbnailFile.storedName) : null;
          return (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-slate-100">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt={m.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
                      <BookOpen className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{LEVEL_LABEL[m.educationLevel]}</Badge>
                    {m.educationLevel === "SIM" && <Badge className="bg-sky-100 text-sky-700">SIM</Badge>}
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
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {m.school ? m.school.name : "Semua Sekolah"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {m._count.progresses} pembacaan • {m._count.quizzes} kuis terkait
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {modules.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada modul.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
