import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel, DISPLAY_CATEGORIES, DISPLAY_CATEGORY_LABEL, categoryOf } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleForm } from "./module-form";
import { createModule, toggleModuleStatus, archiveModule } from "@/app/actions/admin-actions";
import { fileUrl } from "@/lib/storage";
import Link from "next/link";
import { IdCard } from "lucide-react";

export const instant = false;

async function toggleModuleAction(id: string) {
  "use server";
  await toggleModuleStatus(id);
}

async function archiveModuleAction(id: string) {
  "use server";
  await archiveModule(id);
}

export default async function AdminModulesPage() {
  await requireRole("ADMIN");

  const [modules, schools] = await Promise.all([
    prisma.module.findMany({
      where: { deletedAt: null },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        school: { select: { name: true } },
        _count: { select: { progresses: true, quizzes: true } },
        moduleToSchools: { include: { school: { select: { name: true } } } },
        contentFile: { select: { originalName: true, mimeType: true, size: true, storedName: true } },
      },
    }),
    prisma.school.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);
  const byCategory = DISPLAY_CATEGORIES.map((c) => ({
    category: c,
    label: DISPLAY_CATEGORY_LABEL[c],
    modules: modules.filter((m) => categoryOf(m.educationLevel) === c),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kelola Modul</h1>
          <p className="text-muted-foreground">Tambahkan, ubah, atau arsipkan materi belajar.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Daftar modul */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-2">
            {byCategory.map(({ category, label, modules: ms }) => (
              <details key={category} className="w-full" open={ms.length > 0}>
                <summary className="flex cursor-pointer select-none items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary/50">
                  <span>
                    Kategori {label}
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {ms.length}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">klik untuk buka/tutup</span>
                </summary>
                <div className="mt-3 space-y-3">
                  {ms.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="pt-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{m.title}</h3>
                              <Badge variant="secondary">{levelDisplayLabel(m.educationLevel)}</Badge>
                              {m.educationLevel === "SIM" && (
                                <Badge className="bg-sky-100 text-sky-700">
                                  <IdCard className="mr-1 h-3 w-3" /> SIM
                                </Badge>
                              )}
                              {m.moduleToSchools.length > 0 ? (
                                <Badge variant="warning">{m.moduleToSchools.length} sekolah</Badge>
                              ) : m.school ? (
                                <Badge variant="warning">{m.school.name}</Badge>
                              ) : (
                                <Badge variant="outline">Global</Badge>
                              )}
                              {m.status === "ACTIVE" ? (
                                <Badge variant="success">Aktif</Badge>
                              ) : (
                                <Badge variant="secondary">Nonaktif</Badge>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                            {m.moduleToSchools.length > 0 && (
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                Tujuan: {m.moduleToSchools.map((s) => s.school.name).join(", ")}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                              {m.moduleType}
                              {m.contentFile ? ` • ${m.contentFile.originalName}` : ""}
                              {" • "}
                              {m.durationMin ? `± ${m.durationMin} menit` : "-"} • {m._count.progresses} dibaca • {m._count.quizzes} kuis
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {m.contentFile ? (
                              <a href={fileUrl(m.contentFile.storedName)} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline">Pratinjau</Button>
                              </a>
                            ) : m.contentUrl ? (
                              <a href={m.contentUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline">Pratinjau</Button>
                              </a>
                            ) : null}
                            <Link href={`/dashboard/admin/modules/${m.id}`}>
                              <Button size="sm" variant="outline">Edit</Button>
                            </Link>
                            <form action={toggleModuleAction.bind(null, m.id)}>
                              <Button type="submit" size="sm" variant="outline">
                                {m.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                              </Button>
                            </form>
                            <form action={archiveModuleAction.bind(null, m.id)}>
                              <Button type="submit" size="sm" variant="ghost" className="text-red-600">
                                Arsipkan
                              </Button>
                            </form>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {ms.length === 0 && (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        Belum ada modul pada kategori {label}.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Form tambah */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Tambah Modul</CardTitle>
            </CardHeader>
            <CardContent>
              <ModuleForm
                schools={schools.map((s) => ({ id: s.id, name: s.name }))}
                action={createModule}
              />
            </CardContent>
          </Card>
          <Link href="/dashboard/admin/reports" className="mt-4 block text-sm text-primary hover:underline">
            Lihat laporan modul →
          </Link>
        </div>
      </div>
    </div>
  );
}
