"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";
import {
  resetPasswordByRequest,
  rejectPasswordRequest,
  deletePasswordRequest,
} from "@/app/actions/password-reset-actions";
import { identityFieldLabel } from "@/lib/password-request";
import { ROLE_LABEL, levelDisplayLabel, policeLevelLabel } from "@/lib/constants";
import {
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronDown,
  User,
  Mail,
  Calendar,
  BadgeCheck,
} from "lucide-react";

export type PasswordRequestItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "GURU" | "POLISI" | "MURID";
  schoolName: string | null;
  educationLevel: string | null;
  classLevel: string | null;
  major: string | null;
  subject: string | null;
  policeLevel: string | null;
  policeUnit: string | null;
  policeDivision: string | null;
  note: string | null;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  verified: boolean;
  matchScore: number;
  matchedFields: string[];
  mismatchFields: string[];
  handledByName: string | null;
  handledAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  userStatus: string;
  userDeleted: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(item: PasswordRequestItem) {
  if (item.status === "COMPLETED") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Selesai
      </Badge>
    );
  }
  if (item.status === "REJECTED") {
    return (
      <Badge variant="danger" className="gap-1">
        <XCircle className="h-3 w-3" /> Ditolak
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="h-3 w-3" /> Menunggu
    </Badge>
  );
}

export function PasswordRequestList({ items }: { items: PasswordRequestItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Tidak ada pengajuan</p>
          <p className="text-sm text-muted-foreground">
            Pengajuan lupa password dari pengguna akan muncul di sini.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <PasswordRequestCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function PasswordRequestCard({ item }: { item: PasswordRequestItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const isPending = item.status === "PENDING";

  function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData();
    fd.set("newPassword", password);
    fd.set("confirmPassword", confirmPassword);
    startTransition(async () => {
      const result = await resetPasswordByRequest(item.id, fd);
      if (result.error) {
        toast({ title: "Gagal", description: result.error, variant: "error" });
        return;
      }
      toast({
        title: "Password berhasil diatur ulang",
        description: result.message ?? "Pengajuan ditandai selesai.",
        variant: "success",
      });
      setPassword("");
      setConfirmPassword("");
      setOpen(false);
      router.refresh();
    });
  }

  function handleReject() {
    const reason = rejectReason.trim() || "Identitas tidak dapat diverifikasi";
    startTransition(async () => {
      const result = await rejectPasswordRequest(item.id, reason);
      if (result.error) {
        toast({ title: "Gagal", description: result.error, variant: "error" });
        return;
      }
      toast({ title: "Pengajuan ditolak", variant: "success" });
      setRejectReason("");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("Hapus riwayat pengajuan ini?")) return;
    startTransition(async () => {
      const result = await deletePasswordRequest(item.id);
      if (result.error) {
        toast({ title: "Gagal", description: result.error, variant: "error" });
        return;
      }
      toast({ title: "Riwayat pengajuan dihapus", variant: "success" });
      router.refresh();
    });
  }

  const identityRows: { label: string; value: string | null }[] = [
    { label: "Sekolah", value: item.schoolName },
    { label: "Jenjang", value: item.educationLevel ? levelDisplayLabel(item.educationLevel) : null },
    { label: "Kelas", value: item.classLevel },
    { label: "Jurusan", value: item.major },
    { label: "Mata Pelajaran", value: item.subject },
    { label: "Tingkat Kesatuan", value: item.policeLevel ? policeLevelLabel(item.policeLevel) : null },
    { label: "Nama Kesatuan", value: item.policeUnit },
    { label: "Divisi / Satuan", value: item.policeDivision },
  ].filter((r) => r.value);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{item.name}</p>
              <Badge variant="outline">{ROLE_LABEL[item.role]}</Badge>
              {statusBadge(item)}
              {item.verified ? (
                <Badge variant="success" className="gap-1">
                  <BadgeCheck className="h-3 w-3" /> Identitas terverifikasi
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <ShieldAlert className="h-3 w-3" /> Perlu verifikasi manual
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {item.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(item.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Akun: {item.userStatus}
                {item.userDeleted ? " · diarsipkan" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              {open ? "Tutup" : "Detail"}
            </Button>
            {!isPending && (
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Identitas terkirim */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-muted px-2 py-1">
            Kecocokan: <strong>{item.matchScore}%</strong>
          </span>
          {item.matchedFields.map((f) => (
            <span
              key={`m-${f}`}
              className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700"
            >
              ✓ {identityFieldLabel(f)}
            </span>
          ))}
          {item.mismatchFields.map((f) => (
            <span key={`x-${f}`} className="rounded-md bg-red-50 px-2 py-1 text-red-700">
              ✗ {identityFieldLabel(f)}
            </span>
          ))}
        </div>

        {open && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {identityRows.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {identityRows.map((r) => (
                  <div key={r.label}>
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-medium">{r.value}</p>
                  </div>
                ))}
              </div>
            )}

            {item.note && (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Catatan pengguna</p>
                <p className="text-sm">{item.note}</p>
              </div>
            )}

            {item.status !== "PENDING" && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>
                  Diproses oleh <strong>{item.handledByName ?? "Admin"}</strong>
                  {item.handledAt ? ` · ${formatDate(item.handledAt)}` : ""}
                </p>
                {item.rejectReason && (
                  <p className="mt-1 text-xs text-red-600">Alasan: {item.rejectReason}</p>
                )}
              </div>
            )}

            {isPending && (
              <>
                {!item.verified && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                    Identitas belum terverifikasi otomatis. Cocokkan data pengguna di{" "}
                    <strong>Kelola Pengguna</strong> sebelum mengatur password. Tombol simpan akan
                    ditolak sistem bila identitas belum valid.
                  </div>
                )}

                <form onSubmit={handleReset} className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`pw-${item.id}`}>Password Baru</Label>
                    <PasswordInput
                      id={`pw-${item.id}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 karakter, huruf & angka"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`cpw-${item.id}`}>Konfirmasi Password Baru</Label>
                    <PasswordInput
                      id={`cpw-${item.id}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <Button type="submit" disabled={pending || !item.verified}>
                      {pending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" /> Simpan Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <ShieldX className="h-4 w-4" /> Tolak pengajuan
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Alasan penolakan (opsional)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReject}
                      disabled={pending}
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
