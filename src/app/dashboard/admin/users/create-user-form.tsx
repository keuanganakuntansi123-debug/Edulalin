"use client";

import { useState, useTransition } from "react";
import { Input, Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";
import { BookOpen, ShieldCheck, User, Mail, School, BookMarked, Building2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreateUserForm({
  schools,
  action,
}: {
  schools: { id: string; name: string }[];
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"GURU" | "POLISI">("GURU");

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await action(formData);
      if (res && "error" in res) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: "Akun dibuat", variant: "success" });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Tab pemisah */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => setTab("GURU")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
            tab === "GURU"
              ? "bg-white text-primary shadow-sm"
              : "text-muted-foreground hover:text-slate-700"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Buat Akun Guru
        </button>
        <button
          type="button"
          onClick={() => setTab("POLISI")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
            tab === "POLISI"
              ? "bg-white text-primary shadow-sm"
              : "text-muted-foreground hover:text-slate-700"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Buat Akun Polisi
        </button>
      </div>

      {tab === "GURU" ? (
        <form action={submit} className="space-y-4">
          <input type="hidden" name="role" value="GURU" />
          <div className="grid gap-2">
            <Label htmlFor="guru-name">Nama Lengkap</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="guru-name"
                name="name"
                placeholder="Nama lengkap guru"
                required
                className="pl-9 uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guru-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="guru-email" name="email" type="email" placeholder="nama@sekolah.id" required className="pl-9" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guru-subject">Mata Pelajaran yang Diajarkan</Label>
            <div className="relative">
              <BookMarked className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="guru-subject"
                name="subject"
                placeholder="Contoh: Pendidikan Pancasila / IPA / Matematika"
                className="pl-9 uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Opsional — dapat diisi belakangan.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guru-school">Nama Sekolah</Label>
            <div className="relative">
              <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Select id="guru-school" name="schoolId" defaultValue="" required className="pl-9">
                <option value="" disabled>Pilih / cari sekolah terdaftar</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Guru otomatis terhubung dengan sekolah & data murid terdaftar pada sekolah tersebut.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guru-password">Password Sementara</Label>
            <div className="relative">
              <PasswordInput id="guru-password" name="password" placeholder="Min. 8 karakter" required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Menyimpan..." : "Buat Akun Guru"}
          </Button>
        </form>
      ) : (
        <form action={submit} className="space-y-4">
          <input type="hidden" name="role" value="POLISI" />
          <div className="grid gap-2">
            <Label htmlFor="polisi-name">Nama Lengkap</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="polisi-name"
                name="name"
                placeholder="Nama lengkap anggota"
                required
                className="pl-9 uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="polisi-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="polisi-email" name="email" type="email" placeholder="nama@polri.go.id" required className="pl-9" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="polisi-level">Tingkat Kesatuan</Label>
            <div className="relative">
              <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Select id="polisi-level" name="policeLevel" defaultValue="" required className="pl-9">
                <option value="" disabled>Pilih tingkat kesatuan</option>
                <option value="POLSEK">Polsek</option>
                <option value="POLRES">Polres</option>
                <option value="POLDA">Polda</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="polisi-unit">Nama Kesatuan / Wilayah Bertugas</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="polisi-unit"
                name="policeUnit"
                placeholder="Contoh: POLRES METRO JAKARTA TIMUR"
                required
                className="pl-9 uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Isi nama Polsek, Polres, atau Polda secara manual sesuai identitas anggota.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="polisi-division">Divisi / Bagian / Satuan (opsional)</Label>
            <Input
              id="polisi-division"
              name="policeDivision"
              placeholder="Mis. SATLANTAS, BAGIAN OPERASIONAL"
              className="uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="polisi-password">Password Sementara</Label>
            <div className="relative">
              <PasswordInput id="polisi-password" name="password" placeholder="Min. 8 karakter" required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Menyimpan..." : "Buat Akun Polisi"}
          </Button>
        </form>
      )}
    </div>
  );
}