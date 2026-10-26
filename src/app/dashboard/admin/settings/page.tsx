import { requireRole } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { logoutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { LogOut, MailCheck, MailWarning } from "lucide-react";
import { getMailStatus } from "@/lib/mail";

export const instant = false;

export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN");
  const mail = getMailStatus();

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
          <CardTitle>Email OTP (Reset Password)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div className="flex items-start gap-2">
              {mail.configured ? (
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div>
                <p className="font-medium">
                  {mail.configured ? "SMTP siap mengirim kode OTP" : "SMTP belum siap"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mail.configured
                    ? `Pengirim ${mail.user} melalui ${mail.host}:${mail.port}.`
                    : `Variabel kosong: ${mail.missing.join(", ")}. Isi Gmail App Password 16 karakter di environment.`}
                </p>
              </div>
            </div>
            <span className={mail.configured ? "text-emerald-600" : "text-amber-600"}>
              {mail.configured ? "✓ Aktif" : "! Perlu diatur"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>
              SMTP_USER: <span className="font-medium text-foreground">{mail.user ?? "kosong"}</span>
            </p>
            <p>
              SMTP_PASS: <span className="font-medium text-foreground">{mail.passLength} karakter</span>
            </p>
            <p>
              Host: <span className="font-medium text-foreground">{mail.host}</span>
            </p>
            <p>
              Port: <span className="font-medium text-foreground">{mail.port}</span>
              {mail.secure ? " (SSL)" : ""}
            </p>
          </div>
          {!mail.configured && (
            <p className="text-xs text-muted-foreground">
              Cara mengisi: buat App Password di myaccount.google.com/apppasswords, lalu set variabel{" "}
              <code className="rounded bg-slate-100 px-1">SMTP_PASS</code> di .env (lokal) dan di Vercel →
              Settings → Environment Variables (produksi).
            </p>
          )}
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
