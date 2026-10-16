import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  GraduationCap,
  School,
  BookOpen,
  Shield,
  UserPlus,
  ArrowRight,
} from "lucide-react";

export const instant = false;

export default async function AdminDashboardPage() {
  const user = await requireRole("ADMIN");

  const [sekolah, totalGuru, totalMurid] = await Promise.all([
    prisma.school.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null, role: "MURID" } },
          },
        },
      },
    }),
    prisma.user.count({ where: { role: "GURU", deletedAt: null } }),
    prisma.user.count({ where: { role: "MURID", deletedAt: null } }),
  ]);

  const polisi = await prisma.user.findMany({
    where: { role: "POLISI", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, status: true, schoolId: true, createdAt: true },
  });

  const [totalModul, totalKuis, totalAttempts] = await Promise.all([
    prisma.module.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.quiz.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.quizAttempt.count({ where: { status: "COMPLETED", user: { role: "MURID" } } }),
  ]);

  const recentLogs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { actor: { select: { name: true, role: true } }, school: { select: { name: true } } },
  });

  // Hitung guru & murid per sekolah
  const countsBySchool = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    where: { deletedAt: null, schoolId: { not: null } },
    _count: { _all: true },
  });
  const schoolMap = new Map<string, { guru: number; murid: number }>();
  for (const row of countsBySchool) {
    if (!row.schoolId) continue;
    const cur = schoolMap.get(row.schoolId) ?? { guru: 0, murid: 0 };
    if (row.role === "GURU") cur.guru = row._count._all;
    if (row.role === "MURID") cur.murid = row._count._all;
    schoolMap.set(row.schoolId, cur);
  }

  return (
    <div>
      <DashboardWelcome
        role="ADMIN"
        name={user.name}
        description="Pantau sekolah, pengguna, modul, kuis, dan aktivitas pembelajaran EDULALIN."
        actions={
          <Link href="/dashboard/admin/users">
            <Button size="sm" className="bg-white text-blue-800 hover:bg-blue-50">
              + Kelola Pengguna
            </Button>
          </Link>
        }
      />

      {/* Ringkasan top */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sekolah" value={sekolah.length} icon={School} href="/dashboard/admin/schools" accent="blue" />
        <StatCard label="Total Guru" value={totalGuru} icon={UserPlus} href="/dashboard/admin/users" accent="emerald" />
        <StatCard label="Total Murid" value={totalMurid} icon={GraduationCap} href="/dashboard/admin/users?tab=murid" accent="purple" />
        <StatCard label="Modul Aktif" value={totalModul} icon={BookOpen} href="/dashboard/admin/modules" accent="amber" />
      </div>

      {/* Card Sekolah, Guru, Murid */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" /> Data Sekolah, Guru & Murid
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {sekolah.length} sekolah terdaftar • {totalGuru} guru • {totalMurid} murid
              </p>
            </div>
            <Link href="/dashboard/admin/schools">
              <Button size="sm" variant="outline">
                Kelola Sekolah <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sekolah.map((s) => {
              const c = schoolMap.get(s.id) ?? { guru: 0, murid: 0 };
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/admin/schools/${s.id}`}
                  className="rounded-xl border border-border p-4 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold leading-tight text-foreground">{s.name}</h3>
                    {s.status === "ACTIVE" ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{levelDisplayLabel(s.educationLevel)} • {s.city}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-blue-50 p-2 text-center">
                      <p className="text-lg font-bold text-blue-700">{c.guru}</p>
                      <p className="text-xs text-muted-foreground">Guru</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-center">
                      <p className="text-lg font-bold text-emerald-700">{c.murid}</p>
                      <p className="text-xs text-muted-foreground">Murid</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-primary">
                    Lihat detail sekolah →
                  </p>
                </Link>
              );
            })}
            {sekolah.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Belum ada sekolah terdaftar. Sekolah akan tercatat otomatis saat murid mendaftar.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Kepolisian */}
      <Card className="mt-6 border-slate-200 bg-slate-50">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-700" /> Data Kepolisian
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {polisi.length} akun kepolisian terdaftar — terpisah dari data sekolah.
              </p>
            </div>
            <Link href="/dashboard/admin/users?tab=polisi">
              <Button size="sm" variant="outline">
                Kelola Kepolisian <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {polisi.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Belum ada akun kepolisian. Buat melalui menu Kelola Pengguna.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {polisi.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.status === "ACTIVE" ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : p.status === "PENDING" ? (
                      <Badge variant="warning">Pending</Badge>
                    ) : (
                      <Badge variant="danger">Nonaktif</Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{p.email}</p>
                  <Link href={`/dashboard/admin/users?tab=polisi`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                    Lihat detail →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-4 font-semibold">Ringkasan Kuis</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">{totalKuis}</p>
                <p className="text-xs text-muted-foreground">Kuis Aktif</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">{totalAttempts}</p>
                <p className="text-xs text-muted-foreground">Selesai</p>
              </div>
              <Link href="/dashboard/admin/reports" className="rounded-lg bg-primary/10 p-3 transition-colors hover:bg-primary/20">
                <p className="text-sm font-medium text-primary">Laporan</p>
                <p className="text-xs text-muted-foreground">Selengkapnya →</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-4 font-semibold">Aktivitas Sistem Terbaru</h2>
            <ul className="space-y-3">
              {recentLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>
                      <span className="font-medium">{log.actor?.name ?? "Sistem"}</span>{" "}
                      <span className="text-muted-foreground">— {log.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.createdAt.toLocaleString("id-ID")}
                      {log.school ? ` • ${log.school.name}` : ""}
                    </p>
                  </div>
                </li>
              ))}
              {recentLogs.length === 0 && (
                <li className="text-sm text-muted-foreground">Belum ada aktivitas.</li>
              )}
            </ul>
            <Link href="/dashboard/admin/activity" className="mt-4 inline-block text-sm text-primary hover:underline">
              Lihat semua aktivitas
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
