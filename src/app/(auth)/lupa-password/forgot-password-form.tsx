"use client";

import { useTransition, useEffect, useState } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, KeyRound, ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  requestOtp,
  verifyOtp,
  resetPassword,
  type ForgotPasswordState,
} from "@/app/actions/password-reset-actions";

type Step = "request" | "verify" | "reset";

/**
 * Alur Lupa Password berbasis OTP email:
 *  1) Masukkan email → sistem kirim OTP 6 digit (berlaku 5 menit, sekali pakai)
 *  2) Verifikasi OTP (dengan batas percobaan & tombol kirim ulang)
 *  3) Password baru + konfirmasi → simpan (hash aman) → arahkan ke login
 */
export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [requestState, setRequestState] = useState<ForgotPasswordState>();
  const [verifyState, setVerifyState] = useState<ForgotPasswordState>();
  const [resetState, setResetState] = useState<ForgotPasswordState>();
  const [countdown, setCountdown] = useState(0);
  const [isPending, startTransition] = useTransition();

  const pending = isPending;

  // Hitung mundur untuk tombol "Kirim Ulang OTP".
  useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) window.clearInterval(id);
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await requestOtp(undefined, fd);
      setRequestState(result);
      if (result.step === "verify") {
        // Mulai langkah baru dengan state bersih (tanpa error langkah lama).
        setVerifyState(undefined);
        setResetState(undefined);
        setOtp("");
        setStep("verify");
        setEmail(result.email ?? "");
        setCountdown(result.resendIn ?? 60);
      }
    });
  }

  function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await verifyOtp(undefined, fd);
      setVerifyState(result);
      if (result.step === "reset") {
        setResetState(undefined);
        // Simpan OTP terverifikasi agar ikut terkirim saat menyimpan password.
        setOtp(String(fd.get("otp") ?? ""));
        setStep("reset");
        setEmail(result.email ?? "");
      }
    });
  }

  function handleResend() {
    const fd = new FormData();
    fd.set("email", email);
    setCountdown(60);
    startTransition(async () => {
      const result = await requestOtp(undefined, fd);
      // Tampilkan hasil kirim ulang pada langkah verifikasi (bukan langkah 1),
      // agar notifikasi keberhasilan/kegagalan benar-benar terlihat pengguna.
      setVerifyState(result);
      setOtp("");
      if (result.step === "verify") {
        setStep("verify");
        setEmail(result.email ?? "");
      } else if (result.error) {
        // Kirim ulang gagal (mis. cooldown) — pulihkan hitung mundur agar tombol
        // bisa dicoba lagi tanpa menunggu penuh.
        setCountdown(0);
      }
    });
  }

  function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await resetPassword(undefined, fd);
      setResetState(result);
    });
  }

  function backToEmail() {
    setRequestState(undefined);
    setVerifyState(undefined);
    setResetState(undefined);
    setOtp("");
    setStep("request");
  }

  const done = resetState?.success === true;

  return (
    <div className="space-y-4">
      {/* Langkah 1: email */}
      {step === "request" && !done && (
        <form onSubmit={handleRequest} className="space-y-4">
          {requestState?.error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {requestState.error}
            </p>
          )}
          {requestState?.message && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {requestState.message}
            </p>
          )}
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
            <p className="text-xs text-muted-foreground">
              Sistem akan mengirim kode OTP 6 digit ke email ini (berlaku 5 menit).
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Mengirim kode...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" /> Kirim Kode OTP
              </>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Sudah ingat?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Kembali ke login
            </Link>
          </p>
        </form>
      )}

      {/* Langkah 2: verifikasi OTP */}
      {step === "verify" && !done && (
        <form onSubmit={handleVerify} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          {verifyState?.error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {verifyState.error}
            </p>
          )}
          {verifyState?.message && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {verifyState.message}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="otp">Kode OTP</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="otp"
                name="otp"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                required
                className="pl-9 text-center text-lg font-bold tracking-[0.5em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Kode dikirim ke <strong>{email}</strong>. Berlaku 5 menit & hanya sekali pakai.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={pending || otp.length !== 6}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Verifikasi Kode
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={backToEmail}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Ubah email
            </button>
            {countdown > 0 ? (
              <span className="text-xs text-muted-foreground">Kirim ulang dalam {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-medium text-primary hover:underline"
              >
                Kirim Ulang OTP
              </button>
            )}
          </div>
        </form>
      )}

      {/* Langkah 3: password baru */}
      {step === "reset" && !done && otp.length !== 6 && (
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Sesi verifikasi tidak ditemukan. Silakan ulangi proses lupa password dari awal.
          </p>
          <Button type="button" className="w-full" onClick={backToEmail}>
            Mulai Ulang
          </Button>
        </div>
      )}
      {step === "reset" && !done && otp.length === 6 && (
        <form onSubmit={handleReset} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="otp" value={otp} />
          {resetState?.error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {resetState.error}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="password">Password Baru</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Min. 8 karakter, huruf & angka"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Ulangi password baru"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" /> Simpan Password Baru
              </>
            )}
          </Button>
        </form>
      )}

      {/* Selesai: password berhasil direset */}
      {done && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-2 text-sm font-medium text-emerald-700">
              {resetState?.message ?? "Password berhasil diperbarui."}
            </p>
          </div>
          <Link href="/login">
            <Button type="button" className="w-full">
              Masuk dengan Password Baru
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
