import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function PolisiSekolahPage() {
  await requireRole("POLISI");

  const schools = await prisma.school.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: { where: { role: "MURID", deletedAt: null } } } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Daftar Sekolah</h1>
      <p className="mt-1 text-muted-foreground">Sekolah mitra program edukasi lalu lintas.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {schools.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{s.name}</h3>
                <Badge variant="success">Aktif</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {levelDisplayLabel(s.educationLevel)} • {s.city}, {s.province}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {s._count.users} murid terdaftar
              </p>
              <div className="mt-3">
                <Link href={`/dashboard/polisi/sekolah/${s.id}`}>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" /> Lihat Detail Sekolah
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {schools.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada sekolah terdaftar.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
