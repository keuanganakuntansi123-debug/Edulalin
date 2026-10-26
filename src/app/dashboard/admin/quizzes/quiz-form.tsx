"use client";

import { useState, useTransition } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { MultiSchoolSelect } from "@/components/upload/multi-school-select";
import { FileUpload } from "@/components/upload/file-upload";
import { UploadCloud, X, CheckCircle2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { PdfReviewModal, type ReviewQuestion } from "./pdf-review-modal";

type UploadedMeta = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  storedName?: string;
};

type PdfExtractResult = {
  fileId: string;
  originalName: string;
  extracted: number;
  questions: ReviewQuestion[];
};

/**
 * Baca JSON dengan aman. Server dapat membalas teks biasa (mis. halaman error
 * platform atau "Request Entity Too Large") sehingga `res.json()` langsung
 * akan melempar error parse yang tidak informatif.
 */
async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function QuizForm({
  modules,
  schools,
  action,
}: {
  modules: { id: string; title: string }[];
  schools: { id: string; name: string; educationLevel?: string }[];
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; id?: string } | void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"manual" | "pdf">("manual");
  const [pdfFile, setPdfFile] = useState<UploadedMeta | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfExtractResult | null>(null);
  const [educationLevel, setEducationLevel] = useState("SMA");
  const [isSim, setIsSim] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewed, setReviewed] = useState<ReviewQuestion[] | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  const effectiveLevel = isSim ? "SIM" : educationLevel;
  const isSimSelected = isSim;
  const canSim = educationLevel === "SMA" || educationLevel === "SMK";

  const changeLevel = (v: string) => {
    setEducationLevel(v);
    if (v !== "SMA" && v !== "SMK") setIsSim(false);
  };

  const missingAnswers = pdfResult
    ? pdfResult.questions.filter((q) => !q.answer).length
    : 0;
  const finalQuestions = reviewed ?? pdfResult?.questions ?? [];

  const submit = (formData: FormData) => {
    startTransition(async () => {
      formData.set("educationLevel", effectiveLevel);
      if (mode === "pdf" && pdfResult) {
        // Re-ekstrak pratinjau yang sudah diedit admin (kunci, pembahasan)
        const questions = finalQuestions.map((q) => ({
          text: q.text,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          answer: q.answer ?? null,
          explanation: q.explanation ?? null,
        }));
        const res = await fetch("/api/quiz-pdf-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            minScore: Number(formData.get("minScore") ?? 60),
            moduleId: String(formData.get("moduleId") ?? ""),
            schoolIds: formData.getAll("schoolIds").map(String),
            sourceFileId: pdfResult.fileId,
            educationLevel: effectiveLevel,
            shuffle: formData.get("shuffle") === "on",
            showDiscussion: formData.get("showDiscussion") === "on",
            questions,
          }),
        });
        const data = await readJsonSafe<{ id?: string; extracted?: number; error?: string }>(res);
        if (!res.ok || !data) {
          toast({
            title: "Gagal",
            description: data?.error ?? "Gagal membuat kuis",
            variant: "error",
          });
          return;
        }
        toast({
          title: "Kuis draft dibuat",
          description: `${data.extracted ?? questions.length} soal diekstrak. Periksa sebelum menerbitkan.`,
          variant: "success",
        });
        router.push(`/dashboard/admin/quizzes/${data.id}`);
        return;
      }
      const res = await action(formData);
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else if (res && "id" in res && res.id) {
        toast({
          title: "Kuis draft dibuat",
          description: "Tambahkan soal sebelum menerbitkan.",
          variant: "success",
        });
        router.push(`/dashboard/admin/quizzes/${res.id}`);
      } else {
        toast({ title: "Kuis disimpan", variant: "success" });
      }
    });
  };

  const handlePdf = async (file: UploadedMeta) => {
    setPdfFile(file);
    setPdfResult(null);
    setReviewed(null);
    const storedName =
      file.storedName ?? decodeURIComponent(file.url.replace("/api/files/", ""));
    const res = await fetch(`/api/extract-pdf?storedName=${encodeURIComponent(storedName)}`);
    if (res.ok) {
      const data = await readJsonSafe<{
        fileId: string;
        originalName: string;
        extracted: number;
        questions?: ReviewQuestion[];
        warning?: string;
      }>(res);
      if (!data) {
        toast({
          title: "Ekstraksi gagal",
          description: "Server tidak mengembalikan hasil yang valid. Coba unggah ulang PDF.",
          variant: "error",
        });
        setPdfFile(null);
        return;
      }
      const questions: ReviewQuestion[] = (data.questions ?? []).map((q) => ({
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        answer: q.answer ?? null,
        explanation: q.explanation ?? null,
      }));
      setPdfResult({ fileId: data.fileId, originalName: data.originalName, extracted: data.extracted, questions });
      if (data.extracted === 0) {
        toast({
          title: "Belum ada soal terbaca",
          description: data.warning ?? "PDF tidak memiliki soal pilihan ganda yang terstruktur. Anda dapat buat draf kosong lalu tambahkan soal secara manual, atau unggah file lain.",
          variant: "error",
        });
      } else {
        toast({ title: "Soal diekstrak", description: `${data.extracted} soal ditemukan`, variant: "success" });
      }
    } else {
      const err = await readJsonSafe<{ error?: string }>(res);
      toast({
        title: "Ekstraksi gagal",
        description: err?.error ?? "Gagal membaca PDF",
        variant: "error",
      });
      setPdfFile(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["manual", "pdf"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mode === m ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-slate-200"
            }`}
          >
            {m === "manual" ? "Buat Manual" : "Upload PDF Soal"}
          </button>
        ))}
      </div>

      <form action={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Judul Quiz</Label>
          <Input id="title" name="title" placeholder="Judul kuis" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea id="description" name="description" placeholder="Deskripsi kuis" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="moduleId">Modul Terkait</Label>
            <Select id="moduleId" name="moduleId" defaultValue="">
              <option value="">Tanpa modul</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="minScore">Nilai Minimum</Label>
            <Input id="minScore" name="minScore" type="number" min={0} max={100} defaultValue={60} />
          </div>
        </div>

        <MultiSchoolSelect
          schools={schools}
          helper={
            isSimSelected
              ? "Kuis SIM hanya dapat ditujukan ke sekolah SMA/SMK. Sekolah lain otomatis tidak tersedia."
              : "Pilih satu atau beberapa sekolah tujuan. Hanya sekolah dengan jenjang sesuai yang tampil."
          }
          filterLevels={isSimSelected ? ["SMA", "SMK"] : [educationLevel]}
        />

        <div className="grid gap-2">
          <Label htmlFor="educationLevel">Jenjang Kuis</Label>
          <Select
            id="educationLevel"
            name="educationLevel"
            value={educationLevel}
            onChange={(e) => changeLevel(e.target.value)}
          >
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
            <option value="SMK">SMK</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Kuis hanya tampil untuk murid pada jenjang yang dipilih. SMA dan SMK dikelola terpisah.
          </p>
        </div>

        {canSim && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSim}
              onChange={(e) => setIsSim(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary"
            />
            <span>
              <span className="font-medium">SIM</span> — kuis khusus dalam kategori {educationLevel}{" "}
              (SIM/Selamat Indonesia Mengemudi, usia 17+)
            </span>
          </label>
        )}

        {mode === "pdf" && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
            {pdfResult ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">{pdfResult.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {pdfResult.extracted} soal berhasil diekstrak. Kuis dibuat sebagai draf agar Anda dapat memeriksa dan mengisi kunci jawaban sebelum menerbitkan.
                  </p>
                  {missingAnswers > 0 && (
                    <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      ⚠️ {missingAnswers} soal tidak memiliki kunci jawaban terbaca. Periksa dan isi kunci jawaban
                      sebelum menerbitkan kuis.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
                    >
                      <Eye className="h-4 w-4" />
                      Periksa PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfResult(null);
                        setReviewed(null);
                        setPdfFile(null);
                        setUploadKey((k) => k + 1);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Upload Ulang PDF
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload Ulang PDF mengganti file saat Anda memilih file baru. Periksa PDF untuk melihat pratinjau PDF asli dan hasil ekstraksi.
                  </p>
                </div>
              </div>
            ) : pdfFile ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-primary" />
                  <span className="truncate">{pdfFile.originalName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label="Hapus file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <FileUpload
                key={uploadKey}
                kind="QUIZ_PDF"
                accept=".pdf"
                label="Unggah PDF Berisi Soal"
                onUploaded={handlePdf}
                onError={() => setPdfFile(null)}
              />
            )}
          </div>
        )}

        <PdfReviewModal
          quizId=""
          sourceUrl={pdfFile?.url ?? null}
          sourceName={pdfResult?.originalName}
          initial={pdfResult
            ? { extracted: pdfResult.extracted, questions: pdfResult.questions }
            : null}
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          onUpdated={(questions) => {
            setReviewed(questions);
            setPdfResult((prev) => (prev ? { ...prev, questions } : prev));
          }}
        />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="shuffle" /> Acak soal/opsi
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showDiscussion" defaultChecked /> Tampilkan pembahasan
        </label>

        <Button type="submit" className="w-full" disabled={pending || (mode === "pdf" && !pdfResult)}>
          {pending ? "Menyimpan..." : mode === "pdf" ? "Buat Kuis dari PDF (Draft)" : "Simpan Quiz"}
        </Button>
      </form>
    </div>
  );
}