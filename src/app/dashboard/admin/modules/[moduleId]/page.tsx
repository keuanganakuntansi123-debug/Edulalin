import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ModuleForm } from "../module-form";
import { updateModule } from "@/app/actions/admin-actions";

export const instant = false;

export default async function AdminModuleDetailPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  await requireRole("ADMIN");

  const [mod, schools] = await Promise.all([
    prisma.module.findFirst({
      where: { id: moduleId, deletedAt: null },
      include: {
        moduleToSchools: { select: { schoolId: true } },
        contentFile: { select: { originalName: true, mimeType: true, size: true } },
        thumbnailFile: { select: { originalName: true, mimeType: true, size: true } },
      },
    }),
    prisma.school.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, educationLevel: true },
    }),
  ]);
  if (!mod) notFound();

  return (
    <div>
      <Link
        href="/dashboard/admin/modules"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar modul
      </Link>
      <h1 className="text-2xl font-bold">Edit Modul — {mod.title}</h1>
      <p className="mt-1 text-muted-foreground">
        Ubah materi, sekolah tujuan, atau status modul.
        {mod.contentFile && <> File saat ini: {mod.contentFile.originalName}</>}
      </p>

      <div className="mt-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Detail Modul</CardTitle>
          </CardHeader>
          <CardContent>
            <ModuleForm
              schools={schools.map((s) => ({
                id: s.id,
                name: s.name,
                educationLevel: s.educationLevel,
              }))}
              action={updateModule.bind(null, mod.id)}
              defaultValues={{
                title: mod.title,
                description: mod.description,
                isSim: mod.educationLevel === "SIM",
                educationLevel: mod.educationLevel,
                moduleType: mod.moduleType,
                contentUrl: mod.contentUrl,
                durationMin: mod.durationMin,
                status: mod.status,
                schoolIds: mod.moduleToSchools.map((s) => s.schoolId),
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}