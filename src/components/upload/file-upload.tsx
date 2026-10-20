"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileKind } from "@/generated/prisma/client";
import { isBlobUploadEnabled } from "@/lib/upload-client";
import { maxSizeLabel, blobPathname, MAX_SIZES, ALLOWED_MIME, isAllowedMime } from "@/lib/upload-config";

type UploadedMeta = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  storedName?: string;
};

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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const validate = (file: File): string | null => {
    const mime = file.type || "application/octet-stream";
    if (!isAllowedMime(kind, mime)) {
      return `Tipe file tidak diizinkan (${mime}). Gunakan ${ALLOWED_MIME[kind].join(", ")}.`;
    }
    if (file.size > MAX_SIZES[kind]) {
      return `Ukuran file melebihi batas maksimal ${maxSizeLabel(kind)}`;
    }
    return null;
  };

  const upload = async (file: File) => {
    if (!file) return;
    const validateError = validate(file);
    if (validateError) {
      setError(validateError);
      onError?.(validateError);
      return;
    }
    setUploading(true);
    setError(null);
    setDone(false);
    setProgress(0);
    try {
      if (isBlobUploadEnabled()) {
        // Client upload langsung ke Vercel Blob (mendukung file hingga 50 MB
        // melewati batas body server). Metadata dicatat ke Neon lewat register.
        const { upload } = await import("@vercel/blob/client");
        // Gunakan pathname ber-prefix folder (mis. `logos/xxx.png`) agar
        // /api/upload/register dapat memvalidasi & menyimpan path yang benar.
        const pathname = blobPathname(kind, file.name);
        const result = await upload(pathname, file, {
          access: "private",
          multipart: file.size > 5 * 1024 * 1024,
          handleUploadUrl: "/api/upload/blob-token",
          clientPayload: JSON.stringify({ kind }),
          onUploadProgress: (p) => setProgress(p.percentage ?? 0),
        });
        const registerRes = await fetch("/api/upload/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname: result.pathname,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            kind,
          }),
        });
        const registerData = await registerRes.json();
        if (!registerRes.ok) {
          const { del } = await import("@vercel/blob");
          await del(result.url).catch(() => undefined);
          throw new Error(registerData.error ?? "Gagal menyimpan metadata file");
        }
        setProgress(100);
        setDone(true);
        onUploaded(registerData.file);
      } else {
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal mengunggah file");
        setDone(true);
        onUploaded(data.file);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengunggah file";
      setError(msg);
      onError?.(msg);
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
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium text-slate-700">
            Mengunggah… {progress > 0 ? `${Math.round(progress)}%` : ""}
          </span>
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </>
      ) : done && !error ? (
        <>
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-700">File berhasil diunggah</span>
        </>
      ) : error ? (
        <>
          <AlertCircle className="h-6 w-6 text-red-500" />
          <span className="text-sm font-medium text-red-600">{error}</span>
        </>
      ) : (
        <UploadCloud className="h-6 w-6 text-primary" />
      )}
      {!uploading && !done && !error && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <span className="text-xs text-muted-foreground">Klik untuk memilih file atau tarik ke sini</span>
      <span className="text-xs text-muted-foreground">Maks. {maxSizeLabel(kind)} per file</span>
    </button>
  );
}