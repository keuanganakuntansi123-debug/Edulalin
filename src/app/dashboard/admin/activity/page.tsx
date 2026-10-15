import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma, type $Enums } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const instant = false;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; action?: string }>;
}) {
  await requireRole("ADMIN");
  const { page: pageParam, tab = "all", action } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const pageSize = 25;

  const roleFilter =
    tab === "sekolah"
      ? { OR: [{ actor: { role: "GURU" as $Enums.Role } }, { actor: { role: "MURID" as $Enums.Role } }] }
      : tab === "polisi"
        ? { actor: { role: "POLISI" as $Enums.Role } }
        : tab === "admin"
          ? { actor: { role: "ADMIN" as $Enums.Role } }
          : {};

  const where = {
    ...roleFilter,
    ...(action ? { action } : {}),
  } as Prisma.ActivityLogWhereInput;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { name: true, role: true } },
        school: { select: { name: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const allActions = await prisma.activityLog.findMany({
    where: roleFilter,
    distinct: ["action"],
    select: { action: true },
  });

  const tabs = [
    { key: "all", label: "Semua Aktivitas" },
    { key: "sekolah", label: "Sekolah / Guru / Murid" },
    { key: "polisi", label: "Kepolisian" },
    { key: "admin", label: "Admin" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Aktivitas Sistem</h1>
      <p className="mt-1 text-muted-foreground">
        Audit trail seluruh aktivitas penting: login, registrasi, perubahan modul/kuis, dan lainnya.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 border-b border-border">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={`/dashboard/admin/activity${t.key !== "all" ? `?tab=${t.key}` : ""}`}
              className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary"
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
          <select
            name="action"
            defaultValue={action ?? ""}
            className="h-10 rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Semua Aksi</option>
            {allActions.map((a) => (
              <option key={a.action} value={a.action}>{a.action}</option>
            ))}
          </select>
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-blue-800">
            Terapkan
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu (Tanggal &amp; Jam)</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead>Sekolah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  <p className="font-medium">
                    {log.createdAt.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.createdAt.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{log.actor?.name ?? "Sistem"}</span>
                  {log.actor?.role ? (
                    <Badge variant="secondary" className="ml-2">{log.actor.role}</Badge>
                  ) : null}
                </TableCell>
                <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{log.entity}</TableCell>
                <TableCell className="text-muted-foreground">{log.school?.name ?? "-"}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada aktivitas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <p>Halaman {page} dari {pages}</p>
        <div className="flex gap-2">
          <a
            href={`/dashboard/admin/activity?page=${page - 1}`}
            className={`rounded-lg border border-border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}
          >
            Prev
          </a>
          <a
            href={`/dashboard/admin/activity?page=${page + 1}`}
            className={`rounded-lg border border-border px-3 py-1.5 ${page >= pages ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}
          >
            Next
          </a>
        </div>
      </div>
    </div>
  );
}