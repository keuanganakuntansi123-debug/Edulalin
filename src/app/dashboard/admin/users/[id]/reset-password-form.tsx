"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";
import { resetUserPassword } from "@/app/actions/admin-actions";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";

/**
 * Reset password manual oleh admin (jaring pengaman saat OTP email tidak
 * dapat diterima pengguna). Password sementara ini wajib diganti pengguna
 * sendiri dari menu Profil & Pengaturan.
 */
export function AdminResetPasswordForm({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData();
    fd.set("newPassword", password);
    fd.set("confirmPassword", confirmPassword);
    startTransition(async () => {
      const result = await resetUserPassword(userId, fd);
      if (result && typeof result === "object" && "error" in result && result.error) {
        toast({ title: "Gagal", description: String(result.error), variant: "error" });
        return;
      }
      toast({
        title: "Password berhasil diatur ulang",
        description: `Minta ${userName} segera mengganti password dari menu Profil & Pengaturan.`,
        variant: "success",
      });
      setPassword("");
      setConfirmPassword("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="mt-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <KeyRound className="mr-1.5 h-4 w-4" /> Atur Ulang Password
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-amber-800">
        <ShieldAlert className="h-4 w-4" /> Reset password manual
      </p>
      <p className="mt-1 text-xs text-amber-700">
        Gunakan hanya bila pengguna tidak menerima kode OTP. Sampaikan password sementara ini
        secara langsung, lalu minta pengguna menggantinya sendiri.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="admin-new-password" className="text-xs">
            Password baru
          </Label>
          <PasswordInput
            id="admin-new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter, huruf & angka"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="admin-confirm-password" className="text-xs">
            Konfirmasi password
          </Label>
          <PasswordInput
            id="admin-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi password baru"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Menyimpan…
              </>
            ) : (
              "Simpan Password"
            )}
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setPassword("");
              setConfirmPassword("");
            }}
            disabled={pending}
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}
