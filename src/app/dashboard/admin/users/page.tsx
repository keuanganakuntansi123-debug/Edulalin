import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL, levelDisplayLabel, policeLevelLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateUserForm } from "./create-user-form";
import { SchoolFilter } from "./school-filter";
import { createGuruPolisi, archiveUser, toggleUserStatus, restoreUser, permanentDeleteUser } from "@/app/actions/admin-actions";
import { Search, Archive, RotateCcw, User, Trash2 } from "lucide-react";

export const instant = false;
type SearchParams = { tab?: string; q?: string; school?: string };
type Params = { searchParams: Promise<SearchParams> };

async function archiveUserAction(id: string) {
  "use server";
  await archiveUser(id);
}
async function restoreUserAction(id: string) {
  "use server";
  await restoreUser(id);
}
async function permanentDeleteUserAction(id: string) {
  "use server";
  await permanentDeleteUser(id);
}
async function toggleUserStatusAction(id: string) {
  "use server";
  await toggleUserStatus(id);
}

export default async function AdminUsersPage({ searchParams }: Params) {
  await requireRole("ADMIN");
  const { tab = "sekolah", q, school } = await searchParams;

  const [schools, murid, polisi, archived] = await Promise.all([
    prisma.school.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        role: "MURID",
        ...(school ? { schoolId: school } : { schoolId: { not: null } }),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: { name: "asc" },
      take: 200,
      include: { school: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, role: "POLISI" },
      orderBy: { name: "asc" },
      include: { school: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100,
      include: { school: { select: { name: true } } },
    }),
  ]);

  const guru = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: "GURU",
      ...(school ? { schoolId: school } : { schoolId: { not: null } }),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
    include: { school: { select: { name: true } } },
  });

  // deletedBy dari log
  const userIds = archived.map((u) => u.id);
  const archiveLogs = userIds.length
    ? await prisma.activityLog.findMany({
        where: { action: "USER_ARCHIVE", entityId: { in: userIds } },
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      })
    : [];
  const deletedByMap = new Map<string, string>();
  for (const log of archiveLogs) {
    if (!deletedByMap.has(log.entityId ?? "") && log.actor) {
      deletedByMap.set(log.entityId ?? "", log.actor.name);
    }
  }

  const tabs = [
    { key: "sekolah", label: "Sekolah & Guru" },
    { key: "murid", label: "Murid" },
    { key: "polisi", label: "Kepolisian" },
    { key: "terhapus", label: "Terhapus" },
    { key: "buat", label: "+ Buat Akun" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
      <p className="mt-1 text-muted-foreground">
        Kelola guru, murid, kepolisian, dan akun terhapus secara terpisah.
      </p>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/dashboard/admin/users${t.key !== "sekolah" ? `?tab=${t.key}` : ""}`}
            className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key || (!tab && t.key === "sekolah")
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="mt-5">
        {tab === "sekolah" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  form="schoolSearch"
                  defaultValue={q}
                  placeholder="Cari nama guru/murid..."
                  className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <SchoolFilter schools={schools} school={school} q={q} />
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Data Guru ({guru.length})</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {guru.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{u.name}</p>
                        <Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                        {u.status === "ACTIVE" ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="danger">Nonaktif</Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {u.email} • {u.school?.name ?? "-"} • {u.subject ? `Mapel: ${u.subject}` : u.educationLevel ? levelDisplayLabel(u.educationLevel) : "-"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link href={`/dashboard/admin/users/${u.id}`}>
                        <Button size="sm" variant="ghost"><User className="h-4 w-4" /> Detail</Button>
                      </Link>
                      <form action={toggleUserStatusAction.bind(null, u.id)}>
                        <Button size="sm" variant="outline">
                          {u.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </form>
                      <form action={archiveUserAction.bind(null, u.id)}>
                        <Button size="sm" variant="ghost" className="text-red-600"><Archive className="h-4 w-4" /> Hapus</Button>
                      </form>
                    </div>
                  </div>
                ))}
                {guru.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Belum ada guru terdaftar.
                  </div>
                )}
              </CardContent>
            </Card>

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
                        {u.email} • {u.school?.name ?? "-"} • {u.educationLevel ? levelDisplayLabel(u.educationLevel) : "-"}
                        {u.classLevel ? ` / ${u.classLevel}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link href={`/dashboard/admin/users/${u.id}`}>
                        <Button size="sm" variant="ghost"><User className="h-4 w-4" /> Detail</Button>
                      </Link>
                      <form action={archiveUserAction.bind(null, u.id)}>
                        <Button size="sm" variant="ghost" className="text-red-600"><Archive className="h-4 w-4" /> Hapus</Button>
                      </form>
                    </div>
                  </div>
                ))}
                {murid.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Belum ada murid terdaftar. Murid mendaftar sendiri melalui halaman registrasi.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "murid" && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Semua Murid ({murid.length})</CardTitle>
                <form method="get" className="flex items-center gap-2">
                  <input type="hidden" name="tab" value="murid" />
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      name="q"
                      defaultValue={q}
                      placeholder="Cari murid..."
                      className="h-10 w-64 rounded-lg border border-border bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-blue-800">Cari</button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Sekolah</th>
                      <th className="px-4 py-3">Jenjang/Kelas</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {murid.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">{u.school?.name ?? "-"}</td>
                        <td className="px-4 py-3">{u.educationLevel ? levelDisplayLabel(u.educationLevel) : "-"}{u.classLevel ? ` / ${u.classLevel}` : ""}</td>
                        <td className="px-4 py-3">
                          {u.status === "ACTIVE" ? <Badge variant="success">Aktif</Badge> : u.status === "PENDING" ? <Badge variant="warning">Pending</Badge> : <Badge variant="danger">Nonaktif</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link href={`/dashboard/admin/users/${u.id}`}><Button size="sm" variant="outline">Detail</Button></Link>
                            <form action={archiveUserAction.bind(null, u.id)}>
                              <Button size="sm" variant="ghost" className="text-red-600"><Archive className="h-4 w-4" /></Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {murid.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Tidak ada murid.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "polisi" && (
          <Card>
            <CardHeader>
              <CardTitle>Akun Kepolisian ({polisi.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Tingkat Kesatuan</th>
                      <th className="px-4 py-3">Nama Kesatuan</th>
                      <th className="px-4 py-3">Divisi / Bagian</th>
                      <th className="px-4 py-3">Sekolah</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {polisi.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">{policeLevelLabel(u.policeLevel)}</td>
                        <td className="px-4 py-3">{u.policeUnit ?? "-"}</td>
                        <td className="px-4 py-3">{u.policeDivision ?? "-"}</td>
                        <td className="px-4 py-3">{u.school?.name ?? "Satlantas / Umum"}</td>
                        <td className="px-4 py-3">
                          {u.status === "ACTIVE" ? <Badge variant="success">Aktif</Badge> : u.status === "PENDING" ? <Badge variant="warning">Pending</Badge> : <Badge variant="danger">Nonaktif</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link href={`/dashboard/admin/users/${u.id}`}><Button size="sm" variant="outline">Detail</Button></Link>
                            <form action={toggleUserStatusAction.bind(null, u.id)}>
                              <Button size="sm" variant="ghost">
                                {u.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                              </Button>
                            </form>
                            <form action={archiveUserAction.bind(null, u.id)}>
                              <Button size="sm" variant="ghost" className="text-red-600"><Archive className="h-4 w-4" /></Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {polisi.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Belum ada akun kepolisian.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "terhapus" && (
          <Card>
            <CardHeader>
              <CardTitle>Pengguna Terhapus</CardTitle>
              <p className="text-sm text-muted-foreground">
                Akun yang diarsipkan (soft delete) menurut kategori. Histori tetap tersimpan dan dapat dipulihkan.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {(["GURU", "MURID", "POLISI"] as const).map((role) => {
                const list = archived.filter((u) => u.role === role);
                if (list.length === 0) return null;
                return (
                  <div key={role}>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {ROLE_LABEL[role]} ({list.length})
                    </h3>
                    <div className="space-y-2">
                      {list.map((u) => (
                        <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{u.name}</p>
                              <Badge variant="danger">Terhapus</Badge>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {u.email} • {u.school?.name ?? "-"} • Dihapus:{" "}
                              {u.deletedAt ? u.deletedAt.toLocaleDateString("id-ID") : "-"}
                              {deletedByMap.get(u.id) ? ` • Oleh: ${deletedByMap.get(u.id)}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Link href={`/dashboard/admin/users/${u.id}`}>
                              <Button size="sm" variant="outline">Detail</Button>
                            </Link>
                            <div className="flex gap-2">
                              <form action={restoreUserAction.bind(null, u.id)}>
                                <Button size="sm" variant="outline" className="text-emerald-600">
                                  <RotateCcw className="h-4 w-4" /> Pulihkan
                                </Button>
                              </form>
                              <form
                                action={permanentDeleteUserAction.bind(null, u.id)}
                                onSubmit={(e) => {
                                  const ok = window.confirm(
                                    `Hapus permanen akun "${u.name}"?\n\nAkun, data belajar, sesi, dan file miliknya akan dihapus dari sistem secara permanen dan TIDAK DAPAT dipulihkan kembali.`
                                  );
                                  if (!ok) e.preventDefault();
                                }}
                              >
                                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" /> Hapus Permanen
                                </Button>
                              </form>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {archived.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Tidak ada akun yang diarsipkan. Akun yang dihapus akan muncul di sini.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "buat" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Buat Akun</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pilih tab untuk membuat akun Guru atau Polisi secara terpisah.
                </p>
              </CardHeader>
              <CardContent>
                <CreateUserForm schools={schools.map((s) => ({ id: s.id, name: s.name }))} action={createGuruPolisi} />
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Catatan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Akun murid dibuat melalui halaman <Link href="/register" className="text-primary hover:underline">Registrasi</Link>.</p>
                <p>• Akun guru & polisi hanya dapat dibuat oleh Admin.</p>
                <p>• Hapus akun = soft delete (histori tetap tersimpan, dapat dipulihkan).</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
