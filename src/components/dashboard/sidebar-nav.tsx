"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Archive,
  BarChart3,
  Activity,
  School,
  Settings,
  Globe,
  ClipboardList,
  Newspaper,
  GraduationCap,
  BookMarked,
  Trophy,
  Eye,
  ChevronRight,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV: Record<Role, { section: string; items: NavItem[] }[]> = {
  ADMIN: [
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/admin/modules", label: "Kelola Modul", icon: BookOpen },
        { href: "/dashboard/admin/quizzes", label: "Kelola Kuis", icon: ClipboardList },
        { href: "/dashboard/admin/berita", label: "Berita & Edukasi", icon: Newspaper },
        { href: "/dashboard/admin/users", label: "Kelola Pengguna", icon: Users },
        { href: "/dashboard/admin/archived", label: "Pengguna Terhapus", icon: Archive },
        { href: "/dashboard/admin/reports", label: "Laporan & Statistik", icon: BarChart3 },
        { href: "/dashboard/admin/activity", label: "Aktivitas Sistem", icon: Activity },
        { href: "/dashboard/admin/schools", label: "Sekolah", icon: School },
        { href: "/dashboard/admin/content", label: "Kelola Konten Website", icon: Globe },
      ],
    },
    {
      section: "Akun",
      items: [{ href: "/dashboard/admin/settings", label: "Profil & Pengaturan", icon: Settings }],
    },
  ],
  GURU: [
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard/guru", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/guru/modules", label: "Kelola Modul", icon: BookOpen },
        { href: "/dashboard/guru/murid", label: "Monitoring Murid", icon: Users },
        { href: "/dashboard/guru/quiz", label: "Kelola Kuis", icon: ClipboardList },
        { href: "/dashboard/guru/reports", label: "Laporan", icon: BarChart3 },
      ],
    },
    {
      section: "Akun",
      items: [{ href: "/dashboard/profil", label: "Profil & Pengaturan", icon: Settings }],
    },
  ],
  POLISI: [
    {
      section: "Pemantauan",
      items: [
        { href: "/dashboard/polisi", label: "Dashboard Pemantauan", icon: LayoutDashboard },
        { href: "/dashboard/polisi/sekolah", label: "Daftar Sekolah", icon: School },
        { href: "/dashboard/polisi/murid", label: "Jumlah Murid", icon: Users },
        { href: "/dashboard/polisi/modul", label: "Kelola Modul", icon: BookOpen },
        { href: "/dashboard/polisi/kuis", label: "Pemantauan Kuis Murid", icon: Eye },
        { href: "/dashboard/polisi/statistik", label: "Ringkasan Statistik", icon: BarChart3 },
      ],
    },
    {
      section: "Akun",
      items: [{ href: "/dashboard/profil", label: "Profil & Pengaturan", icon: Settings }],
    },
  ],
  MURID: [
    {
      section: "Belajar",
      items: [
        { href: "/dashboard/murid", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/murid/materi", label: "Kelola Modul", icon: BookMarked },
        { href: "/dashboard/murid/quiz", label: "Kelola Kuis", icon: ClipboardList },
        { href: "/dashboard/murid/progress", label: "Progress", icon: GraduationCap },
        { href: "/dashboard/murid/nilai", label: "Nilai", icon: Trophy },
      ],
    },
    {
      section: "Akun",
      items: [{ href: "/dashboard/profil", label: "Profil & Pengaturan", icon: Settings }],
    },
  ],
};

export function SidebarNav({
  role,
  pathname,
  onNavigate,
}: {
  role: Role;
  pathname?: string;
  onNavigate?: () => void;
}) {
  // Gunakan usePathname (reaktif terhadap navigasi client) agar indikator
  // menu aktif selalu akurat setelah berpindah halaman maupun setelah refresh.
  // Prop `pathname` hanya dipakai sebagai fallback (mis. dari server layout).
  const currentPath = usePathname() ?? "";
  // Prioritas: path reaktif dari client (akurat saat navigasi), lalu prop server.
  const resolvedPathname = currentPath || pathname || "";

  const groups = NAV[role];
  const allItems = groups.flatMap((g) => g.items);

  // Halaman berbagi antar role (Profil & Pengaturan) memetakan ke menu kanonik.
  // Contoh: /dashboard/murid/profil & /dashboard/profil -> menu "Profil & Pengaturan",
  // /dashboard/settings -> menu admin "Profil & Pengaturan" (/dashboard/admin/settings).
  const profileMenu = role === "ADMIN" ? "/dashboard/admin/settings" : "/dashboard/profil";
  const canonicalByPath = new Map<string, string>(allItems.map((i) => [i.href, i.href]));
  canonicalByPath.set("/dashboard/murid/profil", profileMenu);
  canonicalByPath.set("/dashboard/settings", profileMenu);

  // Hanya satu menu aktif: pilih pathname terpanjang yang cocok, lalu petakan
  // ke href menu kanonik agar tidak ada menu aktif ganda.
  const matched = [...canonicalByPath.keys()]
    .filter((href) => resolvedPathname === href || resolvedPathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const activeHref = matched ? (canonicalByPath.get(matched) ?? matched) : null;
  const isActive = (href: string) => activeHref === href;

  return (
    <nav className="flex flex-1 flex-col space-y-6 overflow-y-auto px-3 py-4">
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.section}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-linear-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/25"
                          : "text-slate-300 hover:translate-x-0.5 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-white"
                            : "text-slate-400 group-hover:text-sky-400"
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-all duration-200",
                          active
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-40"
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

    </nav>
  );
}

export { NAV };