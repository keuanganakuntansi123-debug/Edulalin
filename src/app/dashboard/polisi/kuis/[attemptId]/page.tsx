import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttemptDetailQuestions } from "@/components/quiz/attempt-detail-questions";

export const instant = false;

export default async function PolisiKuisAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  await requireRole("POLISI");

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { name: true, classLevel: true, school: { select: { name: true } } } },
      quiz: { select: { title: true, minScore: true, educationLevel: true } },
      answers: true,
    },
  });
  if (!attempt || attempt.status !== "COMPLETED") notFound();

  const questions = await prisma.quizQuestion.findMany({
    where: { quizId: attempt.quizId },
    orderBy: { order: "asc" },
  });

  const questionViews = questions.map((q) => {
    const ans = attempt.answers.find((a) => a.questionId === q.id);
    return {
      id: q.id,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      selectedOption: ans?.selectedOption ?? null,
      explanation: q.explanation,
    };
  });

  const correct = attempt.answers.filter((a) => a.isCorrect).length;
  const wrong = attempt.answers.filter((a) => !a.isCorrect).length;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/polisi/kuis" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Kuis Murid
      </Link>

      <h1 className="text-2xl font-bold">Detail Hasil Kuis</h1>
      <p className="mt-1 text-muted-foreground">
        {attempt.user.name}
        {attempt.user.classLevel ? ` • Kelas ${attempt.user.classLevel}` : ""} • {attempt.user.school?.name ?? "-"} • {attempt.quiz.title}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{attempt.score ?? 0}/100</p>
            <p className="text-sm text-muted-foreground">Nilai Akhir</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-emerald-600">{correct}</p>
            <p className="text-sm text-muted-foreground">Jawaban Benar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-red-600">{wrong}</p>
            <p className="text-sm text-muted-foreground">Jawaban Salah</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            {attempt.passed ? <Badge variant="success">Lulus</Badge> : <Badge variant="danger">Belum Lulus</Badge>}
            <p className="mt-1 text-sm text-muted-foreground">Status Kelulusan</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Soal & Jawaban ({questions.length})</h2>
        <p className="text-xs text-muted-foreground">
          Dikerjakan {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("id-ID") : "-"}
        </p>
      </div>

      <div className="mt-4">
        <AttemptDetailQuestions questions={questionViews} />
      </div>
    </div>
  );
}
