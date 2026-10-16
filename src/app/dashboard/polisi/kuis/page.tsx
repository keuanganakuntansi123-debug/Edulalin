import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, Eye, ClipboardList } from "lucide-react";
import { SchoolFilter } from "./school-filter";

export const instant = false;

export default async function PolisiKuisPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  await requireRole("POLISI");
  const { schoolId } = await searchParams;

  const roleFilter: Prisma.UserWhereInput = { role: "MURID" };
  const schoolWhere: Prisma.QuizAttemptWhereInput =
    schoolId && schoolId !== "all"
      ? { user: { ...roleFilter, schoolId } }
      : { user: roleFilter };

  const [schools, attempts, total, avg, passed] = await Promise.all([
    prisma.school.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.quizAttempt.findMany({
      where: { status: "COMPLETED", ...schoolWhere },
      orderBy: { submittedAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, school: { select: { name: true } }, classLevel: true } },
        quiz: { select: { title: true, minScore: true } },
        _count: { select: { answers: true } },
      },
    }),
    prisma.quizAttempt.count({ where: { status: "COMPLETED", ...schoolWhere } }),
    prisma.quizAttempt.aggregate({ _avg: { score: true }, where: { status: "COMPLETED", ...schoolWhere } }),
    prisma.quizAttempt.count({ where: { status: "COMPLETED", passed: true, ...schoolWhere } }),
  ]);

  const avgScore = avg._avg?.score ? Math.round(avg._avg.score) : null;
  const passRate = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Kuis Murid</h1>
      <p className="mt-1 text-muted-foreground">
        Pantau hasil pengerjaan kuis murid per sekolah. Data setiap sekolah dipisahkan agar tidak tercampur.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <SchoolFilter schools={schools} current={schoolId ?? "all"} />
        <Link href="/dashboard/polisi/kuis/kerjakan">
          <Button size="sm" variant="outline">
            <ClipboardList className="h-4 w-4" /> Kerjakan Kuis (Polisi)
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Total Pengerjaan", total],
          ["Rata-rata Nilai", avgScore != null ? `${avgScore}/100` : "-"],
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
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium">{a.user.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.user.school?.name ?? "-"}</td>
                <td className="px-4 py-3">{a.quiz.title}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${a.passed ? "text-emerald-600" : "text-red-600"}`}>
                    {a.score ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.passed ? (
                    <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Lulus</Badge>
                  ) : (
                    <Badge variant="danger"><XCircle className="mr-1 h-3 w-3" /> Belum Lulus</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Link href={`/dashboard/polisi/kuis/${a.id}`}>
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
