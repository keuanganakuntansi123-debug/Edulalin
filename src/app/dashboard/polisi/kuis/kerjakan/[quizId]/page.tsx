import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { levelDisplayLabel } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { policeSaveQuizAnswers } from "@/app/actions/murid-actions";

export const instant = false;

export default async function PolisiKerjakanKuisDetailPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const user = await requireRole("POLISI");

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, status: "ACTIVE", deletedAt: null },
    include: {
      questions: { orderBy: { order: "asc" } },
      module: { select: { title: true } },
      school: { select: { name: true } },
      quizToSchools: { include: { school: { select: { name: true } } } },
    },
  });
  if (!quiz) notFound();
  if (quiz.questions.length === 0) redirect("/dashboard/polisi/kuis/kerjakan");

  const attempt = await prisma.quizAttempt.create({
    data: { quizId: quiz.id, userId: user.id, status: "IN_PROGRESS" },
  });
  logActivity({
    actorId: user.id,
    schoolId: null,
    action: "QUIZ_START",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { attemptId: attempt.id, actorRole: "POLISI" },
  }).catch(() => undefined);

  const targetLabel =
    quiz.quizToSchools.length > 0
      ? quiz.quizToSchools.map((s) => s.school.name).join(", ")
      : quiz.school?.name ?? "Semua Sekolah";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/polisi/kuis/kerjakan" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar kuis
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {levelDisplayLabel(quiz.educationLevel)}{quiz.module ? ` • ${quiz.module.title}` : ""} • {targetLabel}
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
        onSubmit={policeSaveQuizAnswers}
        backHref="/dashboard/polisi/kuis/kerjakan"
        backLabel="Kembali ke Daftar Kuis"
      />
    </div>
  );
}
