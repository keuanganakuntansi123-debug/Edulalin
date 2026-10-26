"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, KeyRound, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notification-actions";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_MS = 15000;
const REQUEST_TYPE = "PASSWORD_RESET_REQUEST";

/**
 * Lonceng notifikasi Admin untuk pengajuan lupa password.
 * Hanya menampilkan notifikasi bertipe PASSWORD_RESET_REQUEST.
 */
export function PasswordRequestBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: Notif[] = Array.isArray(data.notifications) ? data.notifications : [];
      setItems(list.filter((n) => n.type === REQUEST_TYPE));
    } catch {
      // polling berikutnya akan mencoba lagi
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [refresh]);

  const unread = items.filter((n) => !n.readAt).length;

  const markRead = async (n: Notif) => {
    if (n.readAt) return;
    await markNotificationRead(n.id);
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
    );
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? now })));
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800"
        aria-label="Notifikasi pengajuan lupa password"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Pengajuan Lupa Password</p>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tandai dibaca
              </button>
            )}
          </div>
          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {loading ? (
              <p className="py-4 text-center text-sm text-slate-400">Memuat...</p>
            ) : items.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada pengajuan.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void markRead(n)}
                  className={cn(
                    "block w-full rounded-lg border p-2.5 text-left transition-colors",
                    n.readAt
                      ? "border-slate-800 bg-slate-900/60"
                      : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                  )}
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-white">
                    <KeyRound className="h-3.5 w-3.5 text-amber-400" /> {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{n.body}</p>
                  <Link
                    href={n.link ?? "/dashboard/admin/password-requests"}
                    className="mt-1 inline-block text-xs font-medium text-sky-400 hover:underline"
                  >
                    Buka Kelola Lupa Password
                  </Link>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
