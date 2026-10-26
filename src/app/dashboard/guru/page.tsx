import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, ClipboardList, GraduationCap } from "lucide-react";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardClock } from "@/components/dashboard/live-clock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBars } from "@/components/charts/progress-bars";
import { CategoryBreakdown } from "@/components/charts/category-breakdown";

export const instant = false;

export default async function GuruDashboardPage() {
  const user = await requireRole("GURU");

  const [murid, modul, quizzes, avgScore] = await Promise.all([
    prisma.user.count({ where: { schoolId: user.schoolId, role: "MURID", deletedAt: null } }),
    prisma.module.count({
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
    }),
    prisma.quiz.count({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        OR: [
          { schoolId: null },
          ...(user.schoolId
            ? [
                { schoolId: user.schoolId },
                { quizToSchools: { some: { schoolId: user.schoolId } } },
              ]
            : []),
        ],
      },
    }),
    prisma.quizAttempt.aggregate({
      _avg: { score: true },
      where: {
        status: "COMPLETED",
        user: { schoolId: user.schoolId, deletedAt: null },
      },
    }),
  ]);

  const recentAttempts = await prisma.quizAttempt.findMany({
    where: { status: "COMPLETED", user: { schoolId: user.schoolId } },
    orderBy: { submittedAt: "desc" },
    take: 6,
    include: { user: { select: { name: true } }, quiz: { select: { title: true } } },
  });

  // Data grafik (asli dari Neon DB): progress per modul & distribusi nilai kuis.
  const [modulesWithProgress, allAttempts] = await Promise.all([
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
        progresses: { where: { user: { schoolId: user.schoolId, deletedAt: null } } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.quizAttempt.findMany({
      where: { status: "COMPLETED", user: { schoolId: user.schoolId, role: "MURID" } },
      select: { score: true, passed: true },
    }),
  ]);

  // Rata-rata progress penyelesaian per modul (0–100).
  const moduleProgressData = modulesWithProgress.map((m) => {
    const total = m.progresses.length;
    const avg = total
      ? Math.round(m.progresses.reduce((a, p) => a + p.progress, 0) / total)
      : 0;
    return {
      label: m.title.length > 24 ? `${m.title.slice(0, 24)}…` : m.title,
      value: avg,
    };
  });

  const totalAttempts = allAttempts.length;
  const passedAttempts = allAttempts.filter((a) => a.passed).length;
  const avgAttemptScore = totalAttempts
    ? Math.round(allAttempts.reduce((a, x) => a + (x.score ?? 0), 0) / totalAttempts)
    : 0;

  const stats = [
    { label: "Murid", value: murid, icon: Users, href: "/dashboard/guru/murid" },
    { label: "Modul Tersedia", value: modul, icon: BookOpen, href: "/dashboard/guru/modules" },
    { label: "Quiz Tersedia", value: quizzes, icon: ClipboardList, href: "/dashboard/guru/quiz" },
    { label: "Rata-rata Nilai", value: avgScore._avg.score ? Math.round(avgScore._avg.score) : "-", icon: GraduationCap, href: "/dashboard/guru/reports" },
  ];

  return (
    <div>
      <DashboardClock className="mb-4" />
      <DashboardWelcome
        role="GURU"
        name={user.name}
        schoolName={user.school?.name}
        schoolLevel={user.school?.educationLevel}
        subject={user.subject}
        logoUrl={user.school?.logoUrl}
        logoEmbedded={user.school?.logoEmbedded}
        description={
          user.school
            ? `Anda mengajar di ${user.school.name}. Pantau murid dan nilai pembelajaran lalu lintas dari sekolah Anda.`
            : "Pantau murid dan nilai pembelajaran lalu lintas di dashboard Anda."
        }
        actions={
          <Link href="/dashboard/guru/murid">
            <Button size="sm" className="bg-white text-blue-800 hover:bg-blue-50">
              Monitoring Murid
            </Button>
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Murid" value={stats[0].value} icon={stats[0].icon} href={stats[0].href} accent="blue" />
        <StatCard label="Modul Tersedia" value={stats[1].value} icon={stats[1].icon} href={stats[1].href} accent="emerald" />
        <StatCard label="Quiz Tersedia" value={stats[2].value} icon={stats[2].icon} href={stats[2].href} accent="purple" />
        <StatCard
          label="Rata-rata Nilai"
          value={stats[3].value}
          icon={stats[3].icon}
          href={stats[3].href}
          accent="amber"
          suffix={avgScore._avg.score ? "/100" : undefined}
        />
      </div>

      {/* Grafik statistik (data asli dari Neon DB) */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress Belajar per Modul</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBars data={moduleProgressData} valueName="Rata-rata progress" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kelulusan Kuis Murid</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown
              data={[
                { name: "Lulus", value: passedAttempts, color: "#10b981" },
                { name: "Belum Lulus", value: totalAttempts - passedAttempts, color: "#f59e0b" },
              ]}
              centerValue={`${totalAttempts ? Math.round((passedAttempts / totalAttempts) * 100) : 0}%`}
              centerLabel={`Rata-rata ${avgAttemptScore}`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-semibold">Nilai Terbaru Murid</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-160 text-sm">
            <thead className="whitespace-nowrap bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Murid</th>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Nilai</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentAttempts.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.user.name}</td>
                  <td className="px-4 py-3">{a.quiz.title}</td>
                  <td className="px-4 py-3 font-semibold">{a.score ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {a.passed ? "Lulus" : "Belum Lulus"}
                    </span>
                  </td>
                </tr>
              ))}
              {recentAttempts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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
