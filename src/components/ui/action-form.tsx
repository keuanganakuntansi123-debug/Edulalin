"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toaster";

type ActionResult = { ok?: boolean; error?: string } | void | undefined;

/**
 * Form generik untuk aksi server (toggle/arsip/publish/simpan).
 * - Menampilkan notifikasi modern otomatis saat berhasil ("Data berhasil ...")
 *   atau gagal (pesan error dari server).
 * - Menonaktifkan kontrol saat proses berjalan untuk mencegah klik ganda.
 * - Opsional meminta konfirmasi sebelum menjalankan aksi.
 *
 * Dipakai menggantikan `<form action={serverAction}>` yang tidak memberi
 * umpan balik apa pun kepada pengguna.
 */
export function ActionForm({
  action,
  successMessage,
  errorMessage = "Terjadi kesalahan. Silakan coba lagi.",
  confirmMessage,
  className,
  children,
}: {
  action: () => Promise<ActionResult>;
  successMessage: string;
  errorMessage?: string;
  confirmMessage?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    startTransition(async () => {
      try {
        const result = await action();
        if (result && typeof result === "object" && "error" in result && result.error) {
          toast({ title: "Gagal", description: String(result.error), variant: "error" });
          return;
        }
        toast({ title: successMessage, variant: "success" });
        router.refresh();
      } catch (error) {
        toast({
          title: "Gagal",
          description: error instanceof Error ? error.message : errorMessage,
          variant: "error",
        });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
