import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel, DISPLAY_CATEGORIES, DISPLAY_CATEGORY_LABEL, categoryOf } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuizForm } from "./quiz-form";
import { createQuiz, archiveQuiz, deleteQuiz } from "@/app/actions/admin-actions";
import Link from "next/link";
import { DeleteQuizButton } from "./delete-quiz-button";

export const instant = false;

async function archiveQuizAction(id: string) {
  "use server";
  await archiveQuiz(id);
}

async function deleteQuizAction(id: string) {
  "use server";
  await deleteQuiz(id);
}

export default async function AdminQuizzesPage() {
  await requireRole("ADMIN");

  const [quizzes, modules, schools] = await Promise.all([
    prisma.quiz.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        questions: { orderBy: { order: "asc" } },
        module: { select: { title: true } },
        school: { select: { name: true } },
        quizToSchools: { include: { school: { select: { name: true } } } },
      },
    }),
    prisma.module.findMany({ where: { deletedAt: null, status: "ACTIVE" }, orderBy: { title: "asc" } }),
    prisma.school.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);
  const byCategory = DISPLAY_CATEGORIES.map((c) => ({
    category: c,
    label: DISPLAY_CATEGORY_LABEL[c],
    quizzes: quizzes.filter((q) => categoryOf(q.educationLevel) === c),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kelola Quiz</h1>
          <p className="text-muted-foreground">Buat kuis, atur soal, dan kelola status.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {byCategory.map(({ category, label, quizzes: qs }) => (
            <details key={category} className="w-full" open={qs.length > 0}>
              <summary className="flex cursor-pointer select-none items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary/50">
                <span>
                  Kategori {label}
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {qs.length}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">klik untuk buka/tutup</span>
              </summary>
              <div className="mt-3 space-y-3">
                {qs.map((q) => (
                  <Card key={q.id}>
                    <CardContent className="pt-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{q.title}</h3>
                            <Badge variant="secondary">{levelDisplayLabel(q.educationLevel)}</Badge>
                            {q.quizToSchools.length > 0 ? (
                              <Badge variant="warning">{q.quizToSchools.length} sekolah</Badge>
                            ) : q.school ? (
                              <Badge variant="warning">{q.school.name}</Badge>
                            ) : (
                              <Badge variant="outline">Global</Badge>
                            )}
                            {q.status === "ACTIVE" ? (
                              <Badge variant="success">Aktif</Badge>
                            ) : q.status === "DRAFT" ? (
                              <Badge variant="warning">Draft</Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {q.questions.length} soal • lulus ≥ {q.minScore}
                            {q.module ? ` • Modul: ${q.module.title}` : ""}
                            {q.sourceType === "PDF" ? " • Dari PDF" : ""}
                          </p>
                          {q.quizToSchools.length > 0 && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              Tujuan: {q.quizToSchools.map((s) => s.school.name).join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link href={`/dashboard/admin/quizzes/${q.id}`}>
                            <Button size="sm" variant="outline">
                              {q.status === "DRAFT" ? "Periksa Draft" : "Kelola Soal"}
                            </Button>
                          </Link>
                          <form action={archiveQuizAction.bind(null, q.id)}>
                            <Button type="submit" size="sm" variant="ghost" className="text-amber-600">Arsipkan</Button>
                          </form>
                          <DeleteQuizButton
                            quizTitle={q.title}
                            action={deleteQuizAction.bind(null, q.id)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {qs.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Belum ada kuis pada kategori {label}.
                    </CardContent>
                  </Card>
                )}
              </div>
            </details>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buat Quiz Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <QuizForm
              modules={modules.map((m) => ({ id: m.id, title: m.title }))}
              schools={schools.map((s) => ({ id: s.id, name: s.name }))}
              action={createQuiz}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
