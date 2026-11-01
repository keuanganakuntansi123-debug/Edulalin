import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma, type $Enums } from "@/generated/prisma/client";
import { getRoleLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActivityLive } from "./activity-live";

export const instant = false;

/**
 * Aktivitas Sistem hanya menampilkan tiga jenis aktivitas penting dari SELURUH
 * aktor (Admin, Guru, Murid, Polisi): LOGIN, LOGOUT, dan aktivitas terkait
 * RESET PASSWORD. Aktivitas lain tetap tersimpan di database (audit trail) —
 * hanya tidak ditampilkan di halaman ini.
 */
const LOGIN_ACTIONS = ["LOGIN"];
const LOGOUT_ACTIONS = ["LOGOUT"];
const RESET_ACTIONS = [
  "PASSWORD_RESET_REQUEST_SUBMITTED",
  "PASSWORD_RESET_COMPLETED_BY_ADMIN",
  "PASSWORD_RESET_REQUEST_REJECTED",
  "PASSWORD_RESET_REQUEST_DELETED",
  "PASSWORD_CHANGED_BY_USER",
];
const WATCHED_ACTIONS = [...LOGIN_ACTIONS, ...LOGOUT_ACTIONS, ...RESET_ACTIONS];

const ACTION_META: Record<string, { label: string; className: string }> = {
  LOGIN: { label: "Login", className: "border-sky-200 bg-sky-50 text-sky-700" },
  LOGOUT: { label: "Logout", className: "border-slate-200 bg-slate-100 text-slate-700" },
  PASSWORD_RESET_REQUEST_SUBMITTED: {
    label: "Reset Password — Pengajuan",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  PASSWORD_RESET_COMPLETED_BY_ADMIN: {
    label: "Reset Password — Diproses Admin",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  PASSWORD_RESET_REQUEST_REJECTED: {
    label: "Reset Password — Ditolak",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  PASSWORD_RESET_REQUEST_DELETED: {
    label: "Reset Password — Dihapus",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  PASSWORD_CHANGED_BY_USER: {
    label: "Reset Password — Ubah Mandiri",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
};

const MODES = [
  { value: "", label: "Semua Aksi" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "reset", label: "Reset Password" },
];

function actionFilter(action?: string): Prisma.ActivityLogWhereInput {
  if (action === "login") return { action: { in: LOGIN_ACTIONS } };
  if (action === "logout") return { action: { in: LOGOUT_ACTIONS } };
  if (action === "reset") return { action: { in: RESET_ACTIONS } };
  return {};
}

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
    // Batasi hanya aktivitas Login, Logout, dan Reset Password.
    action: { in: WATCHED_ACTIONS },
    ...actionFilter(action),
  } as Prisma.ActivityLogWhereInput;

  const [logs, total, counts] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { name: true, role: true, email: true } },
        school: { select: { name: true } },
      },
    }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.groupBy({
      by: ["action"],
      where: { ...roleFilter, action: { in: WATCHED_ACTIONS } } as Prisma.ActivityLogWhereInput,
      _count: { _all: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const countFor = (actions: string[]) =>
    counts
      .filter((c) => actions.includes(c.action))
      .reduce((sum, c) => sum + c._count._all, 0);

  const summary = [
    { label: "Login", value: countFor(LOGIN_ACTIONS), tone: "text-sky-700" },
    { label: "Logout", value: countFor(LOGOUT_ACTIONS), tone: "text-slate-700" },
    { label: "Reset Password", value: countFor(RESET_ACTIONS), tone: "text-amber-700" },
  ];

  const tabs = [
    { key: "all", label: "Semua Aktor" },
    { key: "sekolah", label: "Sekolah / Guru / Murid" },
    { key: "polisi", label: "Kepolisian" },
    { key: "admin", label: "Admin" },
  ];

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const tabValue = overrides.tab ?? (tab !== "all" ? tab : undefined);
    const actionValue = overrides.action ?? action;
    const pageValue = overrides.page;
    if (tabValue) params.set("tab", tabValue);
    if (actionValue) params.set("action", actionValue);
    if (pageValue && pageValue !== "1") params.set("page", pageValue);
    const qs = params.toString();
    return `/dashboard/admin/activity${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Aktivitas Sistem</h1>
          <p className="mt-1 text-muted-foreground">
            Pantau aktivitas <span className="font-medium">Login</span>,{" "}
            <span className="font-medium">Logout</span>, dan{" "}
            <span className="font-medium">Reset Password</span> dari seluruh aktor (Admin, Guru,
            Murid, Polisi) secara real-time.
          </p>
        </div>
        <ActivityLive />
      </div>

      {/* Ringkasan jumlah per jenis aktivitas */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 border-b border-border">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={buildUrl({ tab: t.key === "all" ? undefined : t.key, page: undefined })}
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
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <select
            name="action"
            defaultValue={action ?? ""}
            className="h-10 rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {MODES.map((m) => (
              <option key={m.label} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-blue-800"
          >
            Terapkan
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu (Tanggal &amp; Jam)</TableHead>
              <TableHead>Identitas Pengguna</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Sekolah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const meta = ACTION_META[log.action];
              return (
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
                      <Badge variant="secondary" className="ml-2">
                        {getRoleLabel(log.actor.role)}
                      </Badge>
                    ) : null}
                    {log.actor?.email ? (
                      <p className="text-xs text-muted-foreground">{log.actor.email}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={meta?.className}>
                      {meta?.label ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.school?.name ?? "-"}</TableCell>
                </TableRow>
              );
            })}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Belum ada aktivitas Login, Logout, atau Reset Password.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Halaman {page} dari {pages} • {total} aktivitas
        </p>
        <div className="flex gap-2">
          <a
            href={buildUrl({ page: String(page - 1) })}
            className={`rounded-lg border border-border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}
          >
            Prev
          </a>
          <a
            href={buildUrl({ page: String(page + 1) })}
            className={`rounded-lg border border-border px-3 py-1.5 ${page >= pages ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}
          >
            Next
          </a>
        </div>
      </div>
    </div>
  );
}