import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getAge, LEVEL_LABEL, levelDisplayLabel, contentLevelsForMurid } from "@/lib/constants";
import { canAccessSim, listModulesForMurid } from "@/lib/module-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardList, GraduationCap, Trophy } from "lucide-react";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { StatCard } from "@/components/dashboard/stat-card";
import { SchoolLogo } from "@/components/school/school-logo";

export const instant = false;

export default async function MuridDashboardPage() {
  const user = await requireRole("MURID");

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

  const [modules, quizCount, bestScore, simAvailable] = await Promise.all([
    listModulesForMurid({
      userId: user.id,
      schoolId: user.schoolId,
      educationLevel: user.educationLevel ?? "SMA",
      classLevel: user.classLevel,
      birthDate: user.birthDate,
    }),
    prisma.quiz.count({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        AND: [
          {
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
          { educationLevel: { in: contentLevelsForMurid(user.educationLevel) } },
        ],
      },
    }),
    prisma.quizAttempt.findFirst({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { score: "desc" },
      select: { score: true },
    }),
    Promise.resolve(canAccessSim(user.birthDate)),
  ]);

  const completedModules = modules.filter((m) => m.progresses[0]?.completed).length;
  const totalProgress = modules.length
    ? Math.round(
        modules.reduce((acc, m) => acc + (m.progresses[0]?.progress ?? 0), 0) /
          modules.length
      )
    : 0;
  const age = user.birthDate ? getAge(user.birthDate) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-6 py-4 sm:flex-row sm:gap-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-primary">Selamat Datang, {user.name}!</h1>
        </div>
        <p className="text-xl font-bold text-primary">{formattedDateTime}</p>
      </div>
      {/* Sapaan */}
      <DashboardWelcome
        role="MURID"
        name={user.name}
        logoUrl={user.school?.logoUrl}
        description={`${user.school?.name ?? "Sekolah"} • ${user.educationLevel ? levelDisplayLabel(user.educationLevel) : "-"}${
          user.classLevel ? ` • Kelas ${user.classLevel}` : ""
        }${user.major ? ` • ${user.major}` : ""}${age != null ? ` • Usia ${age} tahun` : ""}`}
      />

      {user.school && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
          <SchoolLogo logoUrl={user.school.logoUrl} name={user.school.name} size="md" />
          <div>
            <p className="font-semibold">{user.school.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.educationLevel ? levelDisplayLabel(user.educationLevel) : "-"}
              {user.classLevel ? ` • Kelas ${user.classLevel}` : ""}
              {user.major ? ` • Jurusan ${user.major}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Statistik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Modul Tersedia" value={modules.length} icon={BookOpen} href="/dashboard/murid/materi" accent="blue" />
        <StatCard label="Modul Selesai" value={completedModules} icon={GraduationCap} href="/dashboard/murid/progress" accent="emerald" />
        <StatCard label="Quiz Tersedia" value={quizCount} icon={ClipboardList} href="/dashboard/murid/quiz" accent="purple" />
        <StatCard
          label="Nilai Terakhir"
          value={bestScore?.score ?? 0}
          icon={Trophy}
          href="/dashboard/murid/nilai"
          accent="amber"
          suffix="/100"
        />
      </div>

      {/* Progress belajar */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Belajar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span>Rata-rata penyelesaian modul</span>
            <span className="font-semibold">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="mt-2" />
        </CardContent>
      </Card>

      {/* Modul SIM status */}
      <Card>
        <CardHeader>
          <CardTitle>Kartu SIM</CardTitle>
        </CardHeader>
        <CardContent>
          {user.educationLevel === "SMA" || user.educationLevel === "SMK" || user.educationLevel === "SIM" ? (
            simAvailable ? (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4">
              <div>
                <p className="font-semibold text-amber-800">Modul SIM tersedia untuk Anda</p>
                <p className="text-sm text-amber-700">
                  Anda sudah berusia {age} tahun dan memenuhi syarat.
                </p>
              </div>
              <Link href="/dashboard/murid/materi#sim">
                <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600">Buka Materi SIM</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold">Belum tersedia — Modul SIM terbuka saat usia Anda mencapai 17 tahun.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {age != null && age < 17
                  ? `Anda masih berusia ${age} tahun. "Modul SIM tersedia setelah Anda berusia 17 tahun."`
                  : "Aturan usia minimum 17 tahun berlaku untuk akses modul SIM."}
              </p>
            </div>
          )
          ) : (
            <p className="text-sm text-muted-foreground">
              Modul SIM tersedia untuk murid SMA dan SMK yang telah berusia minimal 17 tahun.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modul terbaru */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modul Tersedia</h2>
          <Link href="/dashboard/murid/materi" className="text-sm text-primary hover:underline">Lihat semua</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.slice(0, 3).map((m) => {
            const prog = m.progresses[0];
            const simLocked = m.educationLevel === "SIM" && !simAvailable;
            return (
              <Card key={m.id} className={simLocked ? "border-amber-300 bg-amber-50/40" : "hover:shadow-md transition-shadow"}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <Badge variant={simLocked ? "warning" : "secondary"}>
                      {LEVEL_LABEL[m.educationLevel]}
                    </Badge>
                    {prog?.completed && <Badge variant="success">Selesai</Badge>}
                  </div>
                  <h3 className="mt-3 font-semibold line-clamp-1">{m.title}</h3>
                  {simLocked ? (
                    <p className="mt-1 text-sm text-amber-700">
                      Modul SIM tersedia setelah Anda berusia 17 tahun.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{prog?.progress ?? 0}%</span>
                        </div>
                        <Progress value={prog?.progress ?? 0} className="mt-1" />
                      </div>
                      <Link href={`/dashboard/murid/materi/${m.id}`} className="mt-4 block">
                        <Button variant="outline" size="sm" className="w-full">
                          {prog ? "Lanjut Belajar" : "Mulai Belajar"}
                        </Button>
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {modules.length === 0 && (
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-muted-foreground">Belum ada modul untuk jenjang Anda.</p>
                <Link href="/dashboard/murid/progress" className="mt-2 block text-sm text-primary hover:underline">Lihat progress</Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
