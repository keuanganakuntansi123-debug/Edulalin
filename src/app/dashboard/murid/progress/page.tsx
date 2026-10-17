import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

export const instant = false;

export default async function MuridProgressPage() {
  const user = await requireRole("MURID");

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
        user.educationLevel === "SMA"
          ? { educationLevel: { in: ["SMA", "SIM"] } }
          : user.educationLevel === "SMK"
            ? { educationLevel: { in: ["SMK", "SIM"] } }
          : { educationLevel: user.educationLevel ?? undefined },
      ],
    },
    include: {
      progresses: { where: { userId: user.id } },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = modules.length;
  const done = modules.filter((m) => m.progresses[0]?.completed).length;
  const avg = total
    ? Math.round(
        modules.reduce((acc, m) => acc + (m.progresses[0]?.progress ?? 0), 0) / total
      )
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Progress Belajar</h1>
      <p className="mt-1 text-muted-foreground">Pantau perkembangan belajarmu.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{done}<span className="text-sm text-muted-foreground">/{total}</span></p>
            <p className="text-sm text-muted-foreground">Modul Selesai</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{avg}%</p>
            <p className="text-sm text-muted-foreground">Rata-rata Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{total - done}</p>
            <p className="text-sm text-muted-foreground">Belum Selesai</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {modules.map((m) => {
          const prog = m.progresses[0];
          return (
            <Card key={m.id}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{levelDisplayLabel(m.educationLevel)}{m.classLevel ? ` • Kelas ${m.classLevel}` : ""}</p>
                  </div>
                  {prog?.completed ? <Badge variant="success">Selesai</Badge> : <Badge variant="secondary">{prog?.progress ?? 0}%</Badge>}
                </div>
                <Progress value={prog?.progress ?? 0} className="mt-3" />
              </CardContent>
            </Card>
          );
        })}
        {modules.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada modul untuk jenjang Anda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
