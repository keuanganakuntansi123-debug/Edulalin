import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { listModulesForMurid } from "@/lib/module-service";
import { LEVEL_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, Link as LinkIcon, FileText, Lock } from "lucide-react";
import { fileUrl } from "@/lib/storage";

export const instant = false;

const TYPE_ICON = {
  PDF: FileText,
  VIDEO: Video,
  LINK: LinkIcon,
  DOCUMENT: BookOpen,
};

export default async function MateriPage() {
  const user = await requireRole("MURID");
  const modules = await listModulesForMurid({
    userId: user.id,
    schoolId: user.schoolId,
    educationLevel: user.educationLevel ?? "SMA",
    classLevel: user.classLevel,
    birthDate: user.birthDate,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Kelola Modul</h1>
      <p className="mt-1 text-muted-foreground">
        Kelola dan akses modul pembelajaran sesuai jenjang dan kelas Anda.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const prog = m.progresses[0];
          const Icon = TYPE_ICON[m.moduleType];
          const simLocked = m.isSim && m.simLocked;
          const thumbUrl = m.thumbnailFile?.storedName ? fileUrl(m.thumbnailFile.storedName) : null;
          return (
            <Card key={m.id} className={simLocked ? "border-amber-300 bg-amber-50/40" : "hover:shadow-md transition-shadow"}>
              <CardContent className="p-0">
                <div className="relative aspect-3/4 w-full overflow-hidden rounded-t-xl bg-slate-100">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt={m.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
                      <BookOpen className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <Badge variant={simLocked ? "warning" : "secondary"}>{LEVEL_LABEL[m.educationLevel]}</Badge>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold line-clamp-1">{m.title}</h3>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="h-4 w-4" /> {m.moduleType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-primary">{m.educationLevel}</p>
                {simLocked ? (
                  <>
                    <p className="mt-1 text-sm text-amber-700">
                      Modul SIM tersedia setelah Anda berusia 17 tahun.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-100 p-2 text-sm font-medium text-amber-800">
                      <Lock className="h-4 w-4" /> Terkunci
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {m.durationMin && <span>± {m.durationMin} menit</span>}
                      {m.classLevel && <span>Kelas {m.classLevel}</span>}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{prog?.progress ?? 0}%</span>
                      </div>
                      <Progress value={prog?.progress ?? 0} className="mt-1" />
                    </div>
                    <Link href={`/dashboard/murid/materi/${m.id}`} className="mt-4 block">
                      <Button className="w-full" variant={prog ? "outline" : "default"}>
                        {prog ? "Lanjut Belajar" : "Mulai Belajar"}
                      </Button>
                    </Link>
                  </>
                )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modules.length === 0 && (
        <Card className="mt-6">
          <CardContent className="pt-8 text-center">
            <p className="text-muted-foreground">Belum ada modul untuk jenjang Anda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
