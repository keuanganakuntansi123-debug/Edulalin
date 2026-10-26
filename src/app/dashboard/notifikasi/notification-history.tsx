"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellOff, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { notificationMeta, formatWibShort, type Notif } from "@/components/dashboard/notification-center";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
} from "@/app/actions/notification-actions";

const FILTERS = [
  { key: "ALL", label: "Semua" },
  { key: "UNREAD", label: "Belum Dibaca" },
  { key: "READ", label: "Sudah Dibaca" },
];

export function NotificationHistory({
  initial,
  unread: initialUnread,
}: {
  initial: Notif[];
  unread: number;
}) {
  const [items, setItems] = useState<Notif[]>(initial);
  const [filter, setFilter] = useState("ALL");
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // abaikan
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const unread = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

  const filtered = useMemo(() => {
    if (filter === "UNREAD") return items.filter((n) => !n.readAt);
    if (filter === "READ") return items.filter((n) => n.readAt);
    return items;
  }, [items, filter]);

  const markRead = async (n: Notif) => {
    if (n.readAt) return;
    try {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
      );
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat menandai notifikasi.", variant: "error" });
    }
  };

  const markAll = async () => {
    setPending(true);
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? now })));
      toast({ title: "Semua notifikasi ditandai dibaca", variant: "success" });
    } finally {
      setPending(false);
    }
  };

  const remove = async (n: Notif) => {
    try {
      await deleteNotification(n.id);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      toast({ title: "Notifikasi dihapus", variant: "success" });
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat menghapus notifikasi.", variant: "error" });
    }
  };

  const clearRead = async () => {
    if (!window.confirm("Hapus semua notifikasi yang sudah dibaca?")) return;
    setPending(true);
    try {
      await clearReadNotifications();
      setItems((prev) => prev.filter((x) => !x.readAt));
      toast({ title: "Notifikasi dibaca dibersihkan", variant: "success" });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {f.label}
              {f.key === "UNREAD" && unread > 0 && (
                <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAll} disabled={pending}>
              <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearRead} disabled={pending}>
            <Trash2 className="h-4 w-4" /> Bersihkan yang dibaca
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Tidak ada notifikasi</p>
            <p className="text-sm text-muted-foreground">
              {initialUnread > 0
                ? "Notifikasi baru akan muncul di sini."
                : "Semua aktivitas penting Anda akan tercatat di halaman ini."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => {
            const meta = notificationMeta(n.type);
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={cn(!n.readAt && "border-sky-500/40")}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      meta.iconBg
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{n.title}</p>
                      <Badge variant="outline">{meta.label}</Badge>
                      {!n.readAt && <Badge variant="success">Belum dibaca</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{formatWibShort(n.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                    {n.link && (
                      <Link href={n.link} onClick={() => void markRead(n)}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" /> Buka
                        </Button>
                      </Link>
                    )}
                    {!n.readAt && (
                      <Button variant="ghost" size="sm" onClick={() => void markRead(n)}>
                        <CheckCheck className="h-4 w-4" /> Dibaca
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => void remove(n)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
