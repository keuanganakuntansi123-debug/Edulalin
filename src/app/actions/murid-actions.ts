"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateModuleProgress, getModuleForUser } from "@/lib/module-service";
import { submitQuiz } from "@/lib/quiz-service";
import { logActivity } from "@/lib/audit";
import { redirect } from "next/navigation";
import { canAccessSim } from "@/lib/module-service";

export async function saveProgressAction(formData: FormData) {
  const user = await requireRole("MURID");
  const moduleId = String(formData.get("moduleId") ?? "");
  const progress = Number(formData.get("progress") ?? 0);

  const mod = await getModuleForUser({
    moduleId,
    user: {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
      educationLevel: user.educationLevel,
      birthDate: user.birthDate,
    },
  });
  if (!mod) return { error: "Modul tidak dapat diakses" };

  const updated = await updateModuleProgress({ moduleId, userId: user.id, progress });
  await logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "MODULE_PROGRESS",
    entity: "MODULE",
    entityId: moduleId,
    metadata: { progress: updated.progress, completed: updated.completed },
  });
  revalidatePath("/dashboard/murid", "layout");
  return { ok: true };
}

export async function startQuizAction(quizId: string) {
  const user = await requireRole("MURID");

  // Scope + SIM rule: cek manual dengan multi-sekolah
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      status: "ACTIVE",
      deletedAt: null,
      ...(user.educationLevel === "SMA" || user.educationLevel === "SIM"
        ? { educationLevel: { in: ["SMA", "SIM"] } }
        : { educationLevel: user.educationLevel ?? undefined }),
    },
    include: { questions: true, quizToSchools: { select: { schoolId: true } } },
  });
  if (!quiz) return { error: "Kuis tidak dapat diakses" };

  // Modul/kunci SIM hanya untuk murid >= 17 tahun
  if (quiz.educationLevel === "SIM" && !canAccessSim(user.birthDate)) {
    return { error: "Modul SIM tersedia setelah Anda berusia 17 tahun." };
  }

  const targets = quiz.quizToSchools.map((s) => s.schoolId);
  const hasTargets = targets.length > 0;
  const globalQuiz = quiz.schoolId == null && !hasTargets;
  if (
    !globalQuiz &&
    quiz.schoolId !== user.schoolId &&
    !(user.schoolId && targets.includes(user.schoolId))
  ) {
    return { error: "Kuis tidak dapat diakses" };
  }

  const attempts = await prisma.quizAttempt.count({
    where: { quizId: quiz.id, userId: user.id },
  });
  if (quiz.maxAttempts != null && attempts >= quiz.maxAttempts) {
    return { error: "Batas pengerjaan kuis telah tercapai" };
  }

  redirect(`/dashboard/murid/quiz/${quiz.id}`);
}

export async function saveQuizAnswers(input: {
  attemptId: string;
  answers: { questionId: string; selectedOption: "A" | "B" | "C" | "D" }[];
}) {
  const user = await requireRole("MURID");
  const result = await submitQuiz(user, input);
  if (!result.success) return { error: result.message };
  revalidatePath("/dashboard/murid/quiz", "layout");
  return {
    ok: true,
    score: result.result.score,
    passed: result.result.passed,
    total: result.result.total,
    correct: result.result.correct,
  };
}