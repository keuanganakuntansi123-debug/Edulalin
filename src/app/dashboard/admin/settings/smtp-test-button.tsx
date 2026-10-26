"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { testSmtpConnection } from "@/app/actions/password-reset-actions";
import { Loader2, Send } from "lucide-react";

/**
 * Tombol uji SMTP (khusus admin). Mengirim email percobaan ke alamat admin
 * agar konfigurasi Gmail App Password dapat dipastikan sebelum pengguna
 * diminta menunggu kode OTP.
 */
export function SmtpTestButton() {
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await testSmtpConnection();
      if (res.ok) {
        toast({ title: "SMTP siap mengirim", description: res.message, variant: "success" });
      } else {
        toast({ title: "SMTP gagal", description: res.error, variant: "error" });
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={run} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      Kirim Email Uji
    </Button>
  );
}
