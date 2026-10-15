import type { Metadata } from "next";
import { registerAction } from "@/app/actions/auth-actions";
import { RegisterForm } from "./register-form";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Registrasi | EDULALIN | Edukasi Lalu Lintas" };

export const instant = false;

export default async function RegisterPage() {
  return (
    <AuthCard
      title="Daftar sebagai Murid"
      subtitle="Registrasi publik hanya untuk murid. Akun guru dan polisi dibuat oleh admin."
      variant="register"
    >
      <RegisterForm action={registerAction} />
    </AuthCard>
  );
}