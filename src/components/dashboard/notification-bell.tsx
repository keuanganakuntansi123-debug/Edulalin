"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2, Trash2, X, Mail, Phone, Calendar, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateContactMessageStatus,
  deleteContactMessage,
} from "@/app/actions/content-actions";
import type { ContactMessageStatus } from "@/generated/prisma/client";

type NotifMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
};

const POLL_MS = 15000;

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState<NotifMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NotifMessage | null>(null);

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
      setDetail((prev) => {
        if (!prev) return prev;
        const updated = (data.messages ?? []).find((m: NotifMessage) => m.id === prev.id);
        return updated ?? prev;
      });
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
      setMessages((prev) => prev.map((x) => (x.id === msg.id ? { ...x, status: "READ" } : x)));
      setDetail((prev) => (prev && prev.id === msg.id ? { ...prev, status: "READ" } : prev));
      await refresh();
    } catch {
      // abaikan — polling berikutnya akan menyinkronkan kembali
    } finally {
      setUpdatingId(null);
    }
  };

  const remove = async (msg: NotifMessage) => {
    if (!window.confirm("Hapus pesan ini?")) return;
    setUpdatingId(msg.id);
    try {
      await deleteContactMessage(msg.id);
      setMessages((prev) => prev.filter((x) => x.id !== msg.id));
      setDetail((prev) => (prev && prev.id === msg.id ? null : prev));
      await refresh();
    } catch {
      // abaikan
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetail = (m: NotifMessage) => {
    setDetail(m);
    if (m.status === "NEW") void markRead(m);
  };

  const close = () => {
    setOpen(false);
    setDetail(null);
  };

  const formatFull = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
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
        <div className="absolute right-0 top-12 z-50 flex max-h-[80vh] w-[26rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:w-[30rem]">
          {detail ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetail(null)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-label="Kembali ke daftar notifikasi"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="text-sm font-semibold text-white">Detail Pesan</p>
                </div>
                <button
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold text-white">{detail.name}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      detail.status === "NEW"
                        ? "bg-red-500/20 text-red-300"
                        : detail.status === "READ"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                    )}
                  >
                    {detail.status === "NEW" ? "Baru" : detail.status === "READ" ? "Dibaca" : "Selesai"}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <p className="flex items-start gap-2 text-slate-300">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <span className="break-all">{detail.email}</span>
                  </p>
                  {detail.phone && (
                    <p className="flex items-start gap-2 text-slate-300">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <span>{detail.phone}</span>
                    </p>
                  )}
                  <p className="flex items-start gap-2 text-slate-300">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <span>{formatFull(detail.createdAt)}</span>
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subjek</p>
                  <p className="mt-1 text-sm font-medium text-white">{detail.subject}</p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Isi Pesan</p>
                  <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-800/60 p-3 text-sm leading-relaxed text-slate-200">
                    {detail.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-800 px-4 py-3">
                {detail.status === "NEW" && (
                  <button
                    type="button"
                    onClick={() => markRead(detail)}
                    disabled={updatingId === detail.id}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-60"
                  >
                    {updatingId === detail.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Tandai Dibaca
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(detail)}
                  disabled={updatingId === detail.id}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  {updatingId === detail.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Hapus Pesan
                </button>
              </div>
            </>
          ) : (
            <>
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
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {error ? (
                  <div className="px-4 py-8 text-center text-sm text-red-300">{error}</div>
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
                      onClick={() => openDetail(m)}
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
                        <span className="truncate text-[11px] text-slate-500">
                          {m.email}
                          {m.phone ? ` • ${m.phone}` : ""}
                        </span>
                        {m.status === "NEW" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400">
                            <Check className="h-3.5 w-3.5" /> Buka untuk membaca
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2.5">
                <Link
                  href="/dashboard/admin/content"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  Buka Kelola Konten Website →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
