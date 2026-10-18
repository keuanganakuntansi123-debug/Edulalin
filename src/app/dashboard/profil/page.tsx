import { requireRole } from "@/lib/guards";
import { getRoleLabel, levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Badge } from "@/components/ui/badge";

export const instant = false;

export default async function DashboardProfilPage() {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  const levelLabel = user.educationLevel ? levelDisplayLabel(user.educationLevel) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profil Saya</h1>
          <p className="mt-1 text-muted-foreground">Kelola identitas yang tampil di seluruh dashboard.</p>
        </div>
        <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
      </div>

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
            educationLevel={levelLabel}
            classLevel={user.classLevel}
            major={user.major}
            policeLevel={user.policeLevel}
            policeUnit={user.policeUnit}
            policeDivision={user.policeDivision}
            showSchoolInfo={user.role !== "ADMIN"}
          />
        </CardContent>
      </Card>
    </div>
  );
}