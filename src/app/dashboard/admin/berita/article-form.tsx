"use client";

import { useRef, useState, useTransition } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { FileUpload } from "@/components/upload/file-upload";
import { ImageIcon, X } from "lucide-react";

type UploadedMeta = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  embedded?: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA",
  SMK: "SMK",
  SIM: "SIM (Selamat Indonesia Mengemudi)",
};

export function ArticleForm({
  action,
  defaultValues,
  isEdit = false,
}: {
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; id?: string } | void>;
  defaultValues?: {
    id?: string;
    title?: string;
    summary?: string;
    content?: string;
    category?: string;
    authorName?: string | null;
    imageUrl?: string | null;
    imageEmbedded?: string | null;
  };
  isEdit?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [image, setImage] = useState<UploadedMeta | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const existingImage = defaultValues?.imageEmbedded ?? defaultValues?.imageUrl ?? null;

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await action(formData);
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: isEdit ? "Artikel diperbarui" : "Artikel diterbitkan", variant: "success" });
        if (!isEdit) {
          formRef.current?.reset();
          setImage(null);
        }
      }
    });
  };

  return (
    <form ref={formRef} action={submit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="title">Judul Berita / Artikel</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="Mis. Tips Aman Berkendara untuk Pelajar SD"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="summary">Ringkasan Singkat</Label>
        <Textarea
          id="summary"
          name="summary"
          defaultValue={defaultValues?.summary}
          placeholder="Ringkasan 1–2 kalimat yang ditampilkan pada kartu berita"
          required
          className="min-h-20"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="content">Isi Artikel Lengkap</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={defaultValues?.content}
          placeholder={'Tulis isi artikel di sini. Pisahkan tiap paragraf dengan baris baru.\n\nParagraf pertama akan dianggap sebagai ringkasan pembuka (lead) artikel.'}
          required
          className="min-h-64 leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">
          Setiap baris kosong akan dijadikan jeda paragraf. Tampilan detail artikel mendukung beberapa paragraf dan daftar sederhana.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">Kategori</Label>
        <Select id="category" name="category" defaultValue={defaultValues?.category ?? "SD"}>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          Setiap kategori (SD, SMP, SMA, SMK, SIM) memiliki halaman dan konten terpisah.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="authorName">Penulis (opsional)</Label>
        <Input
          id="authorName"
          name="authorName"
          defaultValue={defaultValues?.authorName ?? ""}
          placeholder="Mis. Polri / Dinas Pendidikan / EDULALIN"
        />
      </div>

      <div className="grid gap-2">
        <Label>Gambar Utama</Label>
        {image ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{image.originalName}</span>
            </span>
            <button
              type="button"
              onClick={() => setImage(null)}
              className="shrink-0 text-muted-foreground hover:text-red-600"
              aria-label="Hapus gambar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <FileUpload
            kind="ARTICLE_IMAGE"
            accept="image/jpeg,image/png,image/webp"
            label="Unggah gambar utama artikel"
            onUploaded={(f) => setImage({ ...f, embedded: (f as UploadedMeta).embedded })}
            onError={(m) => toast({ title: "Gagal unggah", description: m, variant: "error" })}
          />
        )}
        {image && (
          <>
            <input type="hidden" name="imageFileId" value={image.id} />
            {image.embedded && <input type="hidden" name="imageEmbedded" value={image.embedded} />}
          </>
        )}
        {!image && existingImage && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={existingImage} alt="Gambar saat ini" className="h-14 w-20 rounded-md object-cover" />
            <span className="text-muted-foreground">Gambar saat ini (tersimpan permanen). Unggah gambar baru untuk menggantinya.</span>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Terbitkan Artikel"}
      </Button>
    </form>
  );
}