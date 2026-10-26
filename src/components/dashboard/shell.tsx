"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Topbar } from "@/components/dashboard/topbar";
import type { Role } from "@/generated/prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EdulalinLogo } from "@/components/brand/edulalin-logo";
import { getRoleLabel } from "@/lib/constants";
import { UserAvatar } from "@/components/dashboard/user-avatar";

export function DashboardShell({
  role,
  name,
  avatarUrl,
  pathname,
  children,
}: {
  role: Role;
  name: string;
  avatarUrl?: string | null;
  pathname: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tutup drawer dengan tombol Escape (aksesibilitas keyboard).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-slate-100/60">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 bg-slate-900/95 px-4">
          <Link href="/" className="group flex items-center gap-2">
            <EdulalinLogo size="sm" variant="light" showText={false} />
            <span className="leading-tight">
              <span className="block text-base font-extrabold text-white">
                EDU<span className="text-sky-400">LALIN</span>
              </span>
              <span className="block text-[10px] text-slate-400">Belajar Aman di Jalan</span>
            </span>
          </Link>
        </div>
        <SidebarNav role={role} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        {/* Info user di footer sidebar */}
        <div className="flex items-center gap-3 border-t border-slate-800 bg-slate-900/95 px-4 py-3">
          <UserAvatar src={avatarUrl} name={name} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-slate-400">{getRoleLabel(role)}</p>
          </div>
        </div>
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="animate-slide-in-left absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
              <div className="flex items-center gap-2">
                <EdulalinLogo size="sm" variant="light" showText={false} />
                <span>
                  <span className="text-base font-extrabold text-white">
                    EDU<span className="text-sky-400">LALIN</span>
                  </span>
                  <span className="block text-[10px] text-slate-400">Belajar Aman di Jalan</span>
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800"
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav role={role} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <div className="flex items-center gap-3 border-t border-slate-800 px-4 py-3">
              <UserAvatar src={avatarUrl} name={name} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{name}</p>
                <p className="text-xs text-slate-400">{getRoleLabel(role)}</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Konten */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} name={name} avatarUrl={avatarUrl} onMenuClick={() => setMobileOpen(true)} />
        <main className={cn("flex-1 p-4 lg:p-6")}>{children}</main>
      </div>
    </div>
  );
}