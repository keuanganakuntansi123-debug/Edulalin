import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Lupa Password | EDULALIN | Edukasi Lalu Lintas" };

export default function LupaPasswordPage() {
  return (
    <AuthCard
      title="Lupa Password"
      subtitle="Masukkan email terdaftar. Kami akan mengirim kode OTP untuk mengatur ulang password Anda."
      variant="signin"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}