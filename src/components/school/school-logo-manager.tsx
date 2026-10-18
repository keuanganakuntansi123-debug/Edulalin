"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/upload/file-upload";
import { toast } from "@/components/ui/toaster";
import { SchoolLogo } from "@/components/school/school-logo";
import { setSchoolLogo } from "@/app/actions/admin-actions";

type UploadedMeta = { id: string; url: string; originalName: string; mimeType: string };

/**
 * Pengelola logo sekolah: unggah, ganti, dan hapus.
 * Logo disimpan di UploadedFile (persisten) dan direferensikan lewat School.logoFileId.
 */
export function SchoolLogoManager({
  schoolId,
  schoolName,
  logoUrl,
}: {
  schoolId: string;
  schoolName: string;
  logoUrl: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [logo, setLogo] = useState<UploadedMeta | null>(null);

  const save = (fileId?: string, remove?: boolean) => {
    const fd = new FormData();
    fd.set("schoolId", schoolId);
    if (fileId) fd.set("logoFileId", fileId);
    if (remove) fd.set("removeLogo", "1");
    startTransition(async () => {
      const res = await setSchoolLogo(fd);
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
        return;
      }
      toast({
        title: remove ? "Logo dihapus" : "Logo sekolah disimpan",
        variant: "success",
      });
      setLogo(null);
    });
  };

  const displayUrl = logo?.url ?? logoUrl;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-slate-50 p-4">
      <SchoolLogo logoUrl={displayUrl} name={schoolName} size="lg" className="shadow-md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Logo Sekolah</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Format JPG, PNG, atau WebP (maks. 2 MB). Logo tampil pada kartu dan detail sekolah.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {logo ? (
            <Button type="button" size="sm" disabled={pending} onClick={() => save(logo.id)}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simpan Logo
            </Button>
          ) : (
            <FileUpload
              kind="SCHOOL_LOGO"
              accept="image/jpeg,image/png,image/webp"
              label="Unggah / Ganti Logo"
              onUploaded={(f) => setLogo(f)}
              onError={(m) => toast({ title: "Gagal unggah", description: m, variant: "error" })}
              className="max-w-xs py-3!"
            />
          )}
          {logo && (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setLogo(null)}>
              Batal
            </Button>
          )}
          {!logo && displayUrl && (
            <Button type="button" size="sm" variant="ghost" className="text-red-600" disabled={pending} onClick={() => save(undefined, true)}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus Logo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}