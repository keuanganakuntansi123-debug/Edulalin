import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, Eye, Search } from "lucide-react";
import { SchoolFilter } from "./school-filter";
import { Input } from "@/components/ui/form";

export const instant = false;

export default async function PolisiKuisPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; q?: string; status?: string }>;
}) {
  await requireRole("POLISI");
  const { schoolId, q, status } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const roleFilter: Prisma.UserWhereInput = { role: "MURID" };
  const schoolWhere: Prisma.QuizAttemptWhereInput =
    schoolId && schoolId !== "all"
      ? { user: { ...roleFilter, schoolId } }
      : { user: roleFilter };
  const nameWhere: Prisma.QuizAttemptWhereInput =
    query && schoolId && schoolId !== "all"
      ? { user: { ...roleFilter, schoolId, name: { contains: query, mode: "insensitive" } } }
      : query
        ? { user: { ...roleFilter, name: { contains: query, mode: "insensitive" } } }
        : schoolWhere;
  const statusWhere: Prisma.QuizAttemptWhereInput =
    status === "lulus" ? { passed: true } : status === "belum" ? { passed: false } : {};

  const [schools, attempts, total, avg, passed] = await Promise.all([
    prisma.school.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.quizAttempt.findMany({
      where: { status: "COMPLETED", ...nameWhere, ...statusWhere },
      orderBy: { submittedAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            classLevel: true,
            major: true,
            school: { select: { name: true, educationLevel: true } },
          },
        },
        quiz: { select: { title: true, minScore: true } },
        _count: { select: { answers: true } },
      },
    }),
    prisma.quizAttempt.count({ where: { status: "COMPLETED", ...nameWhere, ...statusWhere } }),
    prisma.quizAttempt.aggregate({
      _avg: { score: true },
      where: { status: "COMPLETED", ...nameWhere, ...statusWhere },
    }),
    prisma.quizAttempt.count({
      where: { status: "COMPLETED", passed: true, ...nameWhere, ...statusWhere },
    }),
  ]);

  const avgScore = avg._avg?.score ? Math.round(avg._avg.score) : null;
  const passRate = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Pemantauan Kuis Murid</h1>
      <p className="mt-1 text-muted-foreground">
        Pantau hasil pengerjaan kuis murid per sekolah. Data setiap sekolah dipisahkan agar tidak tercampur.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SchoolFilter schools={schools} current={schoolId ?? "all"} />
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="schoolId" value={schoolId ?? "all"} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cari nama murid..."
              className="w-56 pl-9"
            />
          </div>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Semua Status</option>
            <option value="lulus">Lulus</option>
            <option value="belum">Belum Lulus</option>
          </select>
          <Button type="submit" size="sm" variant="outline">
            <Search className="h-4 w-4" /> Filter
          </Button>
        </form>
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

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-190 text-sm">
          <thead className="whitespace-nowrap bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Murid</th>
              <th className="px-4 py-3">Sekolah</th>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Kelas / Jurusan</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium">{a.user.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.user.school?.name ?? "-"}
                  {a.user.school?.educationLevel ? ` (${a.user.school.educationLevel})` : ""}
                </td>
                <td className="px-4 py-3">{a.quiz.title}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.user.classLevel ? `Kelas ${a.user.classLevel}` : "-"}
                  {a.user.major ? ` • ${a.user.major}` : ""}
                </td>
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
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
