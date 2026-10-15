import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { School, Users, BookOpen, ClipboardList } from "lucide-react";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { StatCard } from "@/components/dashboard/stat-card";

export const instant = false;

export default async function PolisiDashboardPage() {
  const user = await requireRole("POLISI");

  const [sekolah, murid, modul, kuis] = await Promise.all([
    prisma.school.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "MURID", deletedAt: null, status: "ACTIVE" } }),
    prisma.module.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.quiz.count({ where: { deletedAt: null, status: "ACTIVE" } }),
  ]);

  const stats = [
    { label: "Sekolah Terdaftar", value: sekolah, icon: School, href: "/dashboard/polisi/sekolah" },
    { label: "Total Murid", value: murid, icon: Users, href: "/dashboard/polisi/murid" },
    { label: "Modul Aktif", value: modul, icon: BookOpen, href: "/dashboard/polisi/modul" },
    { label: "Quiz Aktif", value: kuis, icon: ClipboardList, href: "/dashboard/polisi/kuis" },
  ];

  return (
    <div>
      <DashboardWelcome
        role="POLISI"
        name={user.name}
        description="Pantau edukasi keselamatan lalu lintas di seluruh sekolah mitra EDULALIN."
        actions={
          <Link href="/dashboard/polisi/statistik">
            <Button size="sm" className="bg-white text-blue-800 hover:bg-blue-50">
              Ringkasan Statistik
            </Button>
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sekolah Terdaftar" value={stats[0].value} icon={stats[0].icon} href={stats[0].href} accent="blue" />
        <StatCard label="Total Murid" value={stats[1].value} icon={stats[1].icon} href={stats[1].href} accent="emerald" />
        <StatCard label="Modul Aktif" value={stats[2].value} icon={stats[2].icon} href={stats[2].href} accent="purple" />
        <StatCard label="Quiz Aktif" value={stats[3].value} icon={stats[3].icon} href={stats[3].href} accent="amber" />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Gunakan menu di samping untuk memantau daftar sekolah, jumlah murid, penggunaan modul, dan hasil kuis demi edukasi keselamatan lalu lintas.
      </p>
    </div>
  );
}
