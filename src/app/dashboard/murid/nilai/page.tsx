import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

export const instant = false;

export default async function MuridNilaiPage() {
  const user = await requireRole("MURID");

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    include: {
      quiz: { select: { title: true, minScore: true, educationLevel: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const avg =
    attempts.length > 0
      ? Math.round(attempts.reduce((a, x) => a + (x.score ?? 0), 0) / attempts.length)
      : 0;
  const passed = attempts.filter((a) => a.passed).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Nilai Quiz</h1>
      <p className="mt-1 text-muted-foreground">Riwayat hasil kuis Anda.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{attempts.length}</p>
            <p className="text-sm text-muted-foreground">Total Quiz Dikerjakan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{avg}/100</p>
            <p className="text-sm text-muted-foreground">Rata-rata Nilai</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{passed}</p>
            <p className="text-sm text-muted-foreground">Lulus</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-160 text-sm">
          <thead className="whitespace-nowrap bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Jenjang</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium">{a.quiz.title}</td>
                <td className="px-4 py-3">{levelDisplayLabel(a.quiz.educationLevel)}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${a.passed ? "text-emerald-600" : "text-red-600"}`}>
                    {a.score ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground"> / 100</span>
                </td>
                <td className="px-4 py-3">
                  {a.passed ? (
                    <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Lulus</Badge>
                  ) : (
                    <Badge variant="danger"><XCircle className="mr-1 h-3 w-3" /> Belum Lulus</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("id-ID") : "-"}
                </td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada kuis yang dikerjakan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
