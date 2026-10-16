"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

/** Tandai satu notifikasi sudah dibaca (hanya pemiliknya). */
export async function markNotificationRead(id: string) {
  const user = await requireRole("GURU", "POLISI", "ADMIN");
  await prisma.notification.updateMany({
    where: { id, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

/** Tandai semua notifikasi milik user sudah dibaca. */
export async function markAllNotificationsRead() {
  const user = await requireRole("GURU", "POLISI", "ADMIN");
  await prisma.notification.updateMany({
    where: { recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}
