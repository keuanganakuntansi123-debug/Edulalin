"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

/** Tandai satu notifikasi sudah dibaca (hanya pemiliknya). */
export async function markNotificationRead(id: string) {
  const user = await requireRole("GURU", "POLISI", "ADMIN", "MURID");
  await prisma.notification.updateMany({
    where: { id, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

/** Tandai semua notifikasi milik user sudah dibaca. */
export async function markAllNotificationsRead() {
  const user = await requireRole("GURU", "POLISI", "ADMIN", "MURID");
  await prisma.notification.updateMany({
    where: { recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

/** Hapus satu notifikasi milik sendiri. */
export async function deleteNotification(id: string) {
  const user = await requireRole("GURU", "POLISI", "ADMIN", "MURID");
  await prisma.notification.deleteMany({ where: { id, recipientId: user.id } });
  return { ok: true };
}

/** Hapus semua notifikasi yang sudah dibaca milik sendiri. */
export async function clearReadNotifications() {
  const user = await requireRole("GURU", "POLISI", "ADMIN", "MURID");
  await prisma.notification.deleteMany({
    where: { recipientId: user.id, readAt: { not: null } },
  });
  return { ok: true };
}
