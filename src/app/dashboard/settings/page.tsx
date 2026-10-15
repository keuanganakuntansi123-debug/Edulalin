import { requireRole } from "@/lib/guards";
import { getRoleLabel, levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck, School, User } from "lucide-react";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const instant = false;

export default async function DashboardSettingsPage() {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Profil & Pengaturan</h1>
      <p className="mt-1 text-muted-foreground">
        Kelola identitas, foto profil, email, dan password akun Anda.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Identitas</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={user.name}
            email={user.email}
            phone={user.phone}
            avatarUrl={user.avatarUrl}
            schoolName={user.school?.name ?? null}
            educationLevel={user.educationLevel ? levelDisplayLabel(user.educationLevel) : null}
            classLevel={user.classLevel}
            policeLevel={user.policeLevel}
            policeUnit={user.policeUnit}
            policeDivision={user.policeDivision}
            showSchoolInfo={user.role !== "ADMIN"}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium">{getRoleLabel(user.role)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
              <School className="h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Sekolah</p>
                <p className="text-sm font-medium">{user.role === "ADMIN" ? "-" : user.school?.name ?? "-"}</p>
              </div>
            </div>
            {user.role !== "ADMIN" && user.educationLevel && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                <User className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Jenjang</p>
                  <p className="text-sm font-medium">{levelDisplayLabel(user.educationLevel)}</p>
                </div>
              </div>
            )}
            {user.role !== "ADMIN" && user.classLevel && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                <User className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Kelas</p>
                  <p className="text-sm font-medium">{user.classLevel}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={user.status === "ACTIVE" ? "success" : "warning"}>
              Status: {user.status === "ACTIVE" ? "Aktif" : user.status === "PENDING" ? "Pending" : "Nonaktif"}
            </Badge>
            <Badge variant="secondary">Terdaftar sejak {new Date(user.createdAt).toLocaleDateString("id-ID")}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sesi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Keluar dari akun Anda di perangkat ini. Perubahan role, sekolah, dan hak akses dikelola oleh Admin.
          </p>
          <form action={logoutAction}>
            <Button variant="outline" className="w-full text-red-600">
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}