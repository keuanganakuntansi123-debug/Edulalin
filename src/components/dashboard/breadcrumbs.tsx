"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  admin: "Admin",
  guru: "Guru",
  polisi: "Polisi",
  murid: "Murid",
  modules: "Kelola Modul",
  quizzes: "Kelola Kuis",
  users: "Kelola Pengguna",
  archived: "Pengguna Terhapus",
  reports: "Laporan & Statistik",
  activity: "Aktivitas Sistem",
  schools: "Sekolah",
  settings: "Pengaturan",
  materi: "Kelola Modul",
  quiz: "Kelola Kuis",
  progress: "Progress",
  nilai: "Nilai",
  profil: "Profil",
  modul: "Kelola Modul",
  kuis: "Kuis Murid",
  sekolah: "Daftar Sekolah",
  statistik: "Ringkasan Statistik",
  monitoring: "Monitoring",
};

export function Breadcrumbs({ pathname }: { pathname?: string }) {
  const fromHook = usePathname();
  const path = pathname ?? fromHook;
  const segments = path.split("/").filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = LABELS[seg] ?? seg;
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-primary">Beranda</Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {c.isLast ? (
            <span className="font-medium text-foreground">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-primary">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}