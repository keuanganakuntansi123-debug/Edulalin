"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

/**
 * Tombol hapus artikel dengan konfirmasi. Wajib Client Component —
 * event handler (onSubmit/confirm) tidak dapat dirender di Server Component.
 */
export function DeleteArticleButton({
  articleId,
  onDelete,
}: {
  articleId: string;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Hapus artikel ini? Tindakan tidak dapat dibatalkan.")) return;
    startTransition(async () => {
      try {
        const result = (await onDelete(articleId)) as { ok?: boolean; error?: string } | void;
        if (result && "error" in result && result.error) {
          toast({ title: "Gagal", description: String(result.error), variant: "error" });
          return;
        }
        toast({ title: "Artikel berhasil dihapus", variant: "success" });
        router.refresh();
      } catch (error) {
        toast({
          title: "Gagal",
          description: error instanceof Error ? error.message : "Tidak dapat menghapus artikel.",
          variant: "error",
        });
      }
    });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
      onClick={handleDelete}
      disabled={pending}
      aria-label="Hapus artikel"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}