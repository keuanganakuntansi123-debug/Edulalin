import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EDUCATION_LEVELS, LEVEL_LABEL, levelDisplayLabel } from "@/lib/constants";

export const instant = false;

export default async function AdminSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; q?: string }>;
}) {
  await requireRole("ADMIN");
  const { level, q } = await searchParams;

  const schools = await prisma.school.findMany({
    where: {
      ...(level ? { educationLevel: level as "SD" | "SMP" | "SMA" | "SIM" } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: { where: { deletedAt: null, role: "MURID" } },
        },
      },
    },
  });

  // Hitung guru & murid per sekolah tanpa N+1
  const countsBySchool = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    where: { deletedAt: null, schoolId: { in: schools.map((s) => s.id) } },
    _count: { _all: true },
  });
  const countMap = new Map<string, { guru: number; murid: number }>();
  for (const row of countsBySchool) {
    if (!row.schoolId) continue;
    const cur = countMap.get(row.schoolId) ?? { guru: 0, murid: 0 };
    if (row.role === "GURU") cur.guru = row._count._all;
    if (row.role === "MURID") cur.murid = row._count._all;
    countMap.set(row.schoolId, cur);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Kelola Sekolah</h1>
      <p className="mt-1 text-muted-foreground">
        Sekolah terdaftar otomatis saat murid mendaftar. Admin dapat melihat, mengedit, dan menonaktifkan sekolah.
      </p>

      {/* Filter */}
      <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama sekolah..."
          className="h-10 w-full max-w-xs rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <select
          name="level"
          defaultValue={level ?? ""}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Semua Jenjang</option>
          {EDUCATION_LEVELS.map((l) => (
            <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-blue-800">
          Cari
        </button>
      </form>

      <div className="mt-6 grid gap-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {schools.map((s) => (
            <Link key={s.id} href={`/dashboard/admin/schools/${s.id}`}>
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex h-full flex-col justify-between pt-5">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{s.name}</h3>
                      {s.status === "ACTIVE" ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {levelDisplayLabel(s.educationLevel)} • NPSN {s.code} • {s.city}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-blue-50 p-2 text-center">
                      <p className="text-lg font-bold text-blue-700">{countMap.get(s.id)?.guru ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Guru</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-center">
                      <p className="text-lg font-bold text-emerald-700">{countMap.get(s.id)?.murid ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Murid</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium text-primary">
                    Lihat detail →
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {schools.length === 0 && (
            <Card className="lg:col-span-2">
              <CardContent className="pt-6 text-center text-muted-foreground">
                Tidak ada sekolah yang cocok.
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
