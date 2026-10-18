import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { SchoolLogo } from "@/components/school/school-logo";

export const instant = false;

export default async function PolisiSekolahDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireRole("POLISI");

  const school = await prisma.school.findFirst({
    where: { id: schoolId, status: "ACTIVE", deletedAt: null },
    include: {
      users: {
        where: { role: "MURID", deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          classLevel: true,
          major: true,
          educationLevel: true,
          quizAttempts: {
            where: { status: "COMPLETED" },
            orderBy: { submittedAt: "desc" },
            select: {
              id: true,
              score: true,
              passed: true,
              submittedAt: true,
              quiz: { select: { title: true } },
            },
          },
        },
      },
      quizScope: {
        where: { quiz: { deletedAt: null, status: "ACTIVE" } },
        include: { quiz: { select: { id: true, title: true, minScore: true, status: true } } },
      },
    },
  });
  if (!school) notFound();

  const muridCount = school.users.length;
  const attemptCount = school.users.reduce((a, u) => a + u.quizAttempts.length, 0);
  const passedCount = school.users.reduce(
    (a, u) => a + u.quizAttempts.filter((x) => x.passed).length,
    0
  );
  const avg =
    attemptCount > 0
      ? Math.round(
          school.users.reduce((a, u) => a + u.quizAttempts.reduce((b, x) => b + (x.score ?? 0), 0), 0) /
            attemptCount
        )
      : null;

  return (
    <div>
      <Link href="/dashboard/polisi/sekolah" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Sekolah
      </Link>

      <div className="flex items-center gap-4">
        <SchoolLogo logoUrl={school.logoUrl} name={school.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{school.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {levelDisplayLabel(school.educationLevel)} • {school.city}, {school.province}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          ["Murid Terdaftar", muridCount],
          ["Total Pengerjaan Kuis", attemptCount],
          ["Rata-rata Nilai", avg != null ? `${avg}/100` : "-"],
          ["Lulus", `${passedCount}/${attemptCount}`],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Kuis untuk Sekolah Ini ({school.quizScope.length})</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {school.quizScope.map((qs) => (
            <Badge key={qs.quizId} variant="outline">
              {qs.quiz.title}
            </Badge>
          ))}
          {school.quizScope.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada kuis yang ditargetkan ke sekolah ini.</p>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Murid</th>
              <th className="px-4 py-3">Kelas / Jurusan</th>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {school.users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.educationLevel ?? "-"}
                  {u.classLevel ? ` • Kelas ${u.classLevel}` : ""}
                  {u.major ? ` • ${u.major}` : ""}
                </td>
                <td className="px-4 py-3">
                  {u.quizAttempts.length === 0 ? (
                    <span className="text-muted-foreground">Belum ada</span>
                  ) : (
                    <div className="space-y-1">
                      {u.quizAttempts.map((a) => (
                        <p key={a.id} className="truncate">{a.quiz.title}</p>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.quizAttempts.length === 0 ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    <div className="space-y-1">
                      {u.quizAttempts.map((a) => (
                        <p key={a.id} className={a.passed ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                          {a.score ?? 0}
                        </p>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.quizAttempts.length === 0 ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    <div className="space-y-1">
                      {u.quizAttempts.map((a) => (
                        <p key={a.id}>
                          {a.passed ? (
                            <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Lulus</Badge>
                          ) : (
                            <Badge variant="danger"><XCircle className="mr-1 h-3 w-3" /> Belum Lulus</Badge>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-end gap-1">
                    {u.quizAttempts.map((a) => (
                      <Link key={a.id} href={`/dashboard/polisi/kuis/${a.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" /> Detail
                        </Button>
                      </Link>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {school.users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada murid terdaftar di sekolah ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
