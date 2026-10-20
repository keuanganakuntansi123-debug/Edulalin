import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, ClipboardList, GraduationCap } from "lucide-react";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { StatCard } from "@/components/dashboard/stat-card";

export const instant = false;

export default async function GuruDashboardPage() {
  const user = await requireRole("GURU");

  // Fetch current date and time in WIB
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  };
  const formattedDateTime = now.toLocaleString("id-ID", options);

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

  const stats = [
    { label: "Murid", value: murid, icon: Users, href: "/dashboard/guru/murid" },
    { label: "Modul Tersedia", value: modul, icon: BookOpen, href: "/dashboard/guru/modules" },
    { label: "Quiz Tersedia", value: quizzes, icon: ClipboardList, href: "/dashboard/guru/quiz" },
    { label: "Rata-rata Nilai", value: avgScore._avg.score ? Math.round(avgScore._avg.score) : "-", icon: GraduationCap, href: "/dashboard/guru/reports" },
  ];

  return (
    <div>
      <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-6 py-4 sm:flex-row sm:gap-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-primary">Selamat Datang, {user.name}!</h1>
        </div>
        <p className="text-xl font-bold text-primary">{formattedDateTime}</p>
      </div>
      <DashboardWelcome
        role="GURU"
        name={user.name}
        schoolName={user.school?.name}
        schoolLevel={user.school?.educationLevel}
        subject={user.subject}
        logoUrl={user.school?.logoUrl}
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

      <div className="mt-8">
        <h2 className="mb-3 font-semibold">Nilai Terbaru Murid</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
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
