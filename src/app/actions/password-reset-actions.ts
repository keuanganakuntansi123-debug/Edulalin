"use server";

import { logActivity } from "@/lib/audit";
import { getRequestMeta, safeRevalidatePath } from "@/lib/request-context";
import { requireRole } from "@/lib/guards";
import {
  notifyPasswordRequestToAdmins,
  notifyPasswordChanged,
} from "@/lib/notification-service";
import { ROLE_LABEL, levelDisplayLabel, policeLevelLabel } from "@/lib/constants";
import {
  submitPasswordResetRequest,
  completePasswordReset,
  rejectPasswordRequest as rejectRequest,
  deletePasswordRequest as deleteRequest,
  changeUserPassword,
  type PasswordRequestResult,
} from "@/lib/password-reset-service";
import type { Role } from "@/generated/prisma/client";

/**
 * Alur Lupa Password EDULALIN — pengajuan reset melalui Admin.
 *
 * Pengguna mengirim identitas dari `/lupa-password`. Sistem memverifikasi
 * kecocokan dengan akun asli, membuat pengajuan yang muncul di lonceng
 * dashboard Admin, lalu Admin menyetel password baru. Setelah password
 * berubah, pengguna menerima notifikasi lonceng — tanpa password baru di
 * dalamnya. Seluruh notifikasi disalurkan lewat lonceng (tanpa email).
 *
 * Logika inti ada di `@/lib/password-reset-service` agar dapat diuji langsung
 * terhadap database; lapisan ini menambahkan otorisasi, audit, revalidasi,
 * notifikasi, dan pengiriman email.
 */

export type PasswordRequestState = PasswordRequestResult;

function clean(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function roleLabel(role: string): string {
  return ROLE_LABEL[role as Role] ?? role;
}

/** Bangun baris ringkasan identitas untuk notifikasi lonceng Admin. */
function identityRows(input: {
  schoolName?: string;
  educationLevel?: string;
  classLevel?: string;
  major?: string;
  subject?: string;
  policeLevel?: string;
  policeUnit?: string;
  policeDivision?: string;
}): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (input.schoolName) rows.push({ label: "Sekolah", value: input.schoolName });
  if (input.educationLevel)
    rows.push({ label: "Jenjang", value: levelDisplayLabel(input.educationLevel) });
  if (input.classLevel) rows.push({ label: "Kelas", value: input.classLevel });
  if (input.major) rows.push({ label: "Jurusan", value: input.major });
  if (input.subject) rows.push({ label: "Mata Pelajaran", value: input.subject });
  if (input.policeLevel)
    rows.push({ label: "Tingkat Kesatuan", value: policeLevelLabel(input.policeLevel) });
  if (input.policeUnit) rows.push({ label: "Nama Kesatuan", value: input.policeUnit });
  if (input.policeDivision) rows.push({ label: "Divisi / Satuan", value: input.policeDivision });
  return rows;
}

/** Kirim pengajuan reset password (halaman publik). */
export async function requestPasswordReset(
  _prev: PasswordRequestState | undefined,
  formData: FormData
): Promise<PasswordRequestState> {
  const submitted = {
    email: clean(formData.get("email")),
    name: clean(formData.get("name")),
    schoolName: clean(formData.get("schoolName")),
    educationLevel: clean(formData.get("educationLevel")),
    classLevel: clean(formData.get("classLevel")),
    major: clean(formData.get("major")),
    subject: clean(formData.get("subject")),
    policeLevel: clean(formData.get("policeLevel")),
    policeUnit: clean(formData.get("policeUnit")),
    policeDivision: clean(formData.get("policeDivision")),
    note: clean(formData.get("note")),
  };

  const result = await submitPasswordResetRequest(submitted);

  if (result.success && result.requestId) {
    const meta = await getRequestMeta();
    const submittedAt = new Date();
    const rows = identityRows(submitted);
    const summary = rows.map((r) => `${r.label}: ${r.value}`).join(" · ");

    logActivity({
      actorId: result.audit?.userId,
      schoolId: result.audit?.schoolId,
      action: "PASSWORD_RESET_REQUEST_SUBMITTED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: result.requestId,
      metadata: {
        email: result.audit?.email,
        role: result.audit?.role,
        verified: result.verified,
        score: result.audit?.matchScore,
        matched: result.audit?.matchedFields,
        mismatch: result.audit?.mismatchFields,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => undefined);

    // Lonceng dashboard Admin.
    const notified = await notifyPasswordRequestToAdmins({
      requestId: result.requestId,
      name: submitted.name,
      email: result.audit?.email ?? submitted.email,
      roleLabel: roleLabel(result.audit?.role ?? "-"),
      submittedAt,
      summary,
    });

    safeRevalidatePath("/dashboard/admin/password-requests");
    return {
      ...result,
      notifications: {
        admins: notified,
      },
    };
  }

  return result;
}

/** ADMIN-only — setel password baru untuk pengajuan valid. */
export async function resetPasswordByRequest(
  requestId: string,
  formData: FormData
): Promise<PasswordRequestState> {
  const admin = await requireRole("ADMIN");
  const result = await completePasswordReset({
    requestId,
    adminId: admin.id,
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (result.success && result.audit?.userId) {
    const meta = await getRequestMeta();
    const changedAt = result.audit.changedAt ? new Date(result.audit.changedAt) : new Date();
    const targetUserId = result.audit.userId;
    const targetEmail = result.audit.email ?? "";

    logActivity({
      actorId: admin.id,
      schoolId: result.audit.schoolId,
      action: "PASSWORD_RESET_COMPLETED_BY_ADMIN",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: requestId,
      metadata: {
        targetUserId,
        targetEmail,
        targetRole: result.audit.role,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => undefined);

    // Notifikasi lonceng ke pengguna (tanpa password baru).
    await notifyPasswordChanged({
      userId: targetUserId,
      name: result.audit.name ?? "Pengguna",
      changedAt,
      changedByLabel: `Admin (${admin.name})`,
      method: "Reset melalui pengajuan Lupa Password",
    });

    safeRevalidatePath("/dashboard/admin/password-requests");
    return result;
  }

  return result;
}

/** ADMIN-only — tolak pengajuan. */
export async function rejectPasswordRequest(
  requestId: string,
  reason: string
): Promise<PasswordRequestState> {
  const admin = await requireRole("ADMIN");
  const result = await rejectRequest({ requestId, adminId: admin.id, reason });

  if (result.success) {
    logActivity({
      actorId: admin.id,
      schoolId: result.audit?.schoolId,
      action: "PASSWORD_RESET_REQUEST_REJECTED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: requestId,
      metadata: { reason },
    }).catch(() => undefined);
    safeRevalidatePath("/dashboard/admin/password-requests");
  }

  return result;
}

/** ADMIN-only — hapus riwayat pengajuan yang sudah diproses. */
export async function deletePasswordRequest(requestId: string): Promise<PasswordRequestState> {
  const admin = await requireRole("ADMIN");
  const result = await deleteRequest({ requestId });

  if (result.success) {
    logActivity({
      actorId: admin.id,
      schoolId: result.audit?.schoolId,
      action: "PASSWORD_RESET_REQUEST_DELETED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: requestId,
      metadata: { email: result.audit?.email },
    }).catch(() => undefined);
    safeRevalidatePath("/dashboard/admin/password-requests");
  }

  return result;
}

/** Ubah password mandiri (semua aktor) dari menu Profil & Pengaturan. */
export async function changeOwnPassword(
  _prev: PasswordRequestState | undefined,
  formData: FormData
): Promise<PasswordRequestState> {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  const result = await changeUserPassword({
    userId: user.id,
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (result.success) {
    const meta = await getRequestMeta();
    const changedAt = result.audit?.changedAt ? new Date(result.audit.changedAt) : new Date();

    logActivity({
      actorId: user.id,
      schoolId: user.schoolId,
      action: "PASSWORD_CHANGED_BY_USER",
      entity: "USER",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => undefined);

    await notifyPasswordChanged({
      userId: user.id,
      name: user.name,
      changedAt,
      changedByLabel: "Anda sendiri",
      method: "Ubah password mandiri",
    });

    safeRevalidatePath("/dashboard", "layout");
  }

  return result;
}
