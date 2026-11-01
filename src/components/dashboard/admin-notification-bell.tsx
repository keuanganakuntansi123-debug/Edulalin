"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Loader2,
  Trash2,
  X,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  MessagesSquare,
  KeyRound,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateContactMessageStatus,
  deleteContactMessage,
} from "@/app/actions/content-actions";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/actions/notification-actions";
import { formatWibShort, type Notif } from "@/components/dashboard/notification-center";
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

type CategoryId = "all" | "messages" | "reports";

const POLL_MS = 15000;
/** Notifikasi yang dikategorikan sebagai "Laporan Reset Password". */
const RESET_TYPES = "PASSWORD_RESET_REQUEST";

/**
 * Satu lonceng notifikasi Admin terpadu dengan dua kategori:
 *  - Pesan Publik (pesan dari formulir Kontak).
 *  - Laporan Reset Password (pengajuan lupa password dari pengguna).
 *
 * Menampilkan detail pesan, pengirim, waktu, status dibaca/belum dibaca, serta
 * jumlah notifikasi per kategori secara real-time (polling 15 detik).
 */
export function AdminNotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CategoryId>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<NotifMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [reports, setReports] = useState<Notif[]>([]);
  const [unreadReports, setUnreadReports] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NotifMessage | null>(null);

  const load = useCallback(async () => {
    try {
      const [msgRes, notifRes] = await Promise.all([
        fetch("/api/contact/notifications?limit=20", { cache: "no-store" }),
        fetch(`/api/notifications?limit=20&type=${RESET_TYPES}`, { cache: "no-store" }),
      ]);
      if (!msgRes.ok || !notifRes.ok) {
        setError("Gagal memuat notifikasi");
        return;
      }
      const msgData = await msgRes.json();
      const notifData = await notifRes.json();
      setMessages(Array.isArray(msgData.messages) ? msgData.messages : []);
      setUnreadMessages(Number(msgData.unread) || 0);
      setReports(Array.isArray(notifData.notifications) ? notifData.notifications : []);
      setUnreadReports(Number(notifData.unread) || 0);
      setDetail((prev) => {
        if (!prev) return prev;
        const updated = (msgData.messages ?? []).find((m: NotifMessage) => m.id === prev.id);
        return updated ?? prev;
      });
      setError(null);
    } catch {
      setError("Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat saat dibuka + polling berkala (hanya saat panel terbuka agar hemat).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await load();
    };
    const t = window.setTimeout(() => void run(), 0);
    const id = window.setInterval(() => void run(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [open, load]);

  const totalUnread = unreadMessages + unreadReports;

  /* ---------- Aksi Pesan Publik ---------- */

  const markMessageRead = async (msg: NotifMessage) => {
    if (msg.status === "READ" || msg.status === "DONE") return;
    setUpdatingId(msg.id);
    try {
      await updateContactMessageStatus(msg.id, "READ");
      setMessages((prev) => prev.map((x) => (x.id === msg.id ? { ...x, status: "READ" } : x)));
      setDetail((prev) => (prev && prev.id === msg.id ? { ...prev, status: "READ" } : prev));
      setUnreadMessages((v) => Math.max(0, v - 1));
      await load();
    } catch {
      // polling berikutnya menyinkronkan kembali
    } finally {
      setUpdatingId(null);
    }
  };

  const removeMessage = async (msg: NotifMessage) => {
    if (!window.confirm("Hapus pesan ini?")) return;
    setUpdatingId(msg.id);
    try {
      await deleteContactMessage(msg.id);
      setMessages((prev) => prev.filter((x) => x.id !== msg.id));
      setDetail((prev) => (prev && prev.id === msg.id ? null : prev));
      if (msg.status === "NEW") setUnreadMessages((v) => Math.max(0, v - 1));
      await load();
    } catch {
      // abaikan
    } finally {
      setUpdatingId(null);
    }
  };

  const openMessageDetail = (m: NotifMessage) => {
    setDetail(m);
    if (m.status === "NEW") void markMessageRead(m);
  };

  /* ---------- Aksi Laporan Reset Password ---------- */

  const markReportRead = async (n: Notif) => {
    if (n.readAt) return;
    await markNotificationRead(n.id);
    setReports((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
    );
    setUnreadReports((v) => Math.max(0, v - 1));
  };

  const markAllRead = async () => {
    if (unreadReports > 0) {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setReports((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? now })));
      setUnreadReports(0);
    }
    // Pesan publik dibaca satu per satu lewat detail (kategori berbeda).
  };

  const close = () => {
    setOpen(false);
    setDetail(null);
    setTab("all");
  };

  const formatFull = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const categories: { id: CategoryId; label: string; icon: typeof Bell; count: number }[] = [
    { id: "all", label: "Semua", icon: Bell, count: totalUnread },
    { id: "messages", label: "Pesan Publik", icon: MessagesSquare, count: unreadMessages },
    { id: "reports", label: "Laporan Reset Password", icon: KeyRound, count: unreadReports },
  ];

  const showMessages = tab === "all" || tab === "messages";
  const showReports = tab === "all" || tab === "reports";

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800"
        aria-label="Notifikasi Admin"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
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
                  <p className="text-sm font-semibold text-white">Detail Pesan Publik</p>
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
                    onClick={() => markMessageRead(detail)}
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
                  onClick={() => removeMessage(detail)}
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
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Notifikasi Admin</p>
                  <p className="text-[11px] text-slate-400">
                    {totalUnread > 0 ? `${totalUnread} belum dibaca` : "Tidak ada notifikasi baru"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {unreadReports > 0 && (
                    <button
                      onClick={markAllRead}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sky-400 hover:bg-slate-800"
                      title="Tandai semua laporan reset password sudah dibaca"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Tandai semua
                    </button>
                  )}
                  <button
                    onClick={close}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-label="Tutup notifikasi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Kategori */}
              <div className="flex gap-1 border-b border-slate-800 px-2 py-2">
                {categories.map((c) => {
                  const Icon = c.icon;
                  const active = tab === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setTab(c.id)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                        active
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{c.label}</span>
                      {c.count > 0 && (
                        <span
                          className={cn(
                            "ml-0.5 rounded-full px-1.5 text-[10px] font-bold",
                            c.id === "reports"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-red-500/20 text-red-300"
                          )}
                        >
                          {c.count > 99 ? "99+" : c.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {error ? (
                  <div className="px-4 py-8 text-center text-sm text-red-300">{error}</div>
                ) : loading && messages.length === 0 && reports.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
                  </div>
                ) : (
                  <>
                    {/* Kategori: Laporan Reset Password */}
                    {showReports && (
                      <div>
                        <p className="flex items-center gap-1.5 bg-slate-800/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          <KeyRound className="h-3.5 w-3.5" /> Laporan Reset Password
                        </p>
                        {reports.length === 0 ? (
                          <p className="px-4 py-4 text-center text-sm text-slate-500">
                            Belum ada pengajuan reset password.
                          </p>
                        ) : (
                          reports.map((n) => (
                            <Link
                              key={n.id}
                              href={n.link ?? "/dashboard/admin/password-requests"}
                              onClick={() => {
                                void markReportRead(n);
                                close();
                                router.refresh();
                              }}
                              className={cn(
                                "group block border-b border-slate-800/70 px-4 py-3 transition-colors hover:bg-slate-800/60",
                                !n.readAt && "bg-amber-950/30"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-900/50 text-amber-300">
                                  <KeyRound className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-semibold text-white">
                                      {!n.readAt && (
                                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" />
                                      )}
                                      {n.title}
                                    </p>
                                    <span className="shrink-0 text-[10px] text-slate-500">
                                      {formatWibShort(n.createdAt)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.body}</p>
                                  <p className="mt-1 text-[10px] font-medium text-amber-300/90">
                                    {n.readAt ? "Sudah dibaca" : "Belum dibaca"} • Buka untuk proses
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    )}

                    {/* Kategori: Pesan Publik */}
                    {showMessages && (
                      <div>
                        <p className="flex items-center gap-1.5 bg-slate-800/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          <MessagesSquare className="h-3.5 w-3.5" /> Pesan Publik
                        </p>
                        {messages.length === 0 ? (
                          <p className="px-4 py-4 text-center text-sm text-slate-500">
                            Belum ada pesan kontak masuk.
                          </p>
                        ) : (
                          messages.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => openMessageDetail(m)}
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
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2.5">
                <Link
                  href="/dashboard/admin/content"
                  onClick={close}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  Kelola Konten Website →
                </Link>
                <Link
                  href="/dashboard/admin/password-requests"
                  onClick={close}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                >
                  Kelola Lupa Password →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
