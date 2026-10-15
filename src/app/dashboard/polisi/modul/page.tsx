import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const instant = false;

export default async function PolisiModulPage() {
  await requireRole("POLISI");

  const modules = await prisma.module.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      _count: { select: { progresses: true, quizzes: true } },
    },
  });

  const totalReads = modules.reduce((a, m) => a + m._count.progresses, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Modul Murid</h1>
      <p className="mt-1 text-muted-foreground">
        Modul edukasi yang tersedia dan total pembacaan (progress) di seluruh sekolah ({totalReads}).
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {modules.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{m.title}</h3>
                <Badge variant="secondary">
                  {m.educationLevel === "SIM" ? "SMA/SMK" : LEVEL_LABEL[m.educationLevel]}
                </Badge>
                {m.educationLevel === "SIM" && (
                  <Badge className="bg-sky-100 text-sky-700">SIM</Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {m._count.progresses} pembacaan • {m._count.quizzes} kuis terkait
              </p>
            </CardContent>
          </Card>
        ))}
        {modules.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Belum ada modul.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
