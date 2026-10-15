"use client";

import { useState, useTransition } from "react";
import { Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { FileUpload } from "@/components/upload/file-upload";
import { X, Lock, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { updateProfile, removeAvatar } from "@/app/actions/profile-actions";
import { useRouter } from "next/navigation";
import { policeLevelLabel } from "@/lib/constants";

type UploadedMeta = { id: string; url: string; originalName: string; mimeType: string };

export function ProfileForm({
  name,
  email,
  phone,
  avatarUrl,
  schoolName,
  educationLevel,
  classLevel,
  policeLevel,
  policeUnit,
  policeDivision,
  showSchoolInfo = true,
}: {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  schoolName: string | null;
  educationLevel: string | null;
  classLevel: string | null;
  policeLevel?: string | null;
  policeUnit?: string | null;
  policeDivision?: string | null;
  showSchoolInfo?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [avatar, setAvatar] = useState<UploadedMeta | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res && "error" in res) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: "Profil diperbarui", variant: "success" });
        router.refresh();
      }
    });
  };

  const removePhoto = () => {
    startTransition(async () => {
      await removeAvatar();
      toast({ title: "Foto profil dihapus", variant: "success" });
      router.refresh();
    });
  };

  return (
    <form action={submit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          {avatarUrl || avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar?.url ?? avatarUrl ?? ""}
              alt={name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/30"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Foto profil</p>
          <div className="flex flex-wrap gap-2">
            <FileUpload
              kind="AVATAR"
              accept="image/jpeg,image/png,image/webp"
              label="Ganti Foto"
              onUploaded={(f) => {
                setAvatar(f);
                toast({ title: "Foto siap disimpan", description: "Klik Simpan Perubahan untuk menyimpan.", variant: "success" });
              }}
              onError={(m) => toast({ title: "Gagal unggah", description: m, variant: "error" })}
            />
            {(avatarUrl || avatar) && (
              <Button type="button" variant="outline" size="sm" onClick={removePhoto}>
                <X className="h-4 w-4" /> Hapus
              </Button>
            )}
          </div>
        </div>
      </div>

      {avatar && <input type="hidden" name="avatarFileId" value={avatar.id} />}

      <div className="grid gap-2">
        <Label htmlFor="name">Nama Lengkap</Label>
        <Input id="name" name="name" defaultValue={name} required />
        <p className="text-xs text-muted-foreground">
          Nama ini ditampilkan di seluruh dashboard, header, dan sidebar.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" name="email" type="email" defaultValue={email} required className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground">
          Email digunakan untuk login. Mengubah email memerlukan verifikasi password saat ini.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone">Nomor Telepon</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} placeholder="08xxxxxxxxxx" />
      </div>

      {showSchoolInfo && schoolName && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Sekolah</Label>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{schoolName}</p>
          </div>
          {educationLevel && (
            <div>
              <Label>Jenjang</Label>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{educationLevel}</p>
            </div>
          )}
          {classLevel && (
            <div>
              <Label>Kelas</Label>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{classLevel}</p>
            </div>
          )}
        </div>
      )}

      {showSchoolInfo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Sekolah, jenjang, kelas, dan role dikelola oleh Admin. Anda hanya dapat mengubah data pribadi di atas.
        </div>
      )}

      {(policeLevel || policeUnit || policeDivision) && (
        <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <p className="text-sm font-semibold text-sky-800">Identitas Kepolisian</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Tingkat Kesatuan</Label>
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {policeLevelLabel(policeLevel)}
              </p>
            </div>
            <div>
              <Label>Nama Kesatuan</Label>
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{policeUnit ?? "-"}</p>
            </div>
            <div>
              <Label>Divisi / Bagian / Satuan</Label>
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{policeDivision ?? "-"}</p>
            </div>
          </div>
          <p className="text-xs text-sky-700">
            Data kesatuan dikelola oleh Admin. Hubungi Admin jika terdapat perubahan.
          </p>
        </div>
      )}

      {/* Keamanan akun: ubah password */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <KeyRound className="h-4 w-4 text-primary" /> Ubah Password
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ubah kata sandi Anda secara mandiri. Wajib memasukkan password saat ini sebagai verifikasi.
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="currentPassword">Password Saat Ini</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                placeholder="Password saat ini"
                autoComplete="current-password"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
                aria-label={showCurrent ? "Sembunyikan" : "Tampilkan"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newPassword">Password Baru (kosongkan jika tidak diubah)</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="newPassword"
                name="newPassword"
                type={showNew ? "text" : "password"}
                placeholder="Min. 8 karakter, huruf & angka"
                autoComplete="new-password"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
                aria-label={showNew ? "Sembunyikan" : "Tampilkan"}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </form>
  );
}