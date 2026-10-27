"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input, Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/app/actions/auth-actions";
import { classOptionsForLevel } from "@/lib/constants";
import { User, Mail, CalendarDays, School, Phone, Lock, Eye, EyeOff, Loader2, UserPlus, GraduationCap, BookMarked } from "lucide-react";

export function RegisterForm({
  action,
}: {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [level, setLevel] = useState("");

  // Jurusan hanya relevan untuk SMA & SMK. SD & SMP tidak memiliki jurusan.
  const showMajor = level === "SMA" || level === "SMK";
  const classOptions = classOptionsForLevel(level);

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && !state.success && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="name">Nama Lengkap</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            placeholder="Nama lengkap"
            required
            className="pl-9 uppercase"
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
            }}
          />
        </div>
        {state?.errors?.name && <p className="text-sm text-red-600">{state.errors.name}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" name="email" type="email" placeholder="email@contoh.id" required className="pl-9" />
        </div>
        {state?.errors?.email && <p className="text-sm text-red-600">{state.errors.email}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="birthDate">Tanggal Lahir</Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="birthDate" name="birthDate" type="date" required className="pl-9" />
          </div>
          {state?.errors?.birthDate && <p className="text-sm text-red-600">{state.errors.birthDate}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="schoolName">Nama Sekolah</Label>
          <div className="relative">
            <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="schoolName"
              name="schoolName"
              placeholder="Contoh: SMKN 15 JAKARTA / SMKS BUDI LUHUR"
              required
              className="pl-9 uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
          {state?.errors?.schoolName && <p className="text-sm text-red-600">{state.errors.schoolName}</p>}
        </div>
      </div>

      <div className={showMajor ? "grid grid-cols-1 gap-4 sm:grid-cols-3" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
        <div className="grid gap-2">
          <Label htmlFor="educationLevel">Jenjang</Label>
          <div className="relative">
            <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="educationLevel"
              name="educationLevel"
              required
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">Pilih jenjang...</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
            </select>
          </div>
          {state?.errors?.educationLevel && <p className="text-sm text-red-600">{state.errors.educationLevel}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="classLevel">Kelas</Label>
          <Select id="classLevel" name="classLevel" required defaultValue="" disabled={!level}>
            <option value="">{level ? "— Pilih kelas —" : "— Pilih jenjang dahulu —"}</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </Select>
          {state?.errors?.classLevel && <p className="text-sm text-red-600">{state.errors.classLevel}</p>}
        </div>
        {showMajor && (
          <div className="grid gap-2">
            <Label htmlFor="major">Jurusan</Label>
            <div className="relative">
              <BookMarked className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="major"
                name="major"
                placeholder="Contoh: MIPA / TKJ"
                required
                className="pl-9 uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
            </div>
            {state?.errors?.major && <p className="text-sm text-red-600">{state.errors.major}</p>}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Nama, sekolah, kelas, dan jurusan otomatis disimpan dengan HURUF KAPITAL agar data
        tersinkronisasi antar pengguna. Kolom jurusan hanya untuk jenjang SMA & SMK.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="phone">Nomor Telepon (opsional)</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="phone" name="phone" type="tel" placeholder="08xxxxxxxxxx" className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 karakter"
              required
              className="pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-slate-700"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {state?.errors?.password && <p className="text-sm text-red-600">{state.errors.password}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Ulangi password"
              required
              className="pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-slate-700"
              aria-label={showConfirm ? "Sembunyikan konfirmasi" : "Tampilkan konfirmasi"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {state?.errors?.confirmPassword && <p className="text-sm text-red-600">{state.errors.confirmPassword}</p>}
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" required className="mt-0.5" />
        Saya menyetujui syarat dan ketentuan serta kebijakan privasi EDULALIN.
      </label>

      <Button
        type="submit"
        className="w-full bg-linear-to-r from-blue-700 to-sky-600 text-white shadow-md shadow-blue-600/25 hover:from-blue-800 hover:to-sky-700"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Mendaftarkan...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" /> Daftar
          </>
        )}
      </Button>
      <div className="relative my-4 text-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <span className="relative bg-white px-3 text-xs uppercase tracking-wide text-muted-foreground">
          atau
        </span>
      </div>
      <Link href="/login">
        <Button type="button" variant="outline" className="w-full">
          Sudah punya akun? Masuk
        </Button>
      </Link>
    </form>
  );
}