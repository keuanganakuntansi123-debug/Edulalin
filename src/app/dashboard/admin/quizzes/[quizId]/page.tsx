import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Trash2, Send } from "lucide-react";
import { addQuestion, publishQuiz, deleteQuestion, editQuestion } from "@/app/actions/admin-actions";
import { QuestionForm } from "./question-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function AdminQuizDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { quizId } = await params;
  const { edit } = await searchParams;
  await requireRole("ADMIN");

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, deletedAt: null },
    include: {
      questions: { orderBy: { order: "asc" } },
      quizToSchools: { include: { school: { select: { name: true } } } },
      module: { select: { title: true } },
    },
  });
  if (!quiz) notFound();

  const missingKeys = quiz.questions.filter((q) => !q.correctOption).length;
  const editingQuestion = edit ? quiz.questions.find((q) => q.id === edit) : undefined;

  return (
    <div>
      <Link href="/dashboard/admin/quizzes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar kuis
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Kelola Soal — {quiz.title}</h1>
        {quiz.status === "DRAFT" ? (
          <Badge variant="warning">Draft</Badge>
        ) : quiz.status === "ACTIVE" ? (
          <Badge variant="success">Aktif</Badge>
        ) : (
          <Badge variant="secondary">Nonaktif</Badge>
        )}
      </div>
      <p className="mt-1 text-muted-foreground">
        {quiz.questions.length} soal terdaftar. Kuis dinilai otomatis di server.
        {quiz.quizToSchools.length > 0 && (
          <> • Tujuan: {quiz.quizToSchools.map((s) => s.school.name).join(", ")}</>
        )}
        {quiz.sourceType === "PDF" && " • Bersumber dari PDF"}
      </p>

      {quiz.status === "DRAFT" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span className="flex-1">
            Kuis masih draf. {missingKeys > 0 ? `${missingKeys} soal belum memiliki kunci jawaban.` : "Semua soal sudah memiliki kunci jawaban."} Periksa dan terbitkan agar terlihat murid.
          </span>
          <form action={publishQuizAction.bind(null, quiz.id)}>
            <Button size="sm" type="submit" disabled={missingKeys > 0}>
              <Send className="h-4 w-4" /> Terbitkan Kuis
            </Button>
          </form>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {quiz.questions.map((q, i) => (
            <Card key={q.id} className={!q.correctOption ? "border-amber-300 bg-amber-50/30" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    <span className="mr-1 text-muted-foreground">{i + 1}.</span> {q.text}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <Link href={`/dashboard/admin/quizzes/${quiz.id}?edit=${q.id}`}>
                      <Button size="sm" variant="ghost" aria-label="Edit soal">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <form action={deleteQuestionAction.bind(null, q.id, quiz.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-red-600" aria-label="Hapus soal">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                  {(["A", "B", "C", "D"] as const).map((opt) => (
                    <p key={opt} className={q.correctOption === opt ? "font-medium text-emerald-600" : "text-muted-foreground"}>
                      {opt}. {q[`option${opt}`]}
                    </p>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Bobot: {q.weight}</span>
                  {!q.correctOption && <Badge variant="warning">Belum ada kunci</Badge>}
                  {q.correctOption && <Badge variant="success">Kunci: {q.correctOption}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
          {quiz.questions.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Belum ada soal. Tambahkan soal pertama di form samping.
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingQuestion ? "Edit Soal" : "Tambah Soal"}</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionForm
              quizId={quiz.id}
              action={editingQuestion ? editQuestion.bind(null, editingQuestion.id) : addQuestion}
              defaultValues={
                editingQuestion
                  ? {
                      id: editingQuestion.id,
                      text: editingQuestion.text,
                      optionA: editingQuestion.optionA,
                      optionB: editingQuestion.optionB,
                      optionC: editingQuestion.optionC,
                      optionD: editingQuestion.optionD,
                      correctOption: editingQuestion.correctOption,
                      weight: editingQuestion.weight,
                      explanation: editingQuestion.explanation,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function publishQuizAction(id: string) {
  "use server";
  await publishQuiz(id);
}

async function deleteQuestionAction(id: string, quizId: string) {
  "use server";
  await deleteQuestion(id, quizId);
}
