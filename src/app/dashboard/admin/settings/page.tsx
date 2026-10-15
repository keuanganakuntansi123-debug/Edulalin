import { requireRole } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { logoutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const instant = false;

export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN");

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
          <p className="pt-2 text-xs text-muted-foreground">
            Halaman pengaturan lanjutan (SMTP, kebijakan, integrasi) dapat dikembangkan berikutnya.
          </p>
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
