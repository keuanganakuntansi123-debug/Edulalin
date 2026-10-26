"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  KeyRound,
  ShieldCheck,
  BookOpen,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/app/actions/notification-actions";

export type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

type TypeMeta = { icon: LucideIcon; accent: string; iconBg: string; label: string };

const TYPE_META: Record<string, TypeMeta> = {
  MODULE_NEW: {
    icon: BookOpen,
    accent: "text-sky-400",
    iconBg: "bg-sky-900/60 text-sky-300",
    label: "Modul Baru",
  },
  PASSWORD_RESET_REQUEST: {
    icon: KeyRound,
    accent: "text-amber-400",
    iconBg: "bg-amber-900/50 text-amber-300",
    label: "Pengajuan Lupa Password",
  },
  PASSWORD_CHANGED: {
    icon: ShieldCheck,
    accent: "text-emerald-400",
    iconBg: "bg-emerald-900/50 text-emerald-300",
    label: "Password Diperbarui",
  },
  QUIZ_RESULT: {
    icon: ClipboardList,
    accent: "text-sky-400",
    iconBg: "bg-sky-900/60 text-sky-300",
    label: "Hasil Kuis",
  },
};

const DEFAULT_META: TypeMeta = {
  icon: Bell,
  accent: "text-slate-300",
  iconBg: "bg-slate-800 text-slate-300",
  label: "Notifikasi",
};

export function notificationMeta(type: string): TypeMeta {
  return TYPE_META[type] ?? DEFAULT_META;
}

/** Format tanggal & jam zona WIB (Asia/Jakarta) di sisi klien. */
export function formatWibShort(iso: string): string {
  try {
    const value = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso));
    return `${value} WIB`;
  } catch {
    return iso;
  }
}

const POLL_MS = 15000;

/**
 * Lonceng notifikasi terpadu untuk SEMUA aktor (Admin, Guru, Polisi, Murid).
 * Menampilkan jumlah belum dibaca, status sudah/belum dibaca, dan aksi
 * tandai-baca/hapus. Data selalu diambil dari `/api/notifications` sehingga
 * tersinkronisasi real-time antar peran.
 */
export function NotificationCenter({
  className,
  title = "Notifikasi",
  types,
  limit = 15,
}: {
  className?: string;
  title?: string;
  types?: string[];
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const query = new URLSearchParams({ limit: String(limit) });
  if (types && types.length) query.set("type", types.join(","));
  const queryString = query.toString();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?${queryString}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(Number(data.unread) || 0);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // polling berikutnya akan mencoba lagi
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [refresh]);

  const markRead = async (n: Notif) => {
    if (n.readAt) return;
    await markNotificationRead(n.id);
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
    );
    setUnread((v) => Math.max(0, v - 1));
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? now })));
    setUnread(0);
  };

  const remove = async (n: Notif) => {
    await deleteNotification(n.id);
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.readAt) setUnread((v) => Math.max(0, v - 1));
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800"
        aria-label={title}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 flex max-h-[80vh] w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-[11px] text-slate-400">
                {unread > 0 ? `${unread} belum dibaca` : "Tidak ada notifikasi baru"}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sky-400 hover:bg-slate-800"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tandai semua
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-slate-400">Memuat...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">Belum ada notifikasi.</p>
            ) : (
              notifications.map((n) => {
                const meta = notificationMeta(n.type);
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group relative border-b border-slate-800 last:border-0",
                      !n.readAt && "bg-sky-950/40"
                    )}
                  >
                    <Link
                      href={n.link ?? "/dashboard"}
                      onClick={() => void markRead(n)}
                      className="block px-3 py-3 transition-colors hover:bg-slate-800/60"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            meta.iconBg
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 pr-6">
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.body}</p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {formatWibShort(n.createdAt)}
                          </p>
                        </div>
                        {!n.readAt && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => void remove(n)}
                      className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-700 hover:text-red-400 group-hover:flex"
                      aria-label="Hapus notifikasi"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
