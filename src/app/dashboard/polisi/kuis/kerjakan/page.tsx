import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export const instant = false;

export default async function PolisiKerjakanKuisPage() {
  await requireRole("POLISI");

  const quizzes = await prisma.quiz.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      module: { select: { title: true } },
      quizToSchools: { include: { school: { select: { name: true } } } },
      school: { select: { name: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Kerjakan Kuis (Polisi)</h1>
      <p className="mt-1 text-muted-foreground">
        Polisi dapat mengerjakan seluruh kuis dari semua sekolah. Hasil pengerjaan Anda tercatat terpisah dari nilai murid dan tidak memengaruhi statistik kelulusan murid.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((q) => {
          const targets = q.quizToSchools.map((s) => s.school.name);
          const targetLabel = targets.length > 0 ? targets.join(", ") : q.school?.name ?? "Semua Sekolah";
          return (
            <Card key={q.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {q.educationLevel === "SIM" ? "SMA/SMK" : LEVEL_LABEL[q.educationLevel]}
                  </Badge>
                  {q.module && <Badge className="bg-slate-100 text-slate-600">Modul</Badge>}
                </div>
                <h3 className="mt-3 font-semibold line-clamp-1">{q.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <ClipboardList className="h-4 w-4" /> {q._count.questions} soal
                  <span>•</span> Lulus ≥ {q.minScore}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">Sekolah: {targetLabel}</p>
                <Link href={`/dashboard/polisi/kuis/kerjakan/${q.id}`} className="mt-4 block">
                  <Button type="button" className="w-full">
                    Kerjakan Kuis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
        {quizzes.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="pt-8 text-center text-muted-foreground">
              Belum ada kuis aktif untuk dikerjakan.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
