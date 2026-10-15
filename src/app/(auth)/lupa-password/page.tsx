import type { Metadata } from "next";
import { Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Lupa Password | EDULALIN | Edukasi Lalu Lintas" };

export default function LupaPasswordPage() {
  return (
    <AuthCard
      title="Lupa Password"
      subtitle="Masukkan email Anda. Tautan reset akan dikirimkan (alur verifikasi email)."
      variant="signin"
    >
      <form className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="email@contoh.id" required />
        </div>
        <Button type="submit" className="w-full">Kirim Tautan Reset</Button>
        <p className="text-center text-sm text-muted-foreground">
          Sudah ingat? <a href="/login" className="font-medium text-primary hover:underline">Kembali ke login</a>
        </p>
      </form>
    </AuthCard>
  );
}