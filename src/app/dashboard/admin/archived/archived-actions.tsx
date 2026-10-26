"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreUser, permanentDeleteUser } from "@/app/actions/admin-actions";
import { toast } from "@/components/ui/toaster";

export function ArchivedActions({
  userId,
  userName,
  className,
}: {
  userId: string;
  userName: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreUser(userId);
      if (result?.error) {
        toast({ title: "Gagal", description: String(result.error), variant: "error" });
      } else {
        toast({ title: "Akun berhasil dipulihkan", variant: "success" });
        router.refresh();
      }
    });
  };

  const handlePermanentDelete = () => {
    const ok = window.confirm(
      `Hapus permanen akun "${userName}"?\n\nAkun, data belajar, sesi, dan file miliknya akan dihapus dari sistem secara permanen dan TIDAK DAPAT dipulihkan kembali.`
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await permanentDeleteUser(userId);
      if (result?.error) {
        toast({ title: "Gagal", description: String(result.error), variant: "error" });
      } else {
        toast({ title: "Akun berhasil dihapus permanen", variant: "success" });
        router.refresh();
      }
    });
  };

  return (
    <div className={className ?? "flex items-center gap-2"}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-emerald-600"
        disabled={isPending}
        onClick={handleRestore}
      >
        <RotateCcw className="h-4 w-4" />
        Pulihkan
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-red-600 hover:bg-red-50"
        disabled={isPending}
        onClick={handlePermanentDelete}
      >
        <Trash2 className="h-4 w-4" />
        Hapus Permanen
      </Button>
    </div>
  );
}