import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/form";

export const instant = false;

export default async function GuruMuridPage() {
  const user = await requireRole("GURU");

  const murid = await prisma.user.findMany({
    where: { schoolId: user.schoolId, role: "MURID", deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      moduleProgress: true,
      quizAttempts: {
        where: { status: "COMPLETED" },
        select: { score: true, passed: true },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Monitoring Murid</h1>
      <p className="mt-1 text-muted-foreground">
        Pantau progress dan nilai murid di sekolah Anda ({user.school?.name ?? "-"}).
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {murid.map((m) => {
          const avg =
            m.quizAttempts.length > 0
              ? Math.round(m.quizAttempts.reduce((a, x) => a + (x.score ?? 0), 0) / m.quizAttempts.length)
              : null;
          const done = m.moduleProgress.filter((p) => p.completed).length;
          const total = m.moduleProgress.length;
          const progressPct = total ? Math.round((done / total) * 100) : 0;

          return (
            <Card key={m.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.educationLevel ? levelDisplayLabel(m.educationLevel) : "-"}
                      {m.classLevel ? ` • Kelas ${m.classLevel}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {avg != null ? (
                      avg >= 60 ? <Badge variant="success">{avg}</Badge> : <Badge variant="danger">{avg}</Badge>
                    ) : (
                      <Badge variant="outline">Belum ada nilai</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Modul selesai</span>
                    <span>{done}/{total || 0}</span>
                  </div>
                  <Progress value={progressPct} className="mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {murid.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada murid terdaftar di sekolah ini.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
