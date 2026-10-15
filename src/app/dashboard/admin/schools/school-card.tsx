"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Trash2, RotateCcw, AlertTriangle, X, Loader2 } from "lucide-react";
import { levelDisplayLabel } from "@/lib/constants";

type SchoolRow = {
  id: string;
  code: string;
  name: string;
  educationLevel: "SD" | "SMP" | "SMA" | "SIM";
  city: string;
  status: "ACTIVE" | "INACTIVE";
};

type DeleteAction = (id: string) => Promise<{ ok?: boolean; error?: string } | void>;

/** Modal konfirmasi hapus sekolah dengan peringatan dampak ke akun Guru/Murid. */
function DeleteSchoolModal({
  school,
  guru,
  murid,
  action,
  onClose,
}: {
  school: SchoolRow;
  guru: number;
  murid: number;
  action: DeleteAction;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const res = await action(school.id);
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: "Sekolah dihapus", description: "Akses Guru & Murid terkait telah dinonaktifkan.", variant: "success" });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={pending ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Konfirmasi hapus sekolah">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground disabled:opacity-40"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold">Hapus Sekolah Ini?</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Anda akan menghapus <strong className="text-foreground">{school.name}</strong>. Sekolah
          tidak akan lagi muncul dalam daftar sekolah aktif.
        </p>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">⚠️ Dampak penghapusan:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              {guru} akun <strong>Guru</strong> dan {murid} akun <strong>Murid</strong> yang
              terhubung akan otomatis <strong>dinonaktifkan</strong>.
            </li>
            <li>Akun tersebut tidak dapat login, mengakses modul, kuis, maupun dashboard.</li>
            <li>Sesi yang sedang berlangsung akan diakhiri.</li>
            <li>
              Data & riwayat tetap aman (soft delete) dan dapat dipulihkan Admin melalui menu
              Sekolah Terhapus.
            </li>
          </ul>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="button" variant="default" className="bg-red-600 hover:bg-red-700" onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {pending ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Card sekolah aktif di halaman Kelola Sekolah. */
export function SchoolCard({
  school,
  guru,
  murid,
  action,
}: {
  school: SchoolRow;
  guru: number;
  murid: number;
  action: DeleteAction;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div className="group relative flex h-full flex-col rounded-2xl border border-border bg-white transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/dashboard/admin/schools/${school.id}`} className="min-w-0">
              <h3 className="font-semibold leading-tight text-foreground hover:text-primary">{school.name}</h3>
            </Link>
            {school.status === "ACTIVE" ? (
              <Badge variant="success">Aktif</Badge>
            ) : (
              <Badge variant="secondary">Nonaktif</Badge>
            )}
          </div>
          <Link href={`/dashboard/admin/schools/${school.id}`}>
            <p className="mt-1 text-xs text-muted-foreground">
              {levelDisplayLabel(school.educationLevel)} • NPSN {school.code} • {school.city}
            </p>
          </Link>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-center">
              <p className="text-lg font-bold text-blue-700">{guru}</p>
              <p className="text-xs text-muted-foreground">Guru</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-center">
              <p className="text-lg font-bold text-emerald-700">{murid}</p>
              <p className="text-xs text-muted-foreground">Murid</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          <Link href={`/dashboard/admin/schools/${school.id}`} className="text-xs font-medium text-primary">
            Lihat detail →
          </Link>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </Button>
        </div>
      </div>
      {confirming && (
        <DeleteSchoolModal
          school={school}
          guru={guru}
          murid={murid}
          action={action}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}

/** Baris sekolah yang sudah dihapus (soft delete) dengan tombol Pulihkan. */
export function DeletedSchoolRow({
  school,
  action,
}: {
  school: SchoolRow;
  action: DeleteAction;
}) {
  const [pending, startTransition] = useTransition();

  const restore = () => {
    startTransition(async () => {
      const res = await action(school.id);
      if (res && "error" in res && res.error) {
        toast({ title: "Gagal", description: String(res.error), variant: "error" });
      } else {
        toast({ title: "Sekolah dipulihkan", description: "Akun Guru & Murid yang sebelumnya aktif kembali dapat mengakses sistem.", variant: "success" });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-slate-50 p-4">
      <div className="min-w-0">
        <p className="font-medium">{school.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {levelDisplayLabel(school.educationLevel)} • NPSN {school.code} • {school.city}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="danger">Terhapus</Badge>
        <Button type="button" size="sm" variant="outline" className="text-emerald-600" onClick={restore} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Pulihkan
        </Button>
      </div>
    </div>
  );
}
