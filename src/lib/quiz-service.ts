import { prisma } from "@/lib/prisma";
import { submitQuizSchema } from "@/lib/validations";
import { logActivity } from "@/lib/audit";
import { notifyQuizResult } from "@/lib/notification-service";
import type { Role } from "@/generated/prisma/client";
import { canAccessSim } from "@/lib/module-service";
import { contentLevelsForMurid } from "@/lib/constants";

export type QuizResult =
  | { success: true; result: { score: number; passed: boolean; total: number; correct: number } }
  | { success: false; message: string };

/**
 * Submit kuis & hitung nilai di server.
 * Jangan pernah percaya nilai dari frontend — score dihitung dari jawaban tersimpan.
 */
export async function submitQuiz(
  actor: {
    id: string;
    name: string;
    role: Role;
    schoolId: string | null;
    educationLevel?: string | null;
    birthDate?: Date | null;
  },
  input: { attemptId: string; answers: { questionId: string; selectedOption: "A" | "B" | "C" | "D" }[] }
): Promise<QuizResult> {
  const parsed = submitQuizSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Data tidak valid" };

  const { attemptId, answers } = parsed.data;

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId: actor.id, status: "IN_PROGRESS" },
    include: {
      quiz: { include: { questions: true } },
    },
  });
  if (!attempt) return { success: false, message: "Attempt tidak ditemukan" };

  // Validasi akses school scope
  const quiz = attempt.quiz;
  const targets = await prisma.quizToSchool.findMany({
    where: { quizId: quiz.id },
    select: { schoolId: true },
  });
  const targetIds = targets.map((t) => t.schoolId);
  const hasTargets = targetIds.length > 0;
  const globalQuiz = quiz.schoolId == null && !hasTargets;
  if (
    actor.role !== "ADMIN" &&
    actor.role !== "POLISI" &&
    !globalQuiz &&
    quiz.schoolId !== actor.schoolId &&
    !(actor.schoolId && targetIds.includes(actor.schoolId))
  ) {
    return { success: false, message: "Akses ditolak" };
  }
  // Kunci kategori: jenjang konten harus cocok untuk murid di SEMUA scope
  // (global, milik sekolah, maupun target sekolah) — kategori tak bisa tercampur.
  if (actor.role === "MURID" && actor.educationLevel) {
    const levelOk = contentLevelsForMurid(actor.educationLevel).includes(
      quiz.educationLevel
    );
    if (!levelOk) return { success: false, message: "Akses ditolak" };
  }

  // SIM gate: usia >= 17 untuk kuis jenjang SIM (kecuali Polisi/Admin — latihan profesional)
  if (
    quiz.educationLevel === "SIM" &&
    actor.role !== "POLISI" &&
    actor.role !== "ADMIN" &&
    !canAccessSim(actor.birthDate)
  ) {
    return { success: false, message: "Modul SIM tersedia setelah Anda berusia 17 tahun." };
  }

  let correct = 0;
  let totalWeight = 0;
  for (const q of quiz.questions) {
    totalWeight += q.weight;
  }

  const answerRows = answers.map((a) => {
    const question = quiz.questions.find((q) => q.id === a.questionId);
    const isCorrect = !!question?.correctOption && question.correctOption === a.selectedOption;
    if (isCorrect) correct += question?.weight ?? 0;
    return {
      attemptId: attempt.id,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: !!isCorrect,
      score: isCorrect ? question?.weight ?? 0 : 0,
    };
  });

  const score = totalWeight === 0 ? 0 : Math.round((correct / totalWeight) * 100);
  const passed = score >= quiz.minScore;

  await prisma.$transaction(async (tx) => {
    await tx.quizAnswer.deleteMany({ where: { attemptId: attempt.id } });
    await tx.quizAnswer.createMany({ data: answerRows });
    await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "COMPLETED",
        score,
        passed,
        submittedAt: new Date(),
      },
    });
  });

  await logActivity({
    actorId: actor.id,
    schoolId: quiz.schoolId,
    action: "QUIZ_SUBMIT",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { attemptId: attempt.id, score, passed },
  });

  await notifyQuizResult({
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    schoolId: actor.schoolId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    attemptId: attempt.id,
    score,
    passed,
  });

  return { success: true, result: { score, passed, total: quiz.questions.length, correct } };
}