import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import { startQuizAction } from "@/app/actions/murid-actions";
import { canAccessSim } from "@/lib/module-service";

export const instant = false;

async function startQuizLocal(quizId: string) {
  "use server";
  await startQuizAction(quizId);
}

export default async function QuizPage() {
  const user = await requireRole("MURID");
  const simAllowed = canAccessSim(user.birthDate);

  const quizzes = await prisma.quiz.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      AND: [
        {
          OR: [
            { schoolId: null },
            ...(user.schoolId
              ? [
                  { schoolId: user.schoolId },
                  { quizToSchools: { some: { schoolId: user.schoolId } } },
                ]
              : []),
          ],
        },
        user.educationLevel === "SMA"
          ? { educationLevel: { in: ["SMA", "SIM"] } }
          : user.educationLevel === "SMK"
            ? { educationLevel: { in: ["SMK", "SIM"] } }
          : { educationLevel: user.educationLevel ?? undefined },
      ],
    },
    include: {
      _count: { select: { questions: true } },
      attempts: {
        where: { userId: user.id },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
      module: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const visibleQuizzes = quizzes.filter(
    (q) => q.educationLevel !== "SIM" || simAllowed
  );
  const hasSimQuizLocked = quizzes.some(
    (q) => q.educationLevel === "SIM" && !simAllowed
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Quiz Interaktif</h1>
      <p className="mt-1 text-muted-foreground">Uji pemahamanmu setelah mempelajari materi.</p>

      {hasSimQuizLocked && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Modul SIM tersedia setelah Anda berusia 17 tahun. Kuis SIM akan terbuka otomatis saat Anda memenuhi syarat usia.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleQuizzes.map((q) => {
          const last = q.attempts[0];
          const remaining = q.maxAttempts != null
            ? Math.max(0, q.maxAttempts - q.attempts.length)
            : Infinity;
          const simLocked = q.educationLevel === "SIM" && !simAllowed;
          return (
            <Card key={q.id} className={simLocked ? "border-amber-300 bg-amber-50/40" : "hover:shadow-md transition-shadow"}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <Badge variant={simLocked ? "warning" : "secondary"}>
                    {q.educationLevel === "SIM" ? "SMA/SMK" : LEVEL_LABEL[q.educationLevel]}
                  </Badge>
                  {q.module && <Badge className="bg-slate-100 text-slate-600">Modul</Badge>}
                </div>
                <h3 className="mt-3 font-semibold line-clamp-1">{q.title}</h3>
                {simLocked ? (
                  <>
                    <p className="mt-1 text-sm text-amber-700">
                      Modul SIM tersedia setelah Anda berusia 17 tahun.
                    </p>
                    <div className="mt-4 rounded-lg bg-amber-100 p-2 text-center text-sm font-medium text-amber-800">
                      🔒 Terkunci
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.description}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <ClipboardList className="h-4 w-4" /> {q._count.questions} soal
                      <span>•</span> Lulus ≥ {q.minScore}
                      {q.maxAttempts != null && <span>•</span>}
                      {q.maxAttempts != null && <span>Sisa {remaining}x</span>}
                    </div>
                    {last?.status === "COMPLETED" && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
                        {last.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>
                          Terakhir: {last.score ?? 0}/100 · {last.passed ? "Lulus" : "Belum lulus"}
                        </span>
                      </div>
                    )}
                    <form action={startQuizLocal.bind(null, q.id)} className="mt-4">
                      <Button
                        type="submit"
                        className="w-full"
                        variant={q.attempts.length > 0 ? "outline" : "default"}
                        disabled={remaining === 0}
                      >
                        {q.attempts.length > 0 ? (remaining === 0 ? "Batas tercapai" : "Kerjakan Lagi") : "Mulai Quiz"}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

        {visibleQuizzes.length === 0 && (
          <Card className="mt-6">
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">Belum ada kuis untuk jenjang Anda.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
