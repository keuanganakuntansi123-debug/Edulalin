"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { sendMail, buildMailHtml, getMailStatus } from "@/lib/mail";
import { resendNotificationEmail } from "@/lib/notification-emails";
import { formatDateTimeWib } from "@/lib/format-wib";

/**
 * Aksi Admin untuk memantau & mengirim ulang email notifikasi.
 * Kredensial email tetap hanya di environment variable server — aksi ini tidak
 * pernah mengembalikan atau menerima password SMTP.
 */

export type ResendState = { ok: boolean; message: string };

/** Kirim ulang satu email berdasarkan riwayat log. */
export async function resendEmailLog(logId: string): Promise<ResendState> {
  const admin = await requireRole("ADMIN");
  const result = await resendNotificationEmail(logId, admin.id);
  return {
    ok: result.ok,
    message: result.ok
      ? "Email berhasil dikirim ulang."
      : `Gagal mengirim ulang: ${result.error ?? "kesalahan tidak diketahui"}`,
  };
}

/** Kirim ulang SEMUA email yang berstatus FAILED. */
export async function resendAllFailedEmails(): Promise<ResendState> {
  const admin = await requireRole("ADMIN");
  const failed = await prisma.notificationEmailLog.findMany({
    where: { status: "FAILED" },
    select: { id: true },
    take: 100,
  });
  if (failed.length === 0) return { ok: true, message: "Tidak ada email gagal untuk dikirim ulang." };

  let ok = 0;
  for (const item of failed) {
    const result = await resendNotificationEmail(item.id, admin.id);
    if (result.ok) ok++;
  }
  await logActivity({
    actorId: admin.id,
    action: "NOTIFICATION_EMAIL_RESEND_BULK",
    entity: "NOTIFICATION_EMAIL",
    metadata: { total: failed.length, ok },
  }).catch(() => undefined);

  return {
    ok: ok === failed.length,
    message: `${ok} dari ${failed.length} email berhasil dikirim ulang.`,
  };
}

/** Kirim email uji ke alamat Admin yang sedang login. */
export async function sendTestEmail(): Promise<ResendState> {
  const admin = await requireRole("ADMIN");
  const status = getMailStatus();
  if (!status.configured) {
    return {
      ok: false,
      message: `Konfigurasi email belum lengkap (${status.missing.join(", ")} kosong).`,
    };
  }

  const now = new Date();
  const result = await sendMail({
    to: admin.email,
    subject: "[EDULALIN] Email Uji Konfigurasi",
    text: `Email uji EDULALIN berhasil dikirim pada ${formatDateTimeWib(now)}.`,
    html: buildMailHtml({
      heading: "Email Uji Berhasil",
      intro: "Konfigurasi email EDULALIN aktif dan siap mengirim notifikasi.",
      rows: [
        { label: "Penerima", value: admin.email },
        { label: "Waktu", value: formatDateTimeWib(now) },
        { label: "Server SMTP", value: `${status.host}:${status.port}` },
      ],
      footer: "Bila Anda menerima email ini, notifikasi pengguna & Admin akan terkirim dengan baik.",
    }),
  });

  await logActivity({
    actorId: admin.id,
    action: result.ok ? "NOTIFICATION_EMAIL_TEST_SENT" : "NOTIFICATION_EMAIL_TEST_FAILED",
    entity: "NOTIFICATION_EMAIL",
    metadata: { to: admin.email, error: result.error ?? null },
  }).catch(() => undefined);

  return {
    ok: result.ok,
    message: result.ok
      ? `Email uji terkirim ke ${admin.email}.`
      : `Gagal mengirim email uji: ${result.error ?? "kesalahan tidak diketahui"}`,
  };
}
