"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  requestPasswordReset,
  type PasswordRequestState,
} from "@/app/actions/password-reset-actions";
import {
  EDUCATION_LEVELS,
  classOptionsForLevel,
  levelDisplayLabel,
  policeLevelLabel,
} from "@/lib/constants";
import {
  Loader2,
  Mail,
  User,
  School,
  ShieldCheck,
  CheckCircle2,
  Send,
  GraduationCap,
  BookMarked,
  BadgeCheck,
  Clock,
} from "lucide-react";

type ActorRole = "MURID" | "GURU" | "POLISI" | "ADMIN";

const ACTORS: { key: ActorRole; label: string; hint: string }[] = [
  { key: "MURID", label: "Murid", hint: "Sekolah, jenjang, kelas & jurusan" },
  { key: "GURU", label: "Guru", hint: "Sekolah & mata pelajaran" },
  { key: "POLISI", label: "Polisi", hint: "Kesatuan & divisi" },
  { key: "ADMIN", label: "Admin", hint: "Identitas akun admin" },
];

const POLICE_LEVELS = ["POLSEK", "POLRES", "POLDA"];

/**
 * Formulir Lupa Password — pengajuan reset melalui Admin.
 *
 * Pengguna memilih aktor (Murid/Guru/Polisi/Admin) agar kolom identitas yang
 * diminta sesuai, lalu mengirim pengajuan. Sistem memverifikasi kecocokan data
 * dengan akun asli di database sebelum Admin mengatur password baru.
 */
export function ForgotPasswordForm() {
  const [actor, setActor] = useState<ActorRole>("MURID");
  const [level, setLevel] = useState("");
  const [state, setState] = useState<PasswordRequestState>();
  const [pending, startTransition] = useTransition();

  const actorInfo = useMemo(() => ACTORS.find((a) => a.key === actor)!, [actor]);

  // Jurusan hanya relevan untuk murid SMA & SMK. SD & SMP tidak memiliki jurusan.
  const showMajor = actor === "MURID" && (level === "SMA" || level === "SMK");
  const classOptions = classOptionsForLevel(level);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await requestPasswordReset(undefined, fd);
      setState(result);
    });
  }

  if (state?.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-2 text-center text-sm font-semibold text-emerald-700">
            Pengajuan Terkirim
          </p>
          <p className="mt-1 text-center text-sm text-emerald-700">{state.message}</p>
          {state.verified ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Identitas terverifikasi otomatis
            </p>
          ) : (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700">
              <Clock className="h-4 w-4" /> Menunggu pemeriksaan identitas oleh Admin
            </p>
          )}
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          Setelah Admin menyetel password baru, Anda dapat login kembali memakai email dan
          password tersebut. Seluruh data akun, sekolah, modul, kuis, dan nilai tetap utuh.
        </div>
        <Link href="/login">
          <Button type="button" className="w-full">
            Kembali ke Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {state?.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* Pilih aktor */}
      <div className="grid gap-2">
        <Label>Daftar Sebagai</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTORS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setActor(a.key)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                actor === a.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{actorInfo.hint}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email Terdaftar</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="email@contoh.id"
            required
            autoComplete="email"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="name">Nama Lengkap</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            placeholder="Nama lengkap sesuai akun"
            required
            className="pl-9 uppercase"
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Nama akan dicocokkan dengan data akun untuk verifikasi identitas.
        </p>
      </div>

      {/* Identitas sesuai aktor */}
      {(actor === "MURID" || actor === "GURU") && (
        <div className="grid gap-2">
          <Label htmlFor="schoolName">Sekolah</Label>
          <div className="relative">
            <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="schoolName"
              name="schoolName"
              placeholder="Mis. SMKN 15 JAKARTA / SMKS BUDI LUHUR"
              className="pl-9 uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Gunakan HURUF KAPITAL sesuai data akun terdaftar.
          </p>
        </div>
      )}

      {actor === "MURID" ? (
        <div
          className={
            showMajor
              ? "grid grid-cols-1 gap-4 sm:grid-cols-3"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2"
          }
        >
          <div className="grid gap-2">
            <Label htmlFor="educationLevel">Jenjang</Label>
            <Select
              id="educationLevel"
              name="educationLevel"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">— Pilih jenjang —</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {levelDisplayLabel(lvl)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="classLevel">Kelas</Label>
            <Select id="classLevel" name="classLevel" defaultValue="" disabled={!level}>
              <option value="">
                {level ? "— Pilih kelas —" : "— Pilih jenjang dahulu —"}
              </option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </Select>
          </div>
          {showMajor && (
            <div className="grid gap-2">
              <Label htmlFor="major">Jurusan</Label>
              <div className="relative">
                <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="major"
                  name="major"
                  placeholder="Mis. MIPA / TKJ"
                  className="pl-9 uppercase"
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : actor === "GURU" ? (
        <div className="grid gap-2">
          <Label htmlFor="educationLevel">Jenjang</Label>
          <Select
            id="educationLevel"
            name="educationLevel"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">— Pilih jenjang —</option>
            {EDUCATION_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {levelDisplayLabel(lvl)}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {actor === "GURU" && (
        <div className="grid gap-2">
          <Label htmlFor="subject">Mata Pelajaran</Label>
          <div className="relative">
            <BookMarked className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="subject"
              name="subject"
              placeholder="Mis. Pendidikan Kewarganegaraan"
              className="pl-9 uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
        </div>
      )}

      {actor === "POLISI" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="policeLevel">Tingkat Kesatuan</Label>
            <Select id="policeLevel" name="policeLevel" defaultValue="">
              <option value="">— Pilih tingkat —</option>
              {POLICE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {policeLevelLabel(lvl)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="policeUnit">Nama Kesatuan</Label>
            <Input
              id="policeUnit"
              name="policeUnit"
              placeholder="Mis. POLRES METRO JAKARTA SELATAN"
              className="uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="policeDivision">Divisi / Bagian / Satuan</Label>
            <Input
              id="policeDivision"
              name="policeDivision"
              placeholder="Mis. SATLANTAS"
              className="uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="note">Catatan Tambahan (opsional)</Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Informasi tambahan untuk Admin, mis. kontak yang dapat dihubungi."
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
        Pengajuan diverifikasi Admin. Demi keamanan, pastikan data identitas di atas sesuai akun
        Anda agar pengajuan tidak ditolak.
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Mengirim pengajuan...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Kirim Pengajuan
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Sudah ingat password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Kembali ke login
        </Link>
      </p>
    </form>
  );
}
