"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateContactMessageStatus } from "@/app/actions/content-actions";
import type { ContactMessageStatus } from "@/generated/prisma/client";

type NotifMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
};

const POLL_MS = 15000;

/**
 * Lonceng notifikasi pesan kontak untuk Admin.
 * Mengambil jumlah & daftar pesan baru secara berkala dari API
 * `/api/contact/notifications` sehingga pesan dari halaman Kontak publik
 * muncul secara real-time (tanpa refresh).
 */
export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState<NotifMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/contact/notifications?limit=15", { cache: "no-store" });
      if (!res.ok) {
        setError("Gagal memuat notifikasi");
        return;
      }
      const data = await res.json();
      setUnread(Number(data.unread) || 0);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setError(null);
    } catch {
      setError("Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Muat data awal tanpa menunggu interval pertama (15 detik).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/contact/notifications?limit=15", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError("Gagal memuat notifikasi");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setUnread(Number(data.unread) || 0);
          setMessages(Array.isArray(data.messages) ? data.messages : []);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Gagal memuat notifikasi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = async (msg: NotifMessage) => {
    if (msg.status === "READ" || msg.status === "DONE") return;
    setUpdatingId(msg.id);
    try {
      await updateContactMessageStatus(msg.id, "READ");
      await refresh();
    } catch {
      // abaikan — polling berikutnya akan menyinkronkan kembali
    } finally {
      setUpdatingId(null);
    }
  };

  const openBell = () => {
    setOpen((v) => !v);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={openBell}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800"
        aria-label="Notifikasi pesan kontak"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Notifikasi Pesan Kontak
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">
                  {unread} baru
                </span>
              )}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <div className="px-4 py-8 text-center text-sm text-red-300">
                {error}
              </div>
            ) : loading && messages.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
              </div>
            ) : messages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Belum ada pesan kontak masuk.
              </div>
            ) : (
              messages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => markRead(m)}
                  className={cn(
                    "block w-full border-b border-slate-800/70 px-4 py-3 text-left transition-colors hover:bg-slate-800/60",
                    m.status === "NEW" ? "bg-blue-950/40" : ""
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {m.status === "NEW" && (
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />
                      )}
                      {m.name}
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {new Date(m.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-300">{m.subject}</p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-slate-400">
                    {m.message}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{m.email}</span>
                    {updatingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    ) : m.status === "NEW" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400">
                        <Check className="h-3.5 w-3.5" /> Tandai dibaca
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-800 px-4 py-2.5">
            <Link
              href="/dashboard/admin/content"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              Buka Kelola Konten Website →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
