import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import {
  sendMail,
  buildMailHtml,
  getMailStatus,
  type MailRow,
} from "@/lib/mail";
import { formatDateTimeWib } from "@/lib/format-wib";

/**
 * Email notifikasi transaksional EDULALIN.
 *
 * Setiap email yang keluar dicatat pada `NotificationEmailLog` sehingga status
 * kirim (SENT/FAILED) dapat ditampilkan ke Admin dan dapat dikirim ulang tanpa
 * menyimpan password baru di dalam email.
 */

export const EMAIL_KIND = {
  PASSWORD_REQUEST: "PASSWORD_REQUEST",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
} as const;

export type EmailKind = (typeof EMAIL_KIND)[keyof typeof EMAIL_KIND];

type EmailPayload = {
  heading: string;
  intro: string;
  rows: MailRow[];
  footer?: string;
  cta?: { label: string; url: string };
};

function rowsToText(rows: MailRow[]): string {
  return rows
    .filter((r) => r.value && r.value.trim().length > 0)
    .map((r) => `${r.label}: ${r.value}`)
    .join("\n");
}

/** Hapus data mentah yang boleh tersimpan di log (tanpa password). */
function safeMetadata(payload: EmailPayload): Record<string, unknown> {
  return {
    heading: payload.heading,
    intro: payload.intro,
    rows: payload.rows,
    footer: payload.footer ?? null,
    cta: payload.cta ?? null,
  };
}

function parsePayload(metadata: unknown): EmailPayload | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  if (typeof m.heading !== "string" || typeof m.intro !== "string") return null;
  return {
    heading: m.heading,
    intro: m.intro,
    rows: Array.isArray(m.rows) ? (m.rows as MailRow[]) : [],
    footer: typeof m.footer === "string" ? m.footer : undefined,
    cta:
      m.cta && typeof m.cta === "object"
        ? (m.cta as { label: string; url: string })
        : undefined,
  };
}

/**
 * Kirim email + catat log. Tidak pernah melempar error ke pemanggil.
 * Mengembalikan id log dan hasil kirim.
 */
export async function sendLoggedEmail(params: {
  kind: EmailKind;
  to: string;
  subject: string;
  payload: EmailPayload;
  recipientId?: string | null;
  userId?: string | null;
  requestId?: string | null;
}): Promise<{ logId: string; ok: boolean; error?: string }> {
  const log = await prisma.notificationEmailLog.create({
    data: {
      kind: params.kind,
      toEmail: params.to,
      subject: params.subject,
      status: "PENDING",
      recipientId: params.recipientId ?? null,
      userId: params.userId ?? null,
      requestId: params.requestId ?? null,
      metadata: safeMetadata(params.payload) as never,
    },
  });

  const result = await sendMail({
    to: params.to,
    subject: params.subject,
    text: `${params.payload.heading}\n\n${params.payload.intro}\n\n${rowsToText(
      params.payload.rows
    )}\n\n${params.payload.footer ?? ""}`.trim(),
    html: buildMailHtml(params.payload),
  });

  await prisma.notificationEmailLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      error: result.ok ? null : (result.error ?? "Pengiriman gagal"),
      attempts: { increment: 1 },
      sentAt: result.ok ? new Date() : null,
    },
  });

  return { logId: log.id, ok: result.ok, error: result.error };
}

/**
 * Kirim ulang email yang gagal berdasarkan log. Hanya membangun ulang isi dari
 * metadata yang sudah tersimpan (tidak ada password di metadata).
 */
export async function resendNotificationEmail(
  logId: string,
  adminId: string
): Promise<{ ok: boolean; error?: string }> {
  const log = await prisma.notificationEmailLog.findUnique({ where: { id: logId } });
  if (!log) return { ok: false, error: "Riwayat email tidak ditemukan." };

  const payload = parsePayload(log.metadata);
  if (!payload) return { ok: false, error: "Isi email tidak dapat dibangun ulang." };

  const result = await sendMail({
    to: log.toEmail,
    subject: log.subject,
    text: `${payload.heading}\n\n${payload.intro}\n\n${rowsToText(payload.rows)}`.trim(),
    html: buildMailHtml(payload),
  });

  await prisma.notificationEmailLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      error: result.ok ? null : (result.error ?? "Pengiriman gagal"),
      attempts: { increment: 1 },
      sentAt: result.ok ? new Date() : null,
      updatedBy: adminId,
    },
  });

  await logActivity({
    actorId: adminId,
    action: result.ok ? "NOTIFICATION_EMAIL_RESENT" : "NOTIFICATION_EMAIL_RESEND_FAILED",
    entity: "NOTIFICATION_EMAIL",
    entityId: log.id,
    metadata: { to: log.toEmail, kind: log.kind, error: result.ok ? undefined : result.error },
  }).catch(() => undefined);

  return { ok: result.ok, error: result.error };
}

/**
 * Notifikasi email pengajuan Lupa Password ke SELURUH Admin aktif.
 * Identity pengguna, tanggal & jam (WIB) serta detail pengajuan disertakan.
 */
export async function emailPasswordRequestToAdmins(params: {
  requestId: string;
  name: string;
  email: string;
  roleLabel: string;
  submittedAt: Date;
  rows: MailRow[];
  verified: boolean;
  matchScore: number;
  note?: string | null;
  userId?: string | null;
}): Promise<{ sent: number; failed: number }> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
    select: { id: true, email: true, name: true },
  });
  if (admins.length === 0) return { sent: 0, failed: 0 };

  const payload: EmailPayload = {
    heading: "Pengajuan Lupa Password Baru",
    intro: `Ada pengajuan reset password baru yang menunggu verifikasi Anda. Mohon tinjau pengajuan berikut di menu Kelola Lupa Password.`,
    rows: [
      { label: "Nama Pengguna", value: params.name },
      { label: "Email Terdaftar", value: params.email },
      { label: "Peran", value: params.roleLabel },
      { label: "Tanggal Pengajuan", value: formatDateTimeWib(params.submittedAt) },
      { label: "ID Pengajuan", value: params.requestId },
      {
        label: "Status Verifikasi Otomatis",
        value: params.verified
          ? `Terverifikasi (kecocokan ${params.matchScore}%)`
          : `Perlu verifikasi manual (kecocokan ${params.matchScore}%)`,
      },
      ...params.rows,
      ...(params.note ? [{ label: "Catatan Pengguna", value: params.note }] : []),
    ],
    footer:
      "Buka menu Kelola Lupa Password untuk memverifikasi identitas, lalu atur password baru. Password baru tidak pernah dikirim melalui email.",
    cta: { label: "Buka Kelola Lupa Password", url: "/dashboard/admin/password-requests" },
  };

  let sent = 0;
  let failed = 0;
  for (const admin of admins) {
    const res = await sendLoggedEmail({
      kind: EMAIL_KIND.PASSWORD_REQUEST,
      to: admin.email,
      subject: `[EDULALIN] Pengajuan Lupa Password — ${params.name}`,
      payload,
      recipientId: admin.id,
      userId: params.userId ?? null,
      requestId: params.requestId,
    }).catch(() => ({ ok: false }));
    if (res.ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

/**
 * Notifikasi email ke pemilik akun bahwa password berhasil diperbarui.
 * TIDAK memuat password baru — hanya nama, tanggal, jam, dan konfirmasi.
 */
export async function emailPasswordChangedToUser(params: {
  userId: string;
  toEmail: string;
  name: string;
  changedAt: Date;
  changedByLabel: string;
  method: string;
  requestId?: string | null;
  targetUserId?: string;
  roleLabel?: string;
  schoolName?: string | null;
}): Promise<{ logId: string | null; ok: boolean; error?: string }> {
  const payload: EmailPayload = {
    heading: "Password Akun Anda Berhasil Diperbarui",
    intro: `Halo ${params.name}, password akun EDULALIN Anda baru saja diperbarui. Email ini hanya berisi pemberitahuan — password baru TIDAK dikirim melalui email.`,
    rows: [
      { label: "Nama", value: params.name },
      { label: "Email Terdaftar", value: params.toEmail },
      ...(params.roleLabel ? [{ label: "Peran", value: params.roleLabel }] : []),
      ...(params.schoolName ? [{ label: "Sekolah", value: params.schoolName }] : []),
      { label: "Tanggal Perubahan", value: formatDateTimeWib(params.changedAt) },
      { label: "Waktu", value: "WIB (Waktu Indonesia Barat)" },
      { label: "Diproses Oleh", value: params.changedByLabel },
      { label: "Metode", value: params.method },
      ...(params.requestId ? [{ label: "ID Pengajuan", value: params.requestId }] : []),
    ],
    footer:
      "Jika Anda tidak merasa mengajukan perubahan password, segera hubungi Admin EDULALIN dan ganti password Anda setelah berhasil login.",
    cta: { label: "Masuk ke EDULALIN", url: "/login" },
  };

  const res = await sendLoggedEmail({
    kind: EMAIL_KIND.PASSWORD_CHANGED,
    to: params.toEmail,
    subject: "[EDULALIN] Password Akun Anda Berhasil Diperbarui",
    payload,
    recipientId: params.userId,
    userId: params.userId,
    requestId: params.requestId ?? null,
  }).catch(() => null);

  if (!res) return { logId: null, ok: false, error: "Pengiriman email gagal." };
  return { logId: res.logId, ok: res.ok, error: res.error };
}

/** Status singkat konfigurasi email untuk ditampilkan ke Admin. */
export function mailConfigured(): boolean {
  return getMailStatus().configured;
}
