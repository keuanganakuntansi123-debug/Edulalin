import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const instant = false;

export default async function PolisiKuisPage() {
  await requireRole("POLISI");

  const [attempts, total, avg, passed] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { status: "COMPLETED" },
      orderBy: { submittedAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, school: { select: { name: true } } } },
        quiz: { select: { title: true } },
      },
    }),
    prisma.quizAttempt.count({ where: { status: "COMPLETED" } }),
    prisma.quizAttempt.aggregate({ _avg: { score: true }, where: { status: "COMPLETED" } }),
    prisma.quizAttempt.count({ where: { status: "COMPLETED", passed: true } }),
  ]);

  const passRate = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Kuis Murid</h1>
      <p className="mt-1 text-muted-foreground">Ringkasan pengerjaan kuis di seluruh sekolah.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Total Pengerjaan", total],
          ["Rata-rata Nilai", avg._avg.score ? `${Math.round(avg._avg.score)}/100` : "-"],
          ["Tingkat Kelulusan", `${passRate}%`],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Murid</th>
              <th className="px-4 py-3">Sekolah</th>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium">{a.user.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.user.school?.name ?? "-"}</td>
                <td className="px-4 py-3">{a.quiz.title}</td>
                <td className="px-4 py-3 font-semibold">{a.score ?? 0}</td>
                <td className="px-4 py-3">
                  {a.passed ? <Badge variant="success">Lulus</Badge> : <Badge variant="danger">Belum Lulus</Badge>}
                </td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada pengerjaan kuis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
