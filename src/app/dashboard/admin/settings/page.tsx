import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { logoutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { LogOut, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const instant = false;

export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN");
  const pendingRequests = await prisma.passwordResetRequest.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Profil & Pengaturan</h1>
      <p className="mt-1 text-muted-foreground">Kelola identitas Anda dan pengaturan platform.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Profil Saya</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={user.name}
            email={user.email}
            phone={user.phone}
            avatarUrl={user.embeddedAvatar ?? user.avatarUrl}
            schoolName={null}
            educationLevel={null}
            classLevel={null}
            showSchoolInfo={false}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lupa Password (Reset via Admin)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium">Reset password tanpa OTP email</p>
                <p className="text-xs text-muted-foreground">
                  Pengguna mengajukan reset dari halaman Lupa Password. Admin memverifikasi
                  identitas, lalu menyetel password baru. Tidak memerlukan SMTP/Gmail.
                </p>
              </div>
            </div>
            <span className="text-emerald-600">✓ Aktif</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <p className="font-medium">
                {pendingRequests > 0
                  ? `${pendingRequests} pengajuan menunggu diproses`
                  : "Tidak ada pengajuan menunggu"}
              </p>
              <p className="text-xs text-muted-foreground">
                Notifikasi otomatis muncul di lonceng saat ada pengajuan baru.
              </p>
            </div>
            <Link href="/dashboard/admin/password-requests">
              <Button variant="outline">
                <KeyRound className="h-4 w-4" /> Kelola Lupa Password
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Keamanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium">Password di-hash (bcrypt, 12 rounds)</p>
              <p className="text-xs text-muted-foreground">Tidak ada password plaintext disimpan.</p>
            </div>
            <span className="text-emerald-600">✓ Aktif</span>
          </div>
          <div className="flex justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium">Isolasi data per sekolah</p>
              <p className="text-xs text-muted-foreground">Data multi-tenant tidak saling bocor.</p>
            </div>
            <span className="text-emerald-600">✓ Aktif</span>
          </div>
          <div className="flex justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium">Audit trail</p>
              <p className="text-xs text-muted-foreground">Semua aktivitas penting tercatat.</p>
            </div>
            <span className="text-emerald-600">✓ Aktif</span>
          </div>
          <form action={logoutAction} className="pt-2">
            <Button variant="outline" className="w-full text-red-600">
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
