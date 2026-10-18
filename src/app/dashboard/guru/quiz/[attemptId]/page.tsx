import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttemptDetailQuestions } from "@/components/quiz/attempt-detail-questions";
import { PrintSingleAttemptButton } from "../print-scores-client";

export const instant = false;

export default async function GuruQuizAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireRole("GURU");

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: {
        select: {
          name: true,
          classLevel: true,
          major: true,
          educationLevel: true,
          schoolId: true,
          school: { select: { name: true } },
        },
      },
      quiz: { select: { title: true, minScore: true, educationLevel: true } },
      answers: true,
    },
  });
  if (!attempt || attempt.status !== "COMPLETED") notFound();
  if (attempt.user.schoolId !== user.schoolId) notFound();

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
      <Link href="/dashboard/guru/quiz" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Kuis Murid
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Detail Hasil Kuis</h1>
          <p className="mt-1 text-muted-foreground">
            {attempt.user.name}
            {attempt.user.educationLevel ? ` • ${levelDisplayLabel(attempt.user.educationLevel)}` : ""}
            {attempt.user.classLevel ? ` • Kelas ${attempt.user.classLevel}` : ""}
            {attempt.user.major ? ` • ${attempt.user.major}` : ""} • {attempt.quiz.title}
          </p>
        </div>
        <PrintSingleAttemptButton
          attempt={{
            id: attempt.id,
            studentName: attempt.user.name,
            className: attempt.user.classLevel,
            major: attempt.user.major,
            educationLevel: attempt.user.educationLevel,
            schoolName: attempt.user.school?.name ?? "-",
            quizTitle: attempt.quiz.title,
            score: attempt.score ?? 0,
            passed: attempt.passed ?? false,
            minScore: attempt.quiz.minScore,
            submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
          }}
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-border bg-white p-4 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">Nama Murid:</span> <span className="font-medium">{attempt.user.name}</span></p>
        <p><span className="text-muted-foreground">Sekolah:</span> <span className="font-medium">{attempt.user.school?.name ?? "-"}</span></p>
        <p><span className="text-muted-foreground">Jenjang:</span> <span className="font-medium">{attempt.user.educationLevel ? levelDisplayLabel(attempt.user.educationLevel) : "-"}</span></p>
        <p><span className="text-muted-foreground">Kelas:</span> <span className="font-medium">{attempt.user.classLevel ?? "-"}</span></p>
        <p><span className="text-muted-foreground">Jurusan:</span> <span className="font-medium">{attempt.user.major ?? "-"}</span></p>
        <p><span className="text-muted-foreground">Kuis:</span> <span className="font-medium">{attempt.quiz.title}</span></p>
      </div>

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
