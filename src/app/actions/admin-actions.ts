"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { moduleSchema, quizSchema, questionSchema } from "@/lib/validations";
import { removeStoredFile } from "@/lib/storage";
import { resolveCategory } from "@/lib/constants";

async function actorContext() {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  return user;
}

/** Simpan aktivitas tanpa menunggu (fire and forget). */
function fireActivity(input: Parameters<typeof logActivity>[0]) {
  logActivity(input).catch(() => undefined);
}

/** Strip key opsional dari object tanpa mutate original (untuk omit isSim). */
function omitKey<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K
): Omit<T, K> {
  const { [key]: _omitted, ...rest } = obj;
  void _omitted;
  return rest;
}

export async function createModule(formData: FormData) {
  const user = await requireRole("ADMIN");
  const contentFileId = formData.get("contentFileId") ? String(formData.get("contentFileId")) : null;
  const thumbnailFileId = formData.get("thumbnailFileId") ? String(formData.get("thumbnailFileId")) : null;
  const contentUrl = formData.get("contentUrl") ? String(formData.get("contentUrl")) : null;
  const thumbnailUrl = formData.get("thumbnailUrl") ? String(formData.get("thumbnailUrl")) : null;
  const schoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);
  const isSim = formData.get("isSim") === "on";
  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isSim,
    schoolId: formData.get("schoolId") || null,
    moduleType: formData.get("moduleType") || "PDF",
    contentUrl,
    thumbnailUrl,
    durationMin: formData.get("durationMin") || null,
    order: Number(formData.get("order") ?? 0),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { error: "Data tidak valid" };
  const moduleData = omitKey(parsed.data, "isSim");

  // Validasi sekolah tujuan benar-benar terdaftar
  if (schoolIds.length) {
    const count = await prisma.school.count({ where: { id: { in: schoolIds } } });
    if (count !== schoolIds.length) return { error: "Sekolah tujuan tidak valid" };
  }
  const schoolLevels = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { educationLevel: true },
  });
  const educationLevel = resolveCategory(schoolLevels.map((s) => s.educationLevel), isSim);

  // Gantikan URL dengan file jika diunggah
  const finalContentUrl = contentFileId ? undefined : contentUrl;
  const finalThumbnailUrl = thumbnailFileId ? undefined : thumbnailUrl;

  const mod = await prisma.module.create({
    data: {
      ...moduleData,
      educationLevel,
      classLevel: null,
      contentUrl: finalContentUrl,
      thumbnailUrl: finalThumbnailUrl,
      contentFileId,
      thumbnailFileId,
      moduleToSchools: schoolIds.length
        ? { create: schoolIds.map((schoolId) => ({ schoolId })) }
        : undefined,
    },
  });
  fireActivity({
    actorId: user.id,
    schoolId: (parsed.data.schoolId as string | null) ?? undefined,
    action: "MODULE_CREATE",
    entity: "MODULE",
    entityId: mod.id,
    metadata: { title: mod.title, schoolIds },
  });
  revalidatePath("/dashboard/admin/modules");
  revalidatePath("/modul");
  return { ok: true, id: mod.id };
}

export async function updateModule(id: string, formData: FormData) {
  const user = await requireRole("ADMIN");
  const contentFileId = formData.get("contentFileId") ? String(formData.get("contentFileId")) : null;
  const thumbnailFileId = formData.get("thumbnailFileId") ? String(formData.get("thumbnailFileId")) : null;
  const contentUrl = formData.get("contentUrl") ? String(formData.get("contentUrl")) : null;
  const thumbnailUrl = formData.get("thumbnailUrl") ? String(formData.get("thumbnailUrl")) : null;
  const schoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);
  const isSim = formData.get("isSim") === "on";
  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isSim,
    schoolId: formData.get("schoolId") || null,
    moduleType: formData.get("moduleType") || "PDF",
    contentUrl,
    thumbnailUrl,
    durationMin: formData.get("durationMin") || null,
    order: Number(formData.get("order") ?? 0),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { error: "Data tidak valid" };
  const moduleData = omitKey(parsed.data, "isSim");

  const existing = await prisma.module.findUnique({ where: { id } });
  if (!existing) return { error: "Modul tidak ditemukan" };

  if (schoolIds.length) {
    const count = await prisma.school.count({ where: { id: { in: schoolIds } } });
    if (count !== schoolIds.length) return { error: "Sekolah tujuan tidak valid" };
  }
  const schoolLevels = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { educationLevel: true },
  });
  const educationLevel = resolveCategory(schoolLevels.map((s) => s.educationLevel), isSim);

  const finalContentUrl = contentFileId ? undefined : contentUrl;
  const finalThumbnailUrl = thumbnailFileId ? undefined : thumbnailUrl;

  const mod = await prisma.$transaction(async (tx) => {
    await tx.moduleToSchool.deleteMany({ where: { moduleId: id } });
    const updated = await tx.module.update({
      where: { id },
      data: {
        ...moduleData,
        educationLevel,
        classLevel: null,
        contentUrl: finalContentUrl,
        thumbnailUrl: finalThumbnailUrl,
        contentFileId,
        thumbnailFileId,
        moduleToSchools: schoolIds.length
          ? { create: schoolIds.map((schoolId) => ({ schoolId })) }
          : undefined,
      },
    });
    return updated;
  });

  // Bersihkan file lama jika diganti
  if (contentFileId && existing.contentFileId && existing.contentFileId !== contentFileId) {
    const old = await prisma.uploadedFile.findUnique({ where: { id: existing.contentFileId } });
    if (old) {
      await removeStoredFile(old.storedName);
      await prisma.uploadedFile.delete({ where: { id: old.id } });
    }
  }
  if (thumbnailFileId && existing.thumbnailFileId && existing.thumbnailFileId !== thumbnailFileId) {
    const old = await prisma.uploadedFile.findUnique({ where: { id: existing.thumbnailFileId } });
    if (old) {
      await removeStoredFile(old.storedName);
      await prisma.uploadedFile.delete({ where: { id: old.id } });
    }
  }

  fireActivity({
    actorId: user.id,
    schoolId: mod.schoolId ?? undefined,
    action: "MODULE_UPDATE",
    entity: "MODULE",
    entityId: mod.id,
    metadata: { title: mod.title, schoolIds },
  });
  revalidatePath("/dashboard/admin/modules");
  revalidatePath("/modul");
  return { ok: true };
}

export async function createQuiz(formData: FormData) {
  const user = await requireRole("ADMIN");
  const schoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);
  const sourceFileId = formData.get("sourceFileId") ? String(formData.get("sourceFileId")) : null;
  const parsed = quizSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    moduleId: formData.get("moduleId") || null,
    schoolId: formData.get("schoolId") || null,
    minScore: Number(formData.get("minScore") ?? 60),
    maxAttempts: formData.get("maxAttempts") || null,
    shuffle: formData.get("shuffle") === "on",
    showResult: formData.get("showResult") === "on",
    showDiscussion: formData.get("showDiscussion") === "on",
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { error: "Data tidak valid" };
  if (schoolIds.length) {
    const count = await prisma.school.count({ where: { id: { in: schoolIds } } });
    if (count !== schoolIds.length) return { error: "Sekolah tujuan tidak valid" };
  }
  const schoolLevels = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { educationLevel: true },
  });
  const educationLevel = resolveCategory(schoolLevels.map((s) => s.educationLevel));
  const quiz = await prisma.quiz.create({
    data: {
      ...parsed.data,
      educationLevel,
      classLevel: null,
      sourceFileId,
      sourceType: sourceFileId ? "PDF" : "MANUAL",
      status: "DRAFT",
      quizToSchools: schoolIds.length
        ? { create: schoolIds.map((schoolId) => ({ schoolId })) }
        : undefined,
    },
  });
  fireActivity({
    actorId: user.id,
    schoolId: (parsed.data.schoolId as string | null) ?? undefined,
    action: "QUIZ_CREATE",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title, schoolIds },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true, id: quiz.id };
}

export async function addQuestion(formData: FormData) {
  const user = await requireRole("ADMIN");
  const parsed = questionSchema.safeParse({
    quizId: formData.get("quizId"),
    text: formData.get("text"),
    optionA: formData.get("optionA"),
    optionB: formData.get("optionB"),
    optionC: formData.get("optionC"),
    optionD: formData.get("optionD"),
    correctOption: formData.get("correctOption"),
    weight: Number(formData.get("weight") ?? 1),
    explanation: formData.get("explanation") || undefined,
    order: Number(formData.get("order") ?? 0),
  });
  if (!parsed.success) return { error: "Data tidak valid" };
  const q = await prisma.quizQuestion.create({ data: parsed.data });
  fireActivity({
    actorId: user.id,
    action: "QUIZ_QUESTION_CREATE",
    entity: "QUIZ_QUESTION",
    entityId: q.id,
    metadata: { quizId: q.quizId },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true };
}

export async function toggleModuleStatus(id: string) {
  const user = await requireRole("ADMIN");
  const mod = await prisma.module.findUnique({ where: { id } });
  if (!mod) return { error: "Modul tidak ditemukan" };
  const updated = await prisma.module.update({
    where: { id },
    data: { status: mod.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
  });
  fireActivity({
    actorId: user.id,
    schoolId: mod.schoolId ?? undefined,
    action: "MODULE_STATUS",
    entity: "MODULE",
    entityId: mod.id,
    metadata: { status: updated.status },
  });
  revalidatePath("/dashboard/admin/modules");
  revalidatePath("/modul");
  return { ok: true };
}

export async function archiveModule(id: string) {
  const user = await requireRole("ADMIN");
  const mod = await prisma.module.update({
    where: { id },
    data: { status: "ARCHIVED", deletedAt: new Date() },
  });
  fireActivity({
    actorId: user.id,
    schoolId: mod.schoolId ?? undefined,
    action: "MODULE_ARCHIVE",
    entity: "MODULE",
    entityId: mod.id,
    metadata: { title: mod.title },
  });
  revalidatePath("/dashboard/admin/modules");
  revalidatePath("/modul");
  return { ok: true };
}

export async function archiveQuiz(id: string) {
  const user = await requireRole("ADMIN");
  const quiz = await prisma.quiz.update({
    where: { id },
    data: { status: "ARCHIVED", deletedAt: new Date() },
  });
  fireActivity({
    actorId: user.id,
    action: "QUIZ_ARCHIVE",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true };
}

export async function deleteQuiz(id: string) {
  const user = await requireRole("ADMIN");
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return { error: "Kuis tidak ditemukan" };
  await prisma.quiz.delete({ where: { id } });
  fireActivity({
    actorId: user.id,
    action: "QUIZ_DELETE",
    entity: "QUIZ",
    entityId: id,
    metadata: { title: quiz.title },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true };
}

export async function createGuruPolisi(formData: FormData) {
  const user = await requireRole("ADMIN");
  const role = formData.get("role");
  if (role !== "GURU" && role !== "POLISI") return { error: "Role tidak valid" };
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const schoolId = (formData.get("schoolId") as string) || null;
  const educationLevel = (formData.get("educationLevel") as string) || null;
  const classLevel = (formData.get("classLevel") as string) || null;
  const policeLevel = (formData.get("policeLevel") as string) || null;
  const policeUnit = (formData.get("policeUnit") as string) || null;
  const policeDivision = (formData.get("policeDivision") as string) || null;
  const subject = (formData.get("subject") as string) || null;
  if (name.length < 2 || !email.includes("@") || password.length < 8) {
    return { error: "Data tidak valid" };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email sudah terdaftar" };
  const { hashPassword } = await import("@/lib/password");
  const created = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: role as "GURU" | "POLISI",
      schoolId,
      educationLevel: (educationLevel as "SD" | "SMP" | "SMA" | "SIM" | null) ?? null,
      classLevel,
      subject,
      policeLevel: (policeLevel as "POLSEK" | "POLRES" | "POLDA" | null) ?? null,
      policeUnit,
      policeDivision,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });
  fireActivity({
    actorId: user.id,
    schoolId: schoolId ?? undefined,
    action: "USER_CREATE",
    entity: "USER",
    entityId: created.id,
    metadata: { role: created.role, email: created.email },
  });
  revalidatePath("/dashboard/admin/users");
  return { ok: true };
}

export async function archiveUser(id: string) {
  const actor = await requireRole("ADMIN");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "Pengguna tidak ditemukan" };
  if (target.role === "ADMIN") return { error: "Akun admin tidak dapat diarsipkan" };
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });
  fireActivity({
    actorId: actor.id,
    schoolId: target.schoolId ?? undefined,
    action: "USER_ARCHIVE",
    entity: "USER",
    entityId: target.id,
    metadata: { name: target.name, role: target.role },
  });
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/archived");
  return { ok: true };
}

export async function restoreUser(id: string) {
  const actor = await requireRole("ADMIN");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "Pengguna tidak ditemukan" };
  await prisma.user.update({
    where: { id },
    data: { deletedAt: null, status: "ACTIVE" },
  });
  fireActivity({
    actorId: actor.id,
    schoolId: target.schoolId ?? undefined,
    action: "USER_RESTORE",
    entity: "USER",
    entityId: target.id,
    metadata: { name: target.name, role: target.role },
  });
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/archived");
  return { ok: true };
}

/**
 * Hapus permanen akun yang sudah diarsipkan (soft delete).
 * Menghapus data terkait milik akun agar relasi database tetap utuh.
 * Riwayat aktivitas (ActivityLog) dipertahankan karena actorId memakai
 * ON DELETE SET NULL — laporan statistik tidak rusak.
 */
export async function permanentDeleteUser(id: string) {
  const actor = await requireRole("ADMIN");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "Pengguna tidak ditemukan" };
  if (target.role === "ADMIN") return { error: "Akun admin tidak dapat dihapus permanen" };
  if (!target.deletedAt) {
    return { error: "Akun harus diarsipkan terlebih dahulu sebelum dihapus permanen" };
  }

  await prisma.$transaction(async (tx) => {
    // QuizAnswer mereferensikan QuizAttempt (RESTRICT) — hapus jawaban dahulu.
    const attempts = await tx.quizAttempt.findMany({
      where: { userId: id },
      select: { id: true },
    });
    if (attempts.length > 0) {
      await tx.quizAnswer.deleteMany({
        where: { attemptId: { in: attempts.map((a) => a.id) } },
      });
    }
    await tx.quizAttempt.deleteMany({ where: { userId: id } });
    await tx.moduleProgress.deleteMany({ where: { userId: id } });
    await tx.userSession.deleteMany({ where: { userId: id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: id } });
    await tx.verificationToken.deleteMany({ where: { userId: id } });

    // File milik akun. Modul/Kuis mereferensikan UploadedFile dengan SET NULL,
    // sehingga menghapus baris file tidak merusak modul/kuis.
    const files = await tx.uploadedFile.findMany({
      where: { ownerId: id },
      select: { storedName: true },
    });
    await tx.uploadedFile.deleteMany({ where: { ownerId: id } });

    // ActivityLog.actorId adalah SET NULL — histori aktivitas tetap tersimpan.
    await tx.user.delete({ where: { id } });

    // Bersihkan file fisik dari penyimpanan lokal.
    for (const f of files) {
      removeStoredFile(f.storedName).catch(() => undefined);
    }
  });

  fireActivity({
    actorId: actor.id,
    schoolId: target.schoolId ?? undefined,
    action: "USER_PERMANENT_DELETE",
    entity: "USER",
    entityId: target.id,
    metadata: { name: target.name, role: target.role, email: target.email },
  });
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/archived");
  return { ok: true };
}

export async function toggleUserStatus(id: string) {
  const actor = await requireRole("ADMIN");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "Pengguna tidak ditemukan" };
  if (target.role === "ADMIN") return { error: "Status admin tidak dapat diubah" };
  const next = target.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.user.update({ where: { id }, data: { status: next } });
  fireActivity({
    actorId: actor.id,
    schoolId: target.schoolId ?? undefined,
    action: "USER_STATUS",
    entity: "USER",
    entityId: target.id,
    metadata: { name: target.name, status: next },
  });
  revalidatePath("/dashboard/admin/users");
  return { ok: true };
}

export async function createQuizFromPdf(formData: FormData) {
  const user = await requireRole("ADMIN");
  const sourceFileId = String(formData.get("sourceFileId") ?? "");
  const schoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "") || undefined;
  const minScore = Number(formData.get("minScore") ?? 60);
  const moduleId = String(formData.get("moduleId") ?? "") || null;

  const file = await prisma.uploadedFile.findUnique({ where: { id: sourceFileId } });
  if (!file || file.kind !== "QUIZ_PDF") return { error: "File PDF tidak ditemukan" };
  if (schoolIds.length) {
    const count = await prisma.school.count({ where: { id: { in: schoolIds } } });
    if (count !== schoolIds.length) return { error: "Sekolah tujuan tidak valid" };
  }
  const schoolLevels = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { educationLevel: true },
  });
  const educationLevel = resolveCategory(schoolLevels.map((s) => s.educationLevel));

  const { extractQuestionsFromPdf } = await import("@/lib/pdf-parser");
  const result = await extractQuestionsFromPdf(file.storedName);
  if (!result.ok) return { error: result.error };

  // Buat kuis draft + soal hasil ekstraksi
  const quiz = await prisma.$transaction(async (tx) => {
    const created = await tx.quiz.create({
      data: {
        title: title || file.originalName.replace(/\.pdf$/i, ""),
        description,
        moduleId,
        sourceType: "PDF",
        sourceFileId: file.id,
        educationLevel,
        classLevel: null,
        minScore,
        status: "DRAFT",
        quizToSchools: schoolIds.length
          ? { create: schoolIds.map((schoolId) => ({ schoolId })) }
          : undefined,
      },
    });
    await tx.quizQuestion.createMany({
      data: result.questions.map((q, idx) => ({
        quizId: created.id,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: null,
        order: idx + 1,
      })),
    });
    return created;
  });

  fireActivity({
    actorId: user.id,
    schoolId: undefined,
    action: "QUIZ_PDF_EXTRACT",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title, extracted: result.extracted },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true, id: quiz.id, extracted: result.extracted };
}

export async function updateQuiz(id: string, formData: FormData) {
  const user = await requireRole("ADMIN");
  const schoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);
  const parsed = quizSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    moduleId: formData.get("moduleId") || null,
    schoolId: formData.get("schoolId") || null,
    minScore: Number(formData.get("minScore") ?? 60),
    maxAttempts: formData.get("maxAttempts") || null,
    shuffle: formData.get("shuffle") === "on",
    showResult: formData.get("showResult") === "on",
    showDiscussion: formData.get("showDiscussion") === "on",
    status: (formData.get("status") as string) || "ACTIVE",
  });
  if (!parsed.success) return { error: "Data tidak valid" };
  if (schoolIds.length) {
    const count = await prisma.school.count({ where: { id: { in: schoolIds } } });
    if (count !== schoolIds.length) return { error: "Sekolah tujuan tidak valid" };
  }
  const schoolLevels = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { educationLevel: true },
  });
  const educationLevel = resolveCategory(schoolLevels.map((s) => s.educationLevel));

  const quiz = await prisma.$transaction(async (tx) => {
    await tx.quizToSchool.deleteMany({ where: { quizId: id } });
    return tx.quiz.update({
      where: { id },
      data: {
        ...parsed.data,
        educationLevel,
        classLevel: null,
        quizToSchools: schoolIds.length
          ? { create: schoolIds.map((schoolId) => ({ schoolId })) }
          : undefined,
      },
    });
  });
  fireActivity({
    actorId: user.id,
    schoolId: quiz.schoolId ?? undefined,
    action: "QUIZ_UPDATE",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title, schoolIds },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true };
}

export async function publishQuiz(id: string) {
  const user = await requireRole("ADMIN");
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return { error: "Kuis tidak ditemukan" };

  // Cek semua soal punya kunci jawaban sebelum publish
  const missingKeys = await prisma.quizQuestion.count({
    where: { quizId: id, correctOption: null },
  });
  if (missingKeys > 0) {
    return { error: `${missingKeys} soal belum memiliki kunci jawaban` };
  }

  await prisma.quiz.update({ where: { id }, data: { status: "ACTIVE" } });
  fireActivity({
    actorId: user.id,
    schoolId: quiz.schoolId ?? undefined,
    action: "QUIZ_PUBLISH",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true };
}

export async function editQuestion(id: string, formData: FormData) {
  const user = await requireRole("ADMIN");
  const parsed = questionSchema.safeParse({
    quizId: formData.get("quizId"),
    text: formData.get("text"),
    optionA: formData.get("optionA"),
    optionB: formData.get("optionB"),
    optionC: formData.get("optionC"),
    optionD: formData.get("optionD"),
    correctOption: formData.get("correctOption") || null,
    weight: Number(formData.get("weight") ?? 1),
    explanation: formData.get("explanation") || undefined,
    order: Number(formData.get("order") ?? 0),
  });
  if (!parsed.success) return { error: "Data tidak valid" };
  const { quizId, ...rest } = parsed.data;
  // id dari argumen (path) lebih dipercaya daripada form
  const q = await prisma.quizQuestion.update({ where: { id }, data: { ...rest, quizId } });
  fireActivity({
    actorId: user.id,
    action: "QUIZ_QUESTION_UPDATE",
    entity: "QUIZ_QUESTION",
    entityId: q.id,
    metadata: { quizId },
  });
  revalidatePath(`/dashboard/admin/quizzes/${quizId}`);
  return { ok: true };
}

export async function deleteQuestion(id: string, quizId: string) {
  const user = await requireRole("ADMIN");
  await prisma.quizQuestion.delete({ where: { id } });
  fireActivity({
    actorId: user.id,
    action: "QUIZ_QUESTION_DELETE",
    entity: "QUIZ_QUESTION",
    entityId: id,
    metadata: { quizId },
  });
  revalidatePath(`/dashboard/admin/quizzes/${quizId}`);
  return { ok: true };
}

export async function archiveQuizHard(id: string) {
  const user = await requireRole("ADMIN");
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return { error: "Kuis tidak ditemukan" };
  await prisma.quiz.update({ where: { id }, data: { status: "ARCHIVED", deletedAt: new Date() } });
  fireActivity({
    actorId: user.id,
    schoolId: quiz.schoolId ?? undefined,
    action: "QUIZ_DELETE",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title },
  });
  revalidatePath("/dashboard/admin/quizzes");
  return { ok: true };
}

export async function updateSchool(id: string, formData: FormData) {
  const user = await requireRole("ADMIN");
  const parsed = (await import("@/lib/validations")).schoolSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    educationLevel: formData.get("educationLevel"),
    address: formData.get("address"),
    city: formData.get("city"),
    province: formData.get("province"),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { error: "Data tidak valid" };
  const school = await prisma.school.update({ where: { id }, data: parsed.data });
  fireActivity({
    actorId: user.id,
    schoolId: school.id,
    action: "SCHOOL_UPDATE",
    entity: "SCHOOL",
    entityId: school.id,
    metadata: { name: school.name },
  });
  revalidatePath("/dashboard/admin/schools");
  return { ok: true };
}

/**
 * Soft delete sekolah. Menonaktifkan seluruh akun Guru/Murid yang terhubung
 * dan mencabut semua sesi aktif mereka sehingga tidak dapat login lagi.
 * Data & riwayat tetap tersimpan (soft delete) sehingga Admin dapat memulihkan.
 */
export async function deleteSchool(id: string) {
  const actor = await requireRole("ADMIN");
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school) return { error: "Sekolah tidak ditemukan" };
  if (school.deletedAt) return { error: "Sekolah sudah dalam status terhapus" };

  const result = await prisma.$transaction(async (tx) => {
    // Akun GURU & MURID yang terhubung sekolah dinonaktifkan (sesuai permintaan).
    const affectedUsers = await tx.user.findMany({
      where: {
        schoolId: id,
        deletedAt: null,
        role: { in: ["GURU", "MURID"] },
      },
      select: { id: true },
    });
    const affectedCount = affectedUsers.length;

    // Set nonaktif akun GURU/MURID sekolah (termasuk PENDING agar tidak bisa login).
    await tx.user.updateMany({
      where: {
        schoolId: id,
        deletedAt: null,
        status: "ACTIVE",
        role: { in: ["GURU", "MURID"] },
      },
      data: { status: "INACTIVE" },
    });
    await tx.user.updateMany({
      where: {
        schoolId: id,
        deletedAt: null,
        status: "PENDING",
        role: { in: ["GURU", "MURID"] },
      },
      data: { status: "INACTIVE" },
    });

    // Cabut seluruh sesi aktif milik user sekolah ini (aman untuk semua role).
    const allUserIds = await tx.user.findMany({
      where: { schoolId: id, deletedAt: null },
      select: { id: true },
    });
    const allIds = allUserIds.map((u) => u.id);
    if (allIds.length > 0) {
      await tx.userSession.deleteMany({ where: { userId: { in: allIds } } });
    }

    await tx.school.update({
      where: { id },
      data: { status: "INACTIVE", deletedAt: new Date(), deletedBy: actor.id },
    });

    return affectedCount;
  });

  fireActivity({
    actorId: actor.id,
    schoolId: id,
    action: "SCHOOL_DELETE",
    entity: "SCHOOL",
    entityId: id,
    metadata: {
      name: school.name,
      affectedCount: result,
    },
  });
  revalidatePath("/dashboard/admin/schools");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin", "layout");
  return { ok: true };
}

/**
 * Pulihkan sekolah yang dihapus (soft delete). Mengembalikan status sekolah
 * menjadi aktif dan mengaktifkan kembali akun Guru/Murid yang sebelumnya aktif.
 */
export async function restoreSchool(id: string) {
  const actor = await requireRole("ADMIN");
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school) return { error: "Sekolah tidak ditemukan" };
  if (!school.deletedAt) return { error: "Sekolah tidak dalam status terhapus" };

  await prisma.school.update({
    where: { id },
    data: { status: "ACTIVE", deletedAt: null, deletedBy: null },
  });

  // Mengaktifkan kembali akun GURU/MURID yang sebelumnya terhubung sekolah
  // (non-terhapus permanen). Hak akses sesuai role masing-masing.
  const restored = await prisma.user.updateMany({
    where: {
      schoolId: id,
      deletedAt: null,
      role: { in: ["GURU", "MURID"] },
    },
    data: { status: "ACTIVE" },
  });

  fireActivity({
    actorId: actor.id,
    schoolId: id,
    action: "SCHOOL_RESTORE",
    entity: "SCHOOL",
    entityId: id,
    metadata: { name: school.name, restoredUserCount: restored.count },
  });
  revalidatePath("/dashboard/admin/schools");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin", "layout");
  return { ok: true };
}

export async function updateUserSettings(
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "") || null;
  const avatarUrl = String(formData.get("avatarUrl") ?? "") || null;
  const birthDateRaw = formData.get("birthDate");
  const email = String(formData.get("email") ?? "").toLowerCase();

  if (name.length < 2) return { error: "Nama minimal 2 karakter" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email tidak valid" };
  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: "Email sudah digunakan" };
  }

  const data: Record<string, unknown> = { name, phone, avatarUrl };
  if (email && email !== user.email) data.email = email;
  if (birthDateRaw) {
    const bd = new Date(String(birthDateRaw));
    if (!Number.isNaN(bd.getTime())) data.birthDate = bd;
  }

  await prisma.user.update({ where: { id: user.id }, data });
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PROFILE_UPDATE",
    entity: "USER",
    entityId: user.id,
    metadata: { name, hasAvatar: !!avatarUrl },
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

// Keep the import used for callers that need actor context without writing.
export { actorContext };