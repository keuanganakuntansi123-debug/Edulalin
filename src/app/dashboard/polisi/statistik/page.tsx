import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolStats } from "@/components/charts/school-stats";
import { policeLevelLabel } from "@/lib/constants";

export const instant = false;

export default async function PolisiStatistikPage() {
  const user = await requireRole("POLISI");

  const schools = await prisma.school.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: { where: { role: "MURID", deletedAt: null } } } },
      users: {
        where: { role: "MURID", deletedAt: null },
        select: {
          quizAttempts: {
            where: { status: "COMPLETED" },
            select: { score: true },
          },
          moduleProgress: { select: { completed: true } },
        },
      },
    },
  });

  const data = schools.map((s) => {
    const attempts = s.users.flatMap((u) => u.quizAttempts);
    const avg = attempts.length
      ? Math.round(attempts.reduce((a, x) => a + (x.score ?? 0), 0) / attempts.length)
      : 0;
    const completed = s.users.reduce((a, u) => a + u.moduleProgress.filter((p) => p.completed).length, 0);
    return {
      name: s.name.length > 18 ? s.name.slice(0, 18) + "…" : s.name,
      murid: s._count.users,
      avg,
      completed,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Ringkasan Statistik</h1>
      <p className="mt-1 text-muted-foreground">Statistik agregat program edukasi lalu lintas per sekolah.</p>

      {(user.policeLevel || user.policeUnit || user.policeDivision) && (
        <div className="mt-4 inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-900">
          <span className="flex items-center gap-2">
            <span className="font-semibold">Identitas Kesatuan:</span> {policeLevelLabel(user.policeLevel)}
          </span>
          <span>{user.policeUnit ?? "-"}</span>
          {user.policeDivision && (
            <span>
              • {user.policeDivision}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jumlah Murid per Sekolah</CardTitle>
          </CardHeader>
          <CardContent>
            <SchoolStats data={data} bars={["murid"]} color="#1d4ed8" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rata-rata Nilai Kuis</CardTitle>
          </CardHeader>
          <CardContent>
            <SchoolStats data={data} bars={["avg"]} color="#f59e0b" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Sekolah</th>
              <th className="px-4 py-3">Murid</th>
              <th className="px-4 py-3">Modul Selesai</th>
              <th className="px-4 py-3">Rata-rata Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((d) => (
              <tr key={d.name}>
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3">{d.murid}</td>
                <td className="px-4 py-3">{d.completed}</td>
                <td className="px-4 py-3 font-semibold">{d.avg}/100</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
