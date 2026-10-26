import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { PrintScoresClient } from "./print-scores-client";

export const instant = false;

export default async function GuruQuizPage() {
  const user = await requireRole("GURU");

  const attempts = await prisma.quizAttempt.findMany({
    where: { status: "COMPLETED", user: { schoolId: user.schoolId, role: "MURID" } },
    orderBy: { submittedAt: "desc" },
    take: 500,
    include: {
      user: {
        select: {
          name: true,
          classLevel: true,
          major: true,
          educationLevel: true,
          school: { select: { name: true } },
        },
      },
      quiz: { select: { title: true, minScore: true } },
    },
  });

  const avg = attempts.length ? Math.round(attempts.reduce((a, x) => a + (x.score ?? 0), 0) / attempts.length) : null;
  const passCount = attempts.filter((a) => a.passed).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Kelola Kuis</h1>
      <p className="mt-1 text-muted-foreground">
        Hasil pengerjaan kuis murid di {user.school?.name ?? "sekolah Anda"}. Notifikasi muncul otomatis saat murid menyelesaikan kuis.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Total Pengerjaan", attempts.length],
          ["Rata-rata Nilai", avg != null ? `${avg}/100` : "-"],
          ["Lulus", `${passCount}/${attempts.length}`],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border bg-slate-50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {attempts.length} hasil pengerjaan murid
          </p>
          <PrintScoresClient
            schoolName={user.school?.name ?? "Sekolah"}
            attempts={attempts.map((a) => ({
              id: a.id,
              studentName: a.user.name,
              className: a.user.classLevel,
              major: a.user.major,
              educationLevel: a.user.educationLevel,
              schoolName: a.user.school?.name ?? user.school?.name ?? "-",
              quizTitle: a.quiz.title,
              score: a.score ?? 0,
              passed: a.passed ?? false,
              minScore: a.quiz.minScore,
              submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
            }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-205 text-sm">
            <thead className="whitespace-nowrap bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Murid</th>
                <th className="px-4 py-3">Kelas / Jurusan</th>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Nilai</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium">
                  {a.user.name}
                  {a.user.classLevel && <span className="ml-1 text-xs text-muted-foreground">• Kelas {a.user.classLevel}</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.user.educationLevel ?? "-"}
                  {a.user.major ? ` • ${a.user.major}` : ""}
                </td>
                <td className="px-4 py-3">{a.quiz.title}</td>
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
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/guru/quiz/${a.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" /> Lihat Detail
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada kuis yang dikerjakan murid.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
