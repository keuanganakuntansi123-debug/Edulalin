import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { levelDisplayLabel, ROLE_LABEL, policeLevelLabel } from "@/lib/constants";
import { ArrowLeft, Mail, School, CalendarDays, Phone, ShieldCheck, BookMarked } from "lucide-react";
import { archiveUser, restoreUser, toggleUserStatus } from "@/app/actions/admin-actions";

export const instant = false;

async function archiveAction(id: string) {
  "use server";
  await archiveUser(id);
}
async function restoreAction(id: string) {
  "use server";
  await restoreUser(id);
}
async function toggleAction(id: string) {
  "use server";
  await toggleUserStatus(id);
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireRole("ADMIN");

  const [user, attempts, progresses, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { school: { select: { name: true, educationLevel: true } } },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: id },
      orderBy: { submittedAt: "desc" },
      take: 30,
      include: { quiz: { select: { title: true } } },
    }),
    prisma.moduleProgress.findMany({
      where: { userId: id },
      orderBy: { lastOpened: "desc" },
      take: 20,
      include: { module: { select: { title: true } } },
    }),
    prisma.activityLog.findMany({
      where: { actorId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  if (!user) notFound();
  if (!admin) redirect("/dashboard/admin");

  const isArchived = !!user.deletedAt;

  return (
    <div>
      <Link
        href="/dashboard/admin/users"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Kelola Pengguna
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {user.embeddedAvatar ?? user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.embeddedAvatar ?? user.avatarUrl ?? ""}
              alt={user.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
              {isArchived ? (
                <Badge variant="danger">Terhapus</Badge>
              ) : user.status === "ACTIVE" ? (
                <Badge variant="success">Aktif</Badge>
              ) : user.status === "PENDING" ? (
                <Badge variant="warning">Pending</Badge>
              ) : (
                <Badge variant="danger">Nonaktif</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Terdaftar sejak {user.createdAt.toLocaleDateString("id-ID")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isArchived && user.role !== "ADMIN" && (
            <>
              <form action={toggleAction.bind(null, user.id)}>
                <Button size="sm" variant="outline">
                  {user.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </form>
              <form action={archiveAction.bind(null, user.id)}>
                <Button size="sm" variant="ghost" className="text-red-600">
                  Hapus Akun
                </Button>
              </form>
            </>
          )}
          {isArchived && (
            <form action={restoreAction.bind(null, user.id)}>
              <Button size="sm">Pulihkan Akun</Button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data Identitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /> {user.email}</div>
            <div className="flex items-center gap-3"><School className="h-4 w-4 text-muted-foreground" /> {user.school?.name ?? "-"}</div>
            <div className="flex items-center gap-3">
              <School className="h-4 w-4 text-muted-foreground" />
              {user.educationLevel ? `${levelDisplayLabel(user.educationLevel)}${user.classLevel ? ` / Kelas ${user.classLevel}` : ""}` : "-"}
            </div>
            {user.birthDate && (
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {user.birthDate.toLocaleDateString("id-ID")}
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /> {user.phone}</div>
            )}
            {user.role === "POLISI" && (
              <div className="mt-2 space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
                  <ShieldCheck className="h-4 w-4" /> Identitas Kepolisian
                </p>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Tingkat: {policeLevelLabel(user.policeLevel)}
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Nama Kesatuan: {user.policeUnit ?? "-"}
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Divisi/Bagian: {user.policeDivision ?? "-"}
                </div>
              </div>
            )}
            {user.role === "GURU" && user.subject && (
              <div className="flex items-center gap-3">
                <BookMarked className="h-4 w-4 text-muted-foreground" />
                Mata Pelajaran: {user.subject}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Kuis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {attempts.length === 0 && (
              <p className="text-muted-foreground">Belum ada pengerjaan kuis.</p>
            )}
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{a.quiz.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.score ?? "-"} poin • {a.passed ? "Lulus" : a.submittedAt ? "Belum lulus" : "Belum selesai"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {a.submittedAt ? a.submittedAt.toLocaleDateString("id-ID") : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progres Modul</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {progresses.length === 0 && (
              <p className="text-muted-foreground">Belum ada progres modul.</p>
            )}
            {progresses.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.module.title}</p>
                  <p className="text-xs text-muted-foreground">Terakhir dibuka {p.lastOpened.toLocaleDateString("id-ID")}</p>
                </div>
                <div className="w-32">
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-muted-foreground">{p.progress}%</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {logs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Aktivitas Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <span className="font-medium">{l.action}</span>
                <span className="text-xs text-muted-foreground">{l.createdAt.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}