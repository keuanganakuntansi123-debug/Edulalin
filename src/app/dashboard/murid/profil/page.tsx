import { requireRole } from "@/lib/guards";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const instant = false;

export default async function MuridProfilPage() {
  const user = await requireRole("MURID");

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
            avatarUrl={user.embeddedAvatar ?? user.avatarUrl}
            schoolName={user.school?.name ?? null}
            educationLevel={user.educationLevel ? levelDisplayLabel(user.educationLevel) : null}
            classLevel={user.classLevel}
            showSchoolInfo
          />
        </CardContent>
      </Card>
    </div>
  );
}
