"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Q = {
  id: string;
  text: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
};

type Result = {
  ok: true;
  score: number;
  passed: boolean;
  total: number;
  correct: number;
};

export function QuizRunner({
  attemptId,
  questions,
  minScore,
  onSubmit,
  backHref,
  backLabel,
}: {
  attemptId: string;
  questions: Q[];
  minScore: number;
  onSubmit: (input: {
    attemptId: string;
    answers: { questionId: string; selectedOption: "A" | "B" | "C" | "D" }[];
  }) => Promise<{ ok?: boolean; error?: string; score?: number; passed?: boolean; total?: number; correct?: number } | void>;
  backHref: string;
  backLabel: string;
}) {
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const answeredCount = Object.keys(answers).length;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await onSubmit({
        attemptId,
        answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        })),
      });
      if (res && "error" in res && res.error) {
        setError(String(res.error));
      } else {
        setResult({
          ok: true,
          score: Number(res?.score ?? 0),
          passed: Boolean(res?.passed),
          total: Number(res?.total ?? 0),
          correct: Number(res?.correct ?? 0),
        });
      }
    });
  };

  if (result) {
    return (
      <Card className="mt-6 border-2" style={{ borderColor: result.passed ? "#059669" : "#dc2626" }}>
        <CardContent className="pt-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl">
            {result.passed ? "🎉" : "📚"}
          </div>
          <h2 className="mt-4 text-2xl font-bold">
            {result.passed ? "Selamat, Anda lulus!" : "Belum lulus, tetap semangat!"}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Nilai Anda {result.score}/100 · butuh minimal {minScore} untuk lulus.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Benar {result.correct} dari {result.total} soal.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push(backHref)}>
              {backLabel}
            </Button>
            <Button onClick={() => router.push("/dashboard/polisi/kuis")}>
              Lihat Pemantauan Kuis Murid
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Terjawab: <span className="font-semibold text-foreground">{answeredCount}</span>/{questions.length}
          </p>
          <Button onClick={submit} disabled={pending || answeredCount === 0}>
            {pending ? "Menilai..." : "Kumpulkan Jawaban"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardContent className="pt-5">
            <p className="font-medium">
              <span className="mr-1 text-muted-foreground">{idx + 1}.</span> {q.text}
            </p>
            <div className="mt-3 grid gap-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.key }))}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
