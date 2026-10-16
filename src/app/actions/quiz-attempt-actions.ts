"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

/**
 * Hapus hasil pengerjaan kuis (attempt + jawaban).
 * Hak akses:
 * - ADMIN: semua attempt.
 * - GURU: attempt murid dari sekolah tempat mengajar.
 * - POLISI: read-only monitoring (TIDAK boleh hapus).
 */
export async function deleteQuizAttempt(attemptId: string) {
  const user = await requireRole("ADMIN", "GURU");

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { role: true, schoolId: true, name: true } },
      quiz: { select: { title: true } },
    },
  });
  if (!attempt) return { error: "Hasil kuis tidak ditemukan" };

  // Otorisasi scope
  if (user.role === "GURU") {
    if (attempt.user.role !== "MURID") {
      return { error: "Anda hanya dapat menghapus hasil kuis murid" };
    }
    if (attempt.user.schoolId !== user.schoolId) {
      return { error: "Hasil kuis dari sekolah lain tidak dapat dihapus" };
    }
  }

  await prisma.$transaction([
    prisma.quizAnswer.deleteMany({ where: { attemptId } }),
    prisma.quizAttempt.delete({ where: { id: attemptId } }),
  ]);

  await logActivity({
    actorId: user.id,
    schoolId: attempt.user.schoolId,
    action: "QUIZ_ATTEMPT_DELETE",
    entity: "QUIZ_ATTEMPT",
    entityId: attemptId,
    metadata: {
      studentName: attempt.user.name,
      quizTitle: attempt.quiz.title,
      actorRole: user.role,
    },
  });

  revalidatePath("/dashboard/guru/quiz", "layout");
  revalidatePath("/dashboard/admin/reports", "layout");
  return { ok: true };
}
