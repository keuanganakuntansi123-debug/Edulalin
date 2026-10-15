"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreUser, permanentDeleteUser } from "@/app/actions/admin-actions";

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
        window.alert(result.error);
      } else {
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
        window.alert(result.error);
      } else {
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