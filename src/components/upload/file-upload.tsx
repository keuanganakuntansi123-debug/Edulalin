"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileKind } from "@/generated/prisma/client";

type UploadedMeta = { id: string; url: string; originalName: string; mimeType: string; size: number };

export function FileUpload({
  kind,
  accept,
  label,
  onUploaded,
  onError,
  className,
}: {
  kind: FileKind;
  accept?: string;
  label: string;
  onUploaded: (file: UploadedMeta) => void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengunggah file");
      onUploaded(data.file);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Gagal mengunggah file");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
      e.target.value = "";
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        drag ? "border-primary bg-primary/10" : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/5",
        className
      )}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : (
        <UploadCloud className="h-6 w-6 text-primary" />
      )}
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-xs text-muted-foreground">Klik untuk memilih file atau tarik ke sini</span>
    </button>
  );
}