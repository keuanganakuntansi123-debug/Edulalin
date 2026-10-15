"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function QuestionForm({
  quizId,
  action,
  defaultValues,
}: {
  quizId: string;
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string } | void>;
  defaultValues?: {
    id?: string;
    text?: string;
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
    correctOption?: string | null;
    weight?: number;
    explanation?: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!defaultValues?.id;

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await action(formData);
      if (res && "error" in res) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: isEdit ? "Soal diperbarui" : "Soal ditambahkan", variant: "success" });
      }
    });
  };

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="quizId" value={quizId} />
      {defaultValues?.id && <input type="hidden" name="questionId" value={defaultValues.id} />}
      <div className="grid gap-2">
        <Label htmlFor="text">Pertanyaan</Label>
        <Textarea id="text" name="text" placeholder="Teks pertanyaan" defaultValue={defaultValues?.text} required />
      </div>
      {(["A", "B", "C", "D"] as const).map((opt) => (
        <div className="grid gap-2" key={opt}>
          <Label htmlFor={`option${opt}`}>Opsi {opt}</Label>
          <Input id={`option${opt}`} name={`option${opt}`} placeholder={`Jawaban ${opt}`} defaultValue={defaultValues?.[`option${opt}`] ?? ""} required />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="correctOption">Jawaban Benar</Label>
          <Select id="correctOption" name="correctOption" defaultValue={defaultValues?.correctOption ?? ""}>
            <option value="">Belum ditentukan</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="weight">Bobot</Label>
          <Input id="weight" name="weight" type="number" min={1} defaultValue={defaultValues?.weight ?? 1} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="explanation">Penjelasan (opsional)</Label>
        <Textarea id="explanation" name="explanation" placeholder="Pembahasan jawaban" defaultValue={defaultValues?.explanation ?? ""} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Soal"}
        </Button>
        {isEdit && (
          <Button type="reset" variant="ghost" onClick={() => router.push(`/dashboard/admin/quizzes/${quizId}`)}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}