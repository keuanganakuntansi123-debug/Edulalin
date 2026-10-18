import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { levelDisplayLabel, contentLevelsForMurid } from "@/lib/constants";
import { canAccessSim } from "@/lib/module-service";
import { QuizRunner } from "./quiz-runner";

export const instant = false;

export default async function QuizAttemptPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const user = await requireRole("MURID");

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      status: "ACTIVE",
      deletedAt: null,
      AND: [
        {
          educationLevel: { in: contentLevelsForMurid(user.educationLevel) },
        },
        {
          OR: [
            {
              schoolId: null,
              quizToSchools: { none: {} },
            },
            ...(user.schoolId
              ? [
                  { schoolId: user.schoolId },
                  { quizToSchools: { some: { schoolId: user.schoolId } } },
                ]
              : []),
          ],
        },
      ],
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      module: { select: { title: true } },
    },
  });

  if (!quiz) notFound();
  if (quiz.educationLevel === "SIM" && !canAccessSim(user.birthDate)) notFound();
  if (quiz.questions.length === 0) redirect("/dashboard/murid/quiz");

  // Reuse attempt IN_PROGRESS yang menggantung (dibuka lalu ditinggalkan)
  // supaya tidak menghabiskan slot maxAttempts.
  const existing = await prisma.quizAttempt.findFirst({
    where: { quizId: quiz.id, userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  const attempt =
    existing ??
    (await (async () => {
      const attempts = await prisma.quizAttempt.count({
        where: { quizId: quiz.id, userId: user.id, status: "COMPLETED" },
      });
      if (quiz.maxAttempts != null && attempts >= quiz.maxAttempts) {
        redirect("/dashboard/murid/quiz");
      }
      return prisma.quizAttempt.create({
        data: { quizId: quiz.id, userId: user.id, status: "IN_PROGRESS" },
      });
    })());
  logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "QUIZ_START",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { attemptId: attempt.id },
  }).catch(() => undefined);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {levelDisplayLabel(quiz.educationLevel)}{quiz.module ? ` • ${quiz.module.title}` : ""}
          </p>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
        </div>
        <span className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium">
          {quiz.questions.length} soal
        </span>
      </div>

      <QuizRunner
        attemptId={attempt.id}
        questions={quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: [
            { key: "A", text: q.optionA },
            { key: "B", text: q.optionB },
            { key: "C", text: q.optionC },
            { key: "D", text: q.optionD },
          ],
        }))}
        minScore={quiz.minScore}
        showDiscussion={quiz.showDiscussion}
      />
    </div>
  );
}
