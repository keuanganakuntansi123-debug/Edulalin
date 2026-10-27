import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { LEVEL_LABEL, EDUCATION_LEVELS, levelDisplayLabel } from "@/lib/constants";
import { updateSchool } from "@/app/actions/admin-actions";
import { ArrowLeft, Search, School, Users, UserRound } from "lucide-react";
import { SchoolLogo } from "@/components/school/school-logo";
import { SchoolLogoManager } from "@/components/school/school-logo-manager";

export const instant = false;

async function updateSchoolAction(id: string, formData: FormData) {
  "use server";
  const result = await updateSchool(id, formData);
  if (result && "error" in result && result.error) {
    redirect(`/dashboard/admin/schools/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/dashboard/admin/schools/${id}?saved=1`);
}

export default async function AdminSchoolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ q?: string; role?: string; error?: string; saved?: string }>;
}) {
  const { schoolId } = await params;
  const { q, role, error, saved } = await searchParams;
  await requireRole("ADMIN");

  const [school, murid, guru, totalMurid, totalGuru] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: "MURID",
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: "GURU",
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.user.count({ where: { schoolId, role: "MURID", deletedAt: null } }),
    prisma.user.count({ where: { schoolId, role: "GURU", deletedAt: null } }),
  ]);
  if (!school) notFound();

  const showMurid = role !== "guru";
  const showGuru = role !== "murid";

  return (
    <div>
      <Link
        href="/dashboard/admin/schools"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar sekolah
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SchoolLogo
              logoUrl={school.logoUrl ?? null}
              embedded={school.logoEmbedded}
              name={school.name}
              size="lg"
            />
            <h1 className="text-2xl font-bold">{school.name}</h1>
            {school.status === "ACTIVE" ? (
              <Badge variant="success">Aktif</Badge>
            ) : (
              <Badge variant="secondary">Nonaktif</Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            {levelDisplayLabel(school.educationLevel)} • {school.address || school.city}, {school.province}
          </p>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <School className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-muted-foreground">Sekolah</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{totalGuru}</p>
              <p className="text-sm text-muted-foreground">Guru</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{totalMurid}</p>
              <p className="text-sm text-muted-foreground">Murid</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pencarian */}
      <form method="get" className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama guru/murid..."
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          name="role"
          defaultValue={role ?? ""}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Semua</option>
          <option value="murid">Murid</option>
          <option value="guru">Guru</option>
        </select>
        <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-blue-800">
          Cari
        </button>
      </form>

      {/* Tab guru/murid */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {([
          { key: "", label: `Semua (${totalGuru + totalMurid})` },
          { key: "guru", label: `Data Guru (${totalGuru})` },
          { key: "murid", label: `Data Murid (${totalMurid})` },
        ] as const).map((t) => (
          <a
            key={t.key}
            href={`/dashboard/admin/schools/${school.id}?role=${t.key}`}
            className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              (role ?? "") === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Data Guru */}
        {showGuru && (
          <Card>
            <CardHeader>
              <CardTitle>Data Guru ({guru.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {guru.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.name}</p>
                      {u.status === "ACTIVE" ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="danger">Nonaktif</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {u.email} • {u.educationLevel ? levelDisplayLabel(u.educationLevel) : "-"}
                      {u.classLevel ? ` / Kelas ${u.classLevel}` : ""}
                    </p>
                  </div>
                  <Link href={`/dashboard/admin/users/${u.id}`}>
                    <Button size="sm" variant="outline">Detail</Button>
                  </Link>
                </div>
              ))}
              {guru.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Belum ada guru di sekolah ini.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Data Murid */}
        {showMurid && (
          <Card>
            <CardHeader>
              <CardTitle>Data Murid ({murid.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {murid.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.name}</p>
                      {u.status === "ACTIVE" ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : u.status === "PENDING" ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="danger">Nonaktif</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {u.email} • {u.educationLevel ? levelDisplayLabel(u.educationLevel) : "-"}
                      {u.classLevel ? ` / Kelas ${u.classLevel}` : ""}
                    </p>
                  </div>
                  <Link href={`/dashboard/admin/users/${u.id}`}>
                    <Button size="sm" variant="outline">Detail</Button>
                  </Link>
                </div>
              ))}
              {murid.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Belum ada murid di sekolah ini.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Sekolah */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Edit Sekolah</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Perubahan sekolah berhasil disimpan.
            </p>
          )}
          <div className="mb-6">
            <SchoolLogoManager
              schoolId={school.id}
              schoolName={school.name}
              logoUrl={school.logoUrl}
              logoEmbedded={school.logoEmbedded}
            />
          </div>
          <form action={updateSchoolAction.bind(null, school.id)} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Sekolah</Label>
              <Input
                id="name"
                name="name"
                defaultValue={school.name}
                required
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Negeri: <span className="font-medium">SDN / SMPN / SMAN / SMKN</span>. Swasta:{" "}
                <span className="font-medium">SDS / SMPS / SMAS / SMKS</span>. Prefiks wajib sama
                dengan jenjang. Contoh: <span className="font-medium">SMKN 15 JAKARTA</span>.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="educationLevel">Jenjang</Label>
              <select
                id="educationLevel"
                name="educationLevel"
                defaultValue={school.educationLevel}
                className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" name="address" defaultValue={school.address} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">Kota</Label>
              <Input id="city" name="city" defaultValue={school.city} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="province">Provinsi</Label>
              <Input id="province" name="province" defaultValue={school.province} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={school.status}
                className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Simpan Perubahan</Button>
            </div>
          </form>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Untuk menghapus sekolah beserta menonaktifkan akun Guru & Murid, gunakan tombol
              <strong> Hapus</strong> pada halaman{" "}
              <Link href="/dashboard/admin/schools" className="font-medium text-primary">
                Kelola Sekolah
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}