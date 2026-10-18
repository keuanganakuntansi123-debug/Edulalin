import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/form";

export const instant = false;

export default async function GuruReportsPage() {
  const user = await requireRole("GURU");

  const [modules, muridCount, attempts] = await Promise.all([
    prisma.module.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
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
      include: {
        progresses: {
          where: { user: { schoolId: user.schoolId, deletedAt: null } },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.count({ where: { role: "MURID", schoolId: user.schoolId, deletedAt: null } }),
    prisma.quizAttempt.count({
      where: { status: "COMPLETED", user: { schoolId: user.schoolId, role: "MURID" } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Laporan</h1>
      <p className="mt-1 text-muted-foreground">
        Ringkasan penggunaan modul oleh murid di {user.school?.name ?? "sekolah Anda"}.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Murid Terdaftar", muridCount],
          ["Quiz Dikerjakan", attempts],
          ["Modul Aktif", modules.length],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {modules.map((m) => {
          const done = m.progresses.filter((p) => p.completed).length;
          const pct = muridCount ? Math.round((done / muridCount) * 100) : 0;
          return (
            <Card key={m.id}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEVEL_LABEL[m.educationLevel]}{m.classLevel ? ` • Kelas ${m.classLevel}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">{done}/{muridCount} murid selesai</Badge>
                </div>
                <Progress value={pct} className="mt-3" />
              </CardContent>
            </Card>
          );
        })}
        {modules.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada modul.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
