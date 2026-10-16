import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttemptQuestionView = {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string | null;
  selectedOption: string | null;
  explanation: string | null;
};

/**
 * Tampilkan seluruh soal beserta jawaban murid, kunci jawaban, dan penanda
 * benar/salah. Dipakai oleh Guru & Polisi (detail hasil pengerjaan kuis).
 */
export function AttemptDetailQuestions({ questions }: { questions: AttemptQuestionView[] }) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const correct = q.correctOption;
        const selected = q.selectedOption;
        const isCorrect = selected != null && selected === correct;
        const unanswered = selected == null;

        return (
          <Card key={q.id} className={cn(isCorrect ? "border-emerald-200" : unanswered ? "" : "border-red-200")}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  <span className="mr-1 text-muted-foreground">Soal {i + 1}.</span> {q.text}
                </p>
                <Badge variant={isCorrect ? "success" : unanswered ? "secondary" : "danger"}>
                  {isCorrect ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Benar</span>
                  ) : unanswered ? (
                    <span className="flex items-center gap-1"><MinusCircle className="h-3 w-3" /> Tidak dijawab</span>
                  ) : (
                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Salah</span>
                  )}
                </Badge>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const text = q[`option${opt}`];
                  const isKey = correct === opt;
                  const isSel = selected === opt;
                  return (
                    <div
                      key={opt}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                        isKey && isSel && "border-emerald-400 bg-emerald-50",
                        isKey && !isSel && "border-emerald-300 bg-emerald-50/60",
                        isSel && !isKey && "border-red-300 bg-red-50",
                        !isKey && !isSel && "border-border bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          isKey ? "bg-emerald-600 text-white" : isSel ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {opt}
                      </span>
                      <span className="flex-1">{text}</span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px]">
                        {isKey && <span className="font-semibold text-emerald-700">Kunci</span>}
                        {isSel && !isKey && <span className="font-semibold text-red-700">Jawaban murid</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  <span className="font-semibold">Pembahasan: </span>
                  {q.explanation}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
