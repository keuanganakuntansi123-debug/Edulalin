"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ClipboardList } from "lucide-react";
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

export function QuizNotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=15", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(Number(data.unread) || 0);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
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

  const markRead = async (n: Notif) => {
    if (n.readAt) return;
    await markNotificationRead(n.id);
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((v) => Math.max(0, v - 1));
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((x) => ({ ...x, readAt: now })));
    setUnread(0);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800"
        aria-label="Notifikasi hasil kuis"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 p-3">
            <p className="text-sm font-semibold text-white">Hasil Kuis Murid</p>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sky-400 hover:bg-slate-800"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-slate-400">Memuat...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">Belum ada notifikasi hasil kuis.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/dashboard"}
                  onClick={() => void markRead(n)}
                  className={cn(
                    "block border-b border-slate-800 px-3 py-3 transition-colors last:border-0 hover:bg-slate-800/60",
                    !n.readAt && "bg-sky-950/40"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-900/60 text-sky-300">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.body}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {new Date(n.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
