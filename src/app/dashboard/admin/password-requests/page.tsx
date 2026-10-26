import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PasswordRequestList, type PasswordRequestItem } from "./password-request-list";
import { KeyRound, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

export const instant = false;

type SearchParams = { status?: string };

export default async function AdminPasswordRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN");
  const { status = "PENDING" } = await searchParams;

  const where: Prisma.PasswordResetRequestWhereInput =
    status === "ALL"
      ? {}
      : status === "DONE"
        ? { status: { in: ["COMPLETED", "REJECTED"] } }
        : { status: "PENDING" };

  const [requests, pendingCount, completedCount, rejectedCount] = await Promise.all([
    prisma.passwordResetRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        handledBy: { select: { name: true } },
        user: { select: { id: true, status: true, deletedAt: true, phone: true } },
      },
    }),
    prisma.passwordResetRequest.count({ where: { status: "PENDING" } }),
    prisma.passwordResetRequest.count({ where: { status: "COMPLETED" } }),
    prisma.passwordResetRequest.count({ where: { status: "REJECTED" } }),
  ]);

  const items: PasswordRequestItem[] = requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    email: r.email,
    role: r.role,
    schoolName: r.schoolName,
    educationLevel: r.educationLevel,
    classLevel: r.classLevel,
    major: r.major,
    subject: r.subject,
    policeLevel: r.policeLevel,
    policeUnit: r.policeUnit,
    policeDivision: r.policeDivision,
    note: r.note,
    status: r.status,
    verified: r.verified,
    matchScore: r.matchScore,
    matchedFields: Array.isArray(r.matchedFields) ? (r.matchedFields as string[]) : [],
    mismatchFields: Array.isArray(r.mismatchFields) ? (r.mismatchFields as string[]) : [],
    handledByName: r.handledBy?.name ?? null,
    handledAt: r.handledAt ? r.handledAt.toISOString() : null,
    rejectReason: r.rejectReason,
    createdAt: r.createdAt.toISOString(),
    userStatus: r.user.status,
    userDeleted: Boolean(r.user.deletedAt),
  }));

  const tabs = [
    { key: "PENDING", label: "Menunggu", count: pendingCount, icon: Clock },
    { key: "DONE", label: "Selesai / Ditolak", count: completedCount + rejectedCount, icon: CheckCircle2 },
    { key: "ALL", label: "Semua", count: pendingCount + completedCount + rejectedCount, icon: KeyRound },
  ];

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <KeyRound className="h-6 w-6 text-primary" /> Kelola Lupa Password
      </h1>
      <p className="mt-1 text-muted-foreground">
        Verifikasi pengajuan reset password pengguna, lalu atur password baru. Pengguna tidak
        perlu OTP email dan tidak kehilangan data akun.
      </p>

      {/* Ringkasan */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Menunggu</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Selesai</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Ditolak</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="h-8 w-8 text-sky-500" />
            <div>
              <p className="text-2xl font-bold">Admin</p>
              <p className="text-xs text-muted-foreground">Verifikasi manual</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab status */}
      <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/dashboard/admin/password-requests${t.key !== "PENDING" ? `?status=${t.key}` : ""}`}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              status === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            <Badge variant={t.key === "PENDING" && t.count > 0 ? "warning" : "secondary"}>
              {t.count}
            </Badge>
          </a>
        ))}
      </div>

      <div className="mt-5">
        <PasswordRequestList items={items} />
      </div>
    </div>
  );
}
