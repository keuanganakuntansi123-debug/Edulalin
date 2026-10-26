import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Lupa Password | EDULALIN | Edukasi Lalu Lintas" };

export default function LupaPasswordPage() {
  return (
    <AuthCard
      title="Lupa Password"
      subtitle="Isi data identitas akun Anda. Pengajuan akan diverifikasi Admin, lalu password diatur ulang."
      variant="signin"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}