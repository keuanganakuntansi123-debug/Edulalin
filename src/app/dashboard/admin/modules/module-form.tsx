"use client";

import { useRef, useState, useTransition } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { FileUpload } from "@/components/upload/file-upload";
import { MultiSchoolSelect } from "@/components/upload/multi-school-select";
import { UploadCloud, X, FileText, IdCard } from "lucide-react";

type UploadedMeta = { id: string; url: string; originalName: string; mimeType: string };

const MODULE_TYPE_LABEL: Record<string, string> = {
  PDF: "PDF",
  VIDEO: "Video",
  LINK: "Link",
  DOCUMENT: "Dokumen",
};

export function ModuleForm({
  schools,
  action,
  defaultValues,
}: {
  schools: { id: string; name: string }[];
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; id?: string } | void>;
  defaultValues?: {
    title?: string;
    description?: string;
    isSim?: boolean;
    moduleType?: string;
    contentUrl?: string | null;
    thumbnailUrl?: string | null;
    durationMin?: number | null;
    status?: string;
    schoolIds?: string[];
  };
}) {
  const [pending, startTransition] = useTransition();
  const [moduleType, setModuleType] = useState(defaultValues?.moduleType ?? "PDF");
  const [content, setContent] = useState<UploadedMeta | null>(null);
  const [thumbnail, setThumbnail] = useState<UploadedMeta | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await action(formData);
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: "Modul disimpan", variant: "success" });
        if (!defaultValues) {
          formRef.current?.reset();
          setContent(null);
          setThumbnail(null);
        }
      }
    });
  };

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Judul Modul</Label>
        <Input id="title" name="title" defaultValue={defaultValues?.title} placeholder="Judul modul" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea id="description" name="description" defaultValue={defaultValues?.description} placeholder="Deskripsi singkat" required />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="isSim"
            defaultChecked={defaultValues?.isSim ?? false}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <IdCard className="h-4 w-4 text-primary" /> Modul SIM
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Tandai materi sebagai Modul SIM. Materi ini tergabung dalam kategori SMA/SMK dan
              hanya dapat dibuka murid SMA/SMK berusia minimal 17 tahun. Guru & Kepolisian tetap
              dapat mengakses tanpa batasan usia.
            </span>
          </span>
        </label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="moduleType">Tipe Materi</Label>
        <Select
          id="moduleType"
          name="moduleType"
          value={moduleType}
          onChange={(e) => setModuleType(e.target.value)}
        >
          {Object.entries(MODULE_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {moduleType === "LINK" ? (
        <div className="grid gap-2">
          <Label htmlFor="contentUrl">URL Materi</Label>
          <Input id="contentUrl" name="contentUrl" defaultValue={defaultValues?.contentUrl ?? ""} type="url" placeholder="https://..." />
          {defaultValues?.contentUrl && (
            <p className="text-xs text-muted-foreground">Link saat ini: {defaultValues.contentUrl}</p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <Label>File Materi (PDF / Video / Dokumen)</Label>
          {content ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{content.originalName}</span>
              </span>
              <button
                type="button"
                onClick={() => setContent(null)}
                className="shrink-0 text-muted-foreground hover:text-red-600"
                aria-label="Hapus file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <FileUpload
              kind="MODULE_CONTENT"
              accept=".pdf,.mp4,.webm,.mov,.doc,.docx,.ppt,.pptx,.zip,.txt"
              label="Unggah file materi"
              onUploaded={(f) => setContent(f)}
              onError={(m) => toast({ title: "Gagal unggah", description: m, variant: "error" })}
            />
          )}
          {content && <input type="hidden" name="contentFileId" value={content.id} />}
        </div>
      )}

      <div className="grid gap-2">
        <Label>Thumbnail (opsional)</Label>
        {thumbnail ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <UploadCloud className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{thumbnail.originalName}</span>
            </span>
            <button
              type="button"
              onClick={() => setThumbnail(null)}
              className="shrink-0 text-muted-foreground hover:text-red-600"
              aria-label="Hapus thumbnail"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <FileUpload
            kind="MODULE_CONTENT"
            accept="image/jpeg,image/png,image/webp"
            label="Unggah thumbnail"
            onUploaded={(f) => setThumbnail(f)}
            onError={(m) => toast({ title: "Gagal unggah", description: m, variant: "error" })}
          />
        )}
        {thumbnail && <input type="hidden" name="thumbnailFileId" value={thumbnail.id} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="durationMin">Durasi (menit)</Label>
          <Input id="durationMin" name="durationMin" type="number" min={1} defaultValue={defaultValues?.durationMin ?? undefined} placeholder="mis. 15" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </Select>
        </div>
      </div>

      <MultiSchoolSelect
        schools={schools}
        defaultValue={defaultValues?.schoolIds ?? []}
        helper="Pilih satu atau beberapa sekolah penerima modul. Modul tidak dibagikan ke sekolah lain."
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Menyimpan..." : defaultValues ? "Simpan Perubahan" : "Simpan Modul"}
      </Button>
    </form>
  );
}