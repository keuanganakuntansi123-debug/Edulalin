"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function DeleteQuizButton({
  quizTitle,
  action,
}: {
  quizTitle: string;
  action: () => Promise<{ ok?: boolean; error?: string } | void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await action();
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: "Kuis dihapus", description: "Kuis beserta seluruh soal dan nilainya telah dihapus.", variant: "success" });
      }
      setOpen(false);
    });
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-red-600 hover:bg-red-50"
        onClick={() => setOpen((v) => !v)}
        aria-label="Hapus kuis"
      >
        <Trash2 className="h-4 w-4" /> Hapus
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-border bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold">Hapus kuis ini?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <strong>{quizTitle}</strong> beserta seluruh soal dan nilai murid akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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
      {open && (
        <button
          type="button"
          aria-label="Tutup konfirmasi"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
