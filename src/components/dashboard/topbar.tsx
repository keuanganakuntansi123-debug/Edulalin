"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Bell, ChevronDown, LogOut, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth-actions";
import { getRoleLabel } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";
import { EdulalinLogo } from "@/components/brand/edulalin-logo";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { UserAvatar } from "@/components/dashboard/user-avatar";

export function Topbar({
  role,
  name,
  avatarUrl,
  onMenuClick,
}: {
  role: Role;
  name: string;
  avatarUrl?: string | null;
  onMenuClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenuClick}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800 lg:hidden"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <EdulalinLogo size="sm" variant="light" showText={false} />
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">EDU<span className="text-sky-400">LALIN</span></span>
          <span className="hidden text-[10px] text-slate-400 sm:block">Edukasi Lalu Lintas</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Notifikasi — Admin: pesan kontak real-time; role lain: placeholder */}
        {role === "ADMIN" ? (
          <NotificationBell />
        ) : (
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setOpen(false);
              }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
                <p className="text-sm font-semibold text-white">Notifikasi</p>
                <p className="mt-2 text-sm text-slate-400">Belum ada notifikasi baru.</p>
              </div>
            )}
          </div>
        )}

        {/* Profil */}
        <div className="relative">
          <button
            onClick={() => {
              setOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-slate-800"
          >
            <UserAvatar src={avatarUrl} name={name} className="h-8 w-8" />
            <div className="hidden text-left sm:block">
              <p className="max-w-40 truncate text-sm font-medium text-white">{name}</p>
              <p className="text-xs text-slate-400">{getRoleLabel(role)}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {open && (
            <div className="absolute right-0 top-12 w-56 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
              <Link
                href={role === "ADMIN" ? "/dashboard/admin/settings" : "/dashboard/profil"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <User className="h-4 w-4" /> Profil & Pengaturan
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}