"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Mail, RefreshCw, Send, AlertTriangle, CheckCircle2, Clock, MailCheck } from "lucide-react";
import {
  resendEmailLog,
  resendAllFailedEmails,
  sendTestEmail,
} from "@/app/actions/email-actions";

export type EmailLogItem = {
  id: string;
  kind: string;
  toEmail: string;
  subject: string;
  status: "PENDING" | "SENT" | "FAILED";
  error: string | null;
  attempts: number;
  sentAt: string | null;
  createdAt: string;
};

const KIND_LABEL: Record<string, string> = {
  PASSWORD_REQUEST: "Pengajuan Lupa Password",
  PASSWORD_CHANGED: "Perubahan Password",
};

function statusBadge(status: EmailLogItem["status"]) {
  if (status === "SENT")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Terkirim
      </Badge>
    );
  if (status === "FAILED")
    return (
      <Badge variant="danger" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Gagal
      </Badge>
    );
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="h-3 w-3" /> Menunggu
    </Badge>
  );
}

export function EmailLogList({
  items,
  configured,
  host,
  port,
  sender,
  missing,
}: {
  items: EmailLogItem[];
  configured: boolean;
  host: string;
  port: number;
  sender: string;
  missing: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const failedCount = items.filter((i) => i.status === "FAILED").length;

  const doTest = () => {
    startTransition(async () => {
      const res = await sendTestEmail();
      toast({
        title: res.ok ? "Email uji terkirim" : "Email uji gagal",
        description: res.message,
        variant: res.ok ? "success" : "error",
      });
      router.refresh();
    });
  };

  const doResend = (id: string) => {
    setResendingId(id);
    startTransition(async () => {
      const res = await resendEmailLog(id);
      toast({
        title: res.ok ? "Email dikirim ulang" : "Gagal mengirim ulang",
        description: res.message,
        variant: res.ok ? "success" : "error",
      });
      setResendingId(null);
      router.refresh();
    });
  };

  const doResendAll = () => {
    startTransition(async () => {
      const res = await resendAllFailedEmails();
      toast({
        title: res.ok ? "Selesai" : "Sebagian gagal",
        description: res.message,
        variant: res.ok ? "success" : "error",
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {/* Konfigurasi email */}
      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <MailCheck
                className={`mt-0.5 h-4 w-4 shrink-0 ${configured ? "text-emerald-600" : "text-amber-600"}`}
              />
              <div>
                <p className="font-medium">
                  {configured ? "Email notifikasi aktif" : "Email notifikasi belum dikonfigurasi"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Server: {host}:{port} · Pengirim: {sender || "—"}
                </p>
                {!configured && (
                  <p className="mt-1 text-xs text-amber-600">
                    Variabel belum diisi: {missing.join(", ")}. Simpan kredensial di environment
                    variable server (bukan di kode/frontend).
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={doTest} disabled={pending || !configured}>
              <Send className="h-4 w-4" /> Kirim Email Uji
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Riwayat email */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Riwayat Email Notifikasi</h2>
          <p className="text-sm text-muted-foreground">
            Status pengiriman email pengajuan & perubahan password.
          </p>
        </div>
        {failedCount > 0 && (
          <Button variant="outline" size="sm" onClick={doResendAll} disabled={pending}>
            <RefreshCw className="h-4 w-4" /> Kirim ulang semua gagal ({failedCount})
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Mail className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Belum ada email terkirim</p>
            <p className="text-sm text-muted-foreground">
              Email pengajuan lupa password dan perubahan password akan tercatat di sini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{KIND_LABEL[item.kind] ?? item.kind}</p>
                    {statusBadge(item.status)}
                    <span className="text-xs text-muted-foreground">
                      {item.attempts}x percobaan
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ke: <span className="font-medium">{item.toEmail}</span>
                    {item.sentAt ? ` · Terkirim: ${item.sentAt}` : ` · Dibuat: ${item.createdAt}`}
                  </p>
                  {item.error && (
                    <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                      {item.error}
                    </p>
                  )}
                </div>
                {item.status === "FAILED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => doResend(item.id)}
                    disabled={pending && resendingId === item.id}
                  >
                    <RefreshCw className="h-4 w-4" /> Kirim ulang
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
