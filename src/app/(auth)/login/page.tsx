import type { Metadata } from "next";
import { loginAction } from "@/app/actions/auth-actions";
import { LoginForm } from "./login-form";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Masuk | EDULALIN | Edukasi Lalu Lintas" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Masuk ke EDULALIN"
      subtitle="Lanjutkan belajar aman di jalan."
      variant="signin"
    >
      <LoginForm action={loginAction} />
    </AuthCard>
  );
}