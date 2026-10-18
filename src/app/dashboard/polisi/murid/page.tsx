import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/form";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchoolLogo } from "@/components/school/school-logo";

export const instant = false;

export default async function PolisiMuridPage() {
  await requireRole("POLISI");

  const schools = await prisma.school.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      educationLevel: true,
      _count: { select: { users: { where: { role: "MURID", deletedAt: null } } } },
    },
  });

  const total = schools.reduce((a, s) => a + s._count.users, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Jumlah Murid</h1>
      <p className="mt-1 text-muted-foreground">Distribusi murid per sekolah ({total} total).</p>

      <div className="mt-6 space-y-3">
        {schools.map((s) => {
          const pct = total ? Math.round((s._count.users / total) * 100) : 0;
          return (
            <Card key={s.id}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <SchoolLogo logoUrl={s.logoUrl} name={s.name} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium line-clamp-1">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{levelDisplayLabel(s.educationLevel)}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{s._count.users} murid ({pct}%)</span>
                </div>
                <Progress value={pct} className="mt-3" />
                <div className="mt-3 flex gap-2">
                  <Link href={`/dashboard/polisi/kuis?schoolId=${s.id}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" /> Lihat Kuis Murid
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {schools.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada data sekolah.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
