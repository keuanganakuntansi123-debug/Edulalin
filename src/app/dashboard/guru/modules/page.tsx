import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const instant = false;

export default async function GuruModulesPage() {
  const user = await requireRole("GURU");

  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      AND: [
        {
          OR: [
            { schoolId: null },
            ...(user.schoolId
              ? [
                  { schoolId: user.schoolId },
                  { moduleToSchools: { some: { schoolId: user.schoolId } } },
                ]
              : []),
          ],
        },
      ],
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { progresses: true, quizzes: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Modul</h1>
      <p className="mt-1 text-muted-foreground">
        Materi yang tersedia untuk sekolah Anda ({user.school?.name ?? "semua sekolah"}).
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {modules.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{m.title}</h3>
                <Badge variant="secondary">
                  {m.educationLevel === "SIM" ? "SMA/SMK" : LEVEL_LABEL[m.educationLevel]}
                </Badge>
                {m.educationLevel === "SIM" && (
                  <Badge className="bg-sky-100 text-sky-700">SIM</Badge>
                )}
                {m.schoolId ? <Badge variant="warning">Sekolah</Badge> : <Badge variant="outline">Global</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {m.moduleType} • {m.durationMin ? `± ${m.durationMin} menit` : "-"} • {m._count.progresses} dibaca • {m._count.quizzes} kuis
              </p>
            </CardContent>
          </Card>
        ))}
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
