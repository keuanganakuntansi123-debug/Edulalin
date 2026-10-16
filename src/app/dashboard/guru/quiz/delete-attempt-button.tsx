"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { deleteQuizAttempt } from "@/app/actions/quiz-attempt-actions";

export function DeleteAttemptButton({ attemptId }: { attemptId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await deleteQuizAttempt(attemptId);
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({
          title: "Hasil kuis dihapus",
          description: "Data pengerjaan dan jawaban murid telah dihapus dari database.",
          variant: "success",
        });
        router.refresh();
      }
      setOpen(false);
    });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-red-600 hover:bg-red-50"
        onClick={() => setOpen((v) => !v)}
        aria-label="Hapus hasil kuis"
      >
        <Trash2 className="h-4 w-4" /> Hapus
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-border bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold">Hapus hasil pengerjaan ini?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nilai dan seluruh jawaban murid pada kuis ini akan dihapus permanen dari database. Laporan dan statistik akan diperbarui otomatis.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
