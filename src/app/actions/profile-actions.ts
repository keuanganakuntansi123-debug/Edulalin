"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { removeStoredFile, fileUrl, storedNameFromUrl } from "@/lib/storage";
import { verifyPassword } from "@/lib/password";

export async function updateProfile(formData: FormData) {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const avatarFileId = formData.get("avatarFileId") ? String(formData.get("avatarFileId")) : null;
  const embeddedAvatar = formData.get("embeddedAvatar")
    ? String(formData.get("embeddedAvatar"))
    : null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");

  if (name.length < 2) return { error: "Nama minimal 2 karakter" };
  if (!user.id) return { error: "Pengguna tidak ditemukan" };

  const data: {
    name?: string;
    phone?: string | null;
    email?: string;
  } = { name, phone };

  // Ubah email (dengan verifikasi password saat ini)
  if (email && email !== user.email) {
    if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return { error: "Masukkan password saat ini untuk mengubah email" };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { error: "Email tidak valid" };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) return { error: "Email sudah digunakan akun lain" };
    data.email = email;
  }

  const avatarUrl = avatarFileId
    ? await (async () => {
        const file = await prisma.uploadedFile.findUnique({ where: { id: avatarFileId } });
        if (!file || file.kind !== "AVATAR" || file.ownerId !== user.id) return undefined;
        return fileUrl(file.storedName);
      })()
    : undefined;

  const embedded =
    embeddedAvatar && embeddedAvatar.startsWith("data:image/")
      ? embeddedAvatar
      : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...data,
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(embedded ? { embeddedAvatar: embedded } : {}),
      ...(avatarUrl && !embedded ? { embeddedAvatar: null } : {}),
    },
  });

  // Hapus avatar lama jika diganti
  if (avatarUrl && user.avatarUrl) {
    const oldStored = storedNameFromUrl(user.avatarUrl);
    const newStored = storedNameFromUrl(avatarUrl);
    if (oldStored && oldStored !== newStored) {
      const oldFile = await prisma.uploadedFile.findUnique({ where: { storedName: oldStored } });
      if (oldFile && oldFile.kind === "AVATAR" && oldFile.ownerId === user.id) {
        await removeStoredFile(oldFile.storedName);
        await prisma.uploadedFile.delete({ where: { id: oldFile.id } });
      }
    }
  }

  logActivity({
    actorId: user.id,
    schoolId: user.schoolId ?? undefined,
    action: "PROFILE_UPDATE",
    entity: "USER",
    entityId: user.id,
    metadata: { name, hasAvatar: !!avatarUrl },
  }).catch(() => undefined);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function removeAvatar() {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  if (user.avatarUrl) {
    const stored = storedNameFromUrl(user.avatarUrl);
    if (stored) {
      const file = await prisma.uploadedFile.findUnique({ where: { storedName: stored } });
      if (file && file.kind === "AVATAR" && file.ownerId === user.id) {
        await removeStoredFile(file.storedName);
        await prisma.uploadedFile.delete({ where: { id: file.id } });
      }
    }
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null, embeddedAvatar: null },
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
