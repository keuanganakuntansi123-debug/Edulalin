"use client";

import { useState, useTransition } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { MultiSchoolSelect } from "@/components/upload/multi-school-select";
import { FileUpload } from "@/components/upload/file-upload";
import { UploadCloud, X, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

type UploadedMeta = { id: string; url: string; originalName: string; mimeType: string };

type PdfExtractResult = {
  fileId: string;
  originalName: string;
  extracted: number;
  questions: { text: string; optionA: string; optionB: string; optionC: string; optionD: string; answer?: string }[];
};

export function QuizForm({
  modules,
  schools,
  action,
}: {
  modules: { id: string; title: string }[];
  schools: { id: string; name: string }[];
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; id?: string } | void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"manual" | "pdf">("manual");
  const [pdfFile, setPdfFile] = useState<UploadedMeta | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfExtractResult | null>(null);
  const [educationLevel, setEducationLevel] = useState("SMA");

  const missingAnswers = pdfResult
    ? pdfResult.questions.filter((q) => !q.answer).length
    : 0;

  const submit = (formData: FormData) => {
    startTransition(async () => {
      if (mode === "pdf" && pdfResult) {
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
            educationLevel,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({ title: "Gagal", description: data.error ?? "Gagal membuat kuis", variant: "error" });
          return;
        }
        toast({
          title: "Kuis draft dibuat",
          description: `${data.extracted ?? pdfResult.extracted} soal diekstrak. Periksa sebelum menerbitkan.`,
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
    const storedName = file.url.split("/").pop() ?? "";
    const res = await fetch(`/api/extract-pdf?storedName=${encodeURIComponent(storedName)}`);
    if (res.ok) {
      const data = await res.json();
      setPdfResult({ fileId: data.fileId, originalName: data.originalName, extracted: data.extracted, questions: data.questions });
      toast({ title: "Soal diekstrak", description: `${data.extracted} soal ditemukan`, variant: "success" });
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Ekstraksi gagal", description: err.error ?? "Gagal membaca PDF", variant: "error" });
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
          helper="Pilih satu atau beberapa sekolah tujuan. Kuis tidak otomatis terbit ke semua sekolah."
        />

        <div className="grid gap-2">
          <Label htmlFor="educationLevel">Jenjang Kuis</Label>
          <Select
            id="educationLevel"
            name="educationLevel"
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
          >
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
            <option value="SMK">SMK</option>
            <option value="SIM">SIM</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Kuis hanya tampil untuk murid pada jenjang yang dipilih. SMA dan SMK dikelola terpisah.
          </p>
        </div>

        {mode === "pdf" && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
            {pdfResult ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">{pdfResult.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {pdfResult.extracted} soal berhasil diekstrak. Kuis dibuat sebagai draf agar Anda dapat memeriksa dan mengisi kunci jawaban sebelum menerbitkan.
                  </p>
                  {missingAnswers > 0 && (
                    <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      ⚠️ {missingAnswers} soal tidak memiliki kunci jawaban terbaca. Periksa dan isi kunci jawaban
                      sebelum menerbitkan kuis.
                    </p>
                  )}
                  <div className="mt-3 grid gap-1">
                    {pdfResult.questions.slice(0, 3).map((q, i) => (
                      <p key={i} className="line-clamp-1 rounded bg-white p-2 text-xs text-muted-foreground">
                        {i + 1}. {q.text}
                      </p>
                    ))}
                    {pdfResult.questions.length > 3 && (
                      <p className="text-xs text-muted-foreground">… dan {pdfResult.questions.length - 3} soal lainnya</p>
                    )}
                  </div>
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
                kind="QUIZ_PDF"
                accept=".pdf"
                label="Unggah PDF Berisi Soal"
                onUploaded={handlePdf}
                onError={() => setPdfFile(null)}
              />
            )}
          </div>
        )}

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