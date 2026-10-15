"use client";

import { useState } from "react";
import { useTransition } from "react";
import { saveProgressAction } from "@/app/actions/murid-actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function SaveProgressForm({
  moduleId,
  currentProgress,
}: {
  moduleId: string;
  currentProgress: number;
}) {
  const [progress, setProgress] = useState(currentProgress);
  const [pending, startTransition] = useTransition();

  const save = (value: number) => {
    setProgress(value);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("moduleId", moduleId);
      fd.set("progress", String(value));
      const result = await saveProgressAction(fd);
      if (result && "error" in result) {
        toast({ title: "Gagal menyimpan", description: String(result.error), variant: "error" });
      } else {
        toast({ title: "Progress tersimpan", variant: "success" });
      }
    });
  };

  return (
    <div className="mt-4">
      <input
        type="range"
        min={0}
        max={100}
        step={10}
        value={progress}
        onChange={(e) => setProgress(Number(e.target.value))}
        className="w-full"
        aria-label="Progres modul"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {[25, 50, 75, 100].map((v) => (
          <Button
            key={v}
            type="button"
            variant={progress >= v ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => save(v)}
          >
            {v}%
          </Button>
        ))}
        <Button
          type="button"
          variant="accent"
          size="sm"
          disabled={pending}
          onClick={() => save(100)}
        >
          Tandai Selesai
        </Button>
      </div>
      {pending && <p className="mt-2 text-sm text-muted-foreground">Menyimpan...</p>}
    </div>
  );
}