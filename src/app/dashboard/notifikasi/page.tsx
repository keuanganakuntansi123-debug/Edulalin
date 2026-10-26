import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { NotificationHistory } from "./notification-history";
import type { Notif } from "@/components/dashboard/notification-center";
import { Bell } from "lucide-react";

export const instant = false;

/**
 * Riwayat notifikasi untuk semua aktor (Admin, Guru, Polisi, Murid).
 * Menampilkan jumlah belum dibaca, status baca, dan riwayat lengkap.
 */
export default async function NotificationHistoryPage() {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { recipientId: user.id, readAt: null } }),
  ]);

  const initial: Notif[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Bell className="h-6 w-6 text-primary" /> Riwayat Notifikasi
      </h1>
      <p className="mt-1 text-muted-foreground">
        Seluruh pemberitahuan aktivitas akun Anda — {unread > 0 ? `${unread} belum dibaca` : "semua sudah dibaca"}.
      </p>

      <div className="mt-5">
        <NotificationHistory initial={initial} unread={unread} />
      </div>
    </div>
  );
}
