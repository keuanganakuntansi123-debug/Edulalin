import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { getMailStatus } from "@/lib/mail";
import { formatDateTimeShortWib } from "@/lib/format-wib";
import { EmailLogList, type EmailLogItem } from "./email-log-list";
import { Mail } from "lucide-react";

export const instant = false;

/** Pantau status & kirim ulang email notifikasi. ADMIN-only. */
export default async function AdminEmailLogPage() {
  await requireRole("ADMIN");

  const logs = await prisma.notificationEmailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const items: EmailLogItem[] = logs.map((l) => ({
    id: l.id,
    kind: l.kind,
    toEmail: l.toEmail,
    subject: l.subject,
    status: l.status,
    error: l.error,
    attempts: l.attempts,
    sentAt: l.sentAt ? formatDateTimeShortWib(l.sentAt) : null,
    createdAt: formatDateTimeShortWib(l.createdAt),
  }));

  const status = getMailStatus();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Mail className="h-6 w-6 text-primary" /> Notifikasi Email
      </h1>
      <p className="mt-1 text-muted-foreground">
        Pantau status pengiriman email pengajuan lupa password & perubahan password, serta kirim
        ulang bila terjadi kegagalan.
      </p>

      <div className="mt-5">
        <EmailLogList
          items={items}
          configured={status.configured}
          host={status.host}
          port={status.port}
          sender={status.user}
          missing={status.missing}
        />
      </div>
    </div>
  );
}
