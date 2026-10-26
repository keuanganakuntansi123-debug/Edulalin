"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, RotateCw, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export type ReviewQuestion = {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer?: string | null;
  explanation?: string | null;
  changed?: boolean;
};

export type PdfReviewResult = {
  extracted: number;
  questions: ReviewQuestion[];
};

/** Baca JSON dengan aman (respons platform dapat berupa teks biasa/HTML). */
async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Mengganti PDF lama draf dengan file baru: unggah ulang + ekstrak + simpany
 * seluruh soal (pembahasan & kunci bila terbaca), lalu kembalikan hasil pratinjau.
 */
async function reuploadPdf(
  quizId: string,
  file: File,
  original: PdfReviewResult | null
): Promise<{ ok: true; result: PdfReviewResult } | { ok: false; error: string }> {
  const fd = new FormData();
  fd.append("quizId", quizId);
  fd.append("file", file);
  const res = await fetch("/api/quiz-pdf-reupload", { method: "POST", body: fd });
  const data = await readJsonSafe<{ error?: string; extracted?: number; questions?: PdfReviewResult["questions"] }>(res);
  if (!res.ok || !data) return { ok: false, error: data?.error ?? "Gagal mengganti PDF" };
  return {
    ok: true,
    result: {
      extracted: Number(data.extracted ?? original?.extracted ?? 0),
      questions: (data.questions ?? []).map((q: PdfReviewResult["questions"][number]) => ({
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        answer: q.answer ?? null,
        explanation: q.explanation ?? null,
      })),
    },
  };
}

export function PdfReviewModal({
  quizId,
  sourceUrl,
  sourceName,
  initial,
  open,
  onClose,
  onUpdated,
}: {
  quizId: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
  initial: PdfReviewResult | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (questions: ReviewQuestion[]) => void;
}) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>(initial?.questions ?? []);
  const [pending, startTransition] = useTransition();
  const [reuploading, setReuploading] = useState(false);
  const [tab, setTab] = useState<"pdf" | "soal">("soal");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && initial) {
      const t = setTimeout(() => {
        setQuestions(initial.questions);
        setTab("soal");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open, initial]);

  const missing = questions.filter((q) => !q.answer).length;

  if (!open) return null;

  const update = (idx: number, prev: ReviewQuestion) => (patch: Partial<ReviewQuestion>) => {
    setQuestions((all) => all.map((q, i) => (i === idx ? { ...prev, ...patch, changed: true } : q)));
  };

  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReuploading(true);
    startTransition(async () => {
      const res = await reuploadPdf(quizId, file, initial);
      if (res.ok) {
        setQuestions([...res.result.questions]);
        onUpdated(res.result.questions);
        toast({ title: "PDF diganti", description: `${res.result.extracted} soal diekstrak dari file baru.`, variant: "success" });
      } else {
        toast({ title: "Gagal", description: res.error, variant: "error" });
      }
      setReuploading(false);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-bold">Periksa PDF Kuis</h2>
            <p className="text-xs text-muted-foreground">
              {sourceName ?? "File PDF"} — pratinjau PDF asli dan seluruh hasil ekstraksi. Edit sebelum buat/menerbitkan kuis.
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" aria-label="Tutup" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["soal", "pdf"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-slate-200"
              )}
            >
              {t === "soal" ? `Hasil Ekstraksi (${questions.length})` : "PDF Asli"}
            </button>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleReplace}
        />

        {tab === "pdf" ? (
          <div className="mt-4 grid gap-3 px-5">
            {sourceUrl ? (
              <iframe
                src={sourceUrl}
                title="Pratinjau PDF asli"
                className="h-160 w-full rounded-xl border border-slate-200 bg-slate-50"
              />
            ) : (
              <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                File PDF sumber tidak ditemukan di server. Harap unggah ulang PDF untuk memeriksa.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Pratinjau menggunakan file asli yang terunggah. Pada Vercel, file lama dapat berpindah jika storage serverless
              di-reset — jika pratinjau kosong, gunakan «Upload Ulang PDF» untuk memuat file baru.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3 px-5">
            {questions.length === 0 && (
              <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                Belum ada soal yang terbaca dari PDF. Gunakan «Upload Ulang PDF» untuk memuat file yang benar, atau edit soal
                secara manual di bawah.
              </p>
            )}
            {questions.map((q, idx) => {
              const set = update(idx, q);
              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Soal {idx + 1}</span>
                    {q.changed && <Badge variant="warning">Diedit</Badge>}
                  </div>
                  <div className="grid gap-1.5">
                    <Input
                      aria-label={`Teks soal ${idx + 1}`}
                      value={q.text}
                      onChange={(e) => set({ text: e.target.value })}
                      placeholder="Teks pertanyaan"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["A", "B", "C", "D"] as const).map((opt) => (
                        <div key={opt} className="grid gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Opsi {opt}</span>
                          <Input
                            aria-label={`Opsi ${opt} soal ${idx + 1}`}
                            value={q[`option${opt}`]}
                            onChange={(e) => set({ [`option${opt}`]: e.target.value })}
                            placeholder={`Jawaban ${opt}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Kunci Jawaban</span>
                        <Select
                          aria-label={`Kunci jawaban soal ${idx + 1}`}
                          value={q.answer ?? ""}
                          onChange={(e) => set({ answer: e.target.value || null })}
                        >
                          <option value="">Belum ditentukan</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Pembahasan (opsional)</span>
                        <Input
                          aria-label={`Pembahasan soal ${idx + 1}`}
                          value={q.explanation ?? ""}
                          onChange={(e) => set({ explanation: e.target.value || null })}
                          placeholder="Pembahasan jawaban"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {missing > 0 && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                ⚠️ {missing} soal belum memiliki kunci jawaban. Kuis hanya dapat diterbitkan setelah seluruh soal memiliki
                kunci jawaban yang valid.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
          {quizId ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || reuploading}
              onClick={() => fileRef.current?.click()}
            >
              <RotateCw className={reuploading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {reuploading ? "Ekstrak Ulang..." : "Upload Ulang PDF"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Untuk kuis baru, gunakan «Upload Ulang PDF» di panel file untuk memuat file lain sebelum buat kuis.
            </p>
          )}
          <div className="flex gap-2">
            {sourceUrl && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setTab(tab === "pdf" ? "soal" : "pdf")}>
                <Eye className="h-4 w-4" />
                {tab === "pdf" ? "Vai ke Hasil" : "Vai ke PDF"}
              </Button>
            )}
            <Button type="button" disabled={pending} onClick={() => { onUpdated(questions); onClose(); }}>
              <CheckCircle2 className="h-4 w-4" />
              Simpan Hasil Ekstraksi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}