"use client";

import { useTransition } from "react";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { saveSiteContent } from "@/app/actions/content-actions";

export function SiteContentForm({
  keyName,
  initial,
  hint,
}: {
  keyName: string;
  initial: { title: string; body: string };
  hint?: string;
}) {
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await saveSiteContent(formData);
      if (res?.ok) {
        toast({ title: "Konten disimpan", description: "Perubahan langsung tampil di halaman publik.", variant: "success" });
      } else {
        toast({ title: "Gagal menyimpan", description: res?.error ?? "Terjadi kesalahan.", variant: "error" });
      }
    });
  };

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="key" value={keyName} />
      <div className="grid gap-2">
        <Label htmlFor={`title-${keyName}`}>Judul</Label>
        <Input id={`title-${keyName}`} name="title" defaultValue={initial.title} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`body-${keyName}`}>Isi</Label>
        {keyName === "FAQ" ? (
          <Textarea
            id={`body-${keyName}`}
            name="body"
            defaultValue={initial.body}
            rows={8}
            className="font-mono text-xs"
          />
        ) : (
          <Textarea
            id={`body-${keyName}`}
            name="body"
            defaultValue={initial.body}
            rows={3}
          />
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan Konten"}
      </Button>
    </form>
  );
}