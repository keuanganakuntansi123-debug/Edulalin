import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { EDUCATION_LEVELS, LEVEL_LABEL } from "@/lib/constants";
import { SchoolCard, DeletedSchoolRow } from "./school-card";
import { deleteSchool, restoreSchool, permanentDeleteSchool } from "@/app/actions/admin-actions";
import { Archive } from "lucide-react";

export const instant = false;

async function deleteSchoolAction(id: string) {
  "use server";
  return await deleteSchool(id);
}

async function restoreSchoolAction(id: string) {
  "use server";
  return await restoreSchool(id);
}

async function permanentDeleteSchoolAction(id: string) {
  "use server";
  return await permanentDeleteSchool(id);
}

export default async function AdminSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; q?: string }>;
}) {
  await requireRole("ADMIN");
  const { level, q } = await searchParams;
  const levelFilter =
    level === "SD" || level === "SMP" || level === "SMA" || level === "SMK" || level === "SIM"
      ? (level as "SD" | "SMP" | "SMA" | "SMK" | "SIM")
      : undefined;

  const schools = await prisma.school.findMany({
    where: {
      ...(levelFilter ? { educationLevel: levelFilter } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      deletedAt: null,
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

  const deletedSchools = await prisma.school.findMany({
    where: {
      deletedAt: { not: null },
      ...(levelFilter ? { educationLevel: levelFilter } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { deletedAt: "desc" },
    take: 50,
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
        Sekolah terdaftar otomatis saat murid mendaftar. Admin dapat melihat, mengedit, atau menghapus sekolah.
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
            <SchoolCard
              key={s.id}
              school={{
                id: s.id,
                code: s.code,
                name: s.name,
                educationLevel: s.educationLevel,
                city: s.city,
                status: s.status,
                logoUrl: s.logoUrl,
                logoEmbedded: s.logoEmbedded,
              }}
              guru={countMap.get(s.id)?.guru ?? 0}
              murid={countMap.get(s.id)?.murid ?? 0}
              action={deleteSchoolAction}
            />
          ))}
          {schools.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground lg:col-span-2">
              Tidak ada sekolah aktif yang cocok.
            </div>
          )}
        </div>

        {/* Sekolah Terhapus */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Sekolah Terhapus
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {deletedSchools.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sekolah yang dihapus (soft delete). Data tetap tersimpan dan dapat dipulihkan kapan saja.
            Saat dipulihkan, akun Guru & Murid yang sebelumnya aktif kembali dapat mengakses sistem.
          </p>
          <div className="mt-4 grid gap-3">
            {deletedSchools.map((s) => (
              <DeletedSchoolRow
                key={s.id}
                school={{
                  id: s.id,
                  code: s.code,
                  name: s.name,
                  educationLevel: s.educationLevel,
                  city: s.city,
                  status: s.status,
                  logoUrl: s.logoUrl,
                  logoEmbedded: s.logoEmbedded,
                }}
                action={restoreSchoolAction}
                deleteAction={permanentDeleteSchoolAction}
              />
            ))}
            {deletedSchools.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Belum ada sekolah yang dihapus.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
