"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X, Loader2, MapPin, School as SchoolIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { SchoolLogo } from "@/components/school/school-logo";
import { SchoolLogoManager } from "@/components/school/school-logo-manager";
import { updateOwnSchool } from "@/app/actions/guru-school-actions";

export type OwnSchoolInfo = {
  id: string;
  code: string;
  name: string;
  educationLevel: string;
  address: string;
  city: string;
  province: string;
  logoUrl: string | null;
  logoEmbedded: string | null;
  studentCount: number;
  moduleCount: number;
  teacherCount: number;
};

/**
 * "Sekolah Anda" untuk GURU: menampilkan identitas sekolah lengkap
 * (nama, jenjang, alamat, kota, provinsi, logo) dan mengizinkan guru
 * memperbarui data serta mengganti/menghapus logo sekolahnya sendiri.
 * Hanya sekolah milik guru yang dapat diubah (dijaga juga di server action).
 */
export function OwnSchoolCard({ school }: { school: OwnSchoolInfo }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState({
    name: school.name,
    address: school.address,
    city: school.city,
    province: school.province,
  });

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await updateOwnSchool(formData);
      if (res?.error) {
        toast({ title: "Gagal menyimpan", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "Data sekolah diperbarui", variant: "success" });
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-4">
          <SchoolLogo
            logoUrl={school.logoUrl}
            embedded={school.logoEmbedded}
            name={school.name}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sekolah Anda
            </p>
            <h2 className="wrap-break-word text-lg font-bold">{school.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <SchoolIcon className="h-3 w-3" /> Jenjang {school.educationLevel}
            </p>
            <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="wrap-break-word">
                {school.address}
                {school.city ? `, ${school.city}` : ""}
                {school.province ? `, ${school.province}` : ""}
              </span>
            </p>
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit sekolah
          </Button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
        <div>
          <dt className="text-xs text-muted-foreground">Murid</dt>
          <dd className="text-base font-bold">{school.studentCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Guru</dt>
          <dd className="text-base font-bold">{school.teacherCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Modul</dt>
          <dd className="text-base font-bold">{school.moduleCount}</dd>
        </div>
      </dl>

      {editing ? (
        <form action={submit} className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="school-name">Nama Sekolah</Label>
            <Input
              id="school-name"
              name="name"
              required
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Prefiks wajib sesuai jenjang (mis. SMKN 15 JAKARTA). Jenjang hanya dapat diubah Admin.
            </p>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="school-address">Alamat</Label>
            <Input
              id="school-address"
              name="address"
              required
              value={values.address}
              onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="school-city">Kota</Label>
            <Input
              id="school-city"
              name="city"
              required
              value={values.city}
              onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="school-province">Provinsi</Label>
            <Input
              id="school-province"
              name="province"
              required
              value={values.province}
              onChange={(e) => setValues((v) => ({ ...v, province: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Simpan
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setValues({
                  name: school.name,
                  address: school.address,
                  city: school.city,
                  province: school.province,
                });
                setEditing(false);
              }}
            >
              <X className="mr-1.5 h-4 w-4" /> Batal
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 border-t border-border pt-5">
        <p className="mb-2 text-sm font-semibold">Logo Sekolah</p>
        <SchoolLogoManager
          schoolId={school.id}
          schoolName={school.name}
          logoUrl={school.logoUrl}
          logoEmbedded={school.logoEmbedded}
        />
      </div>
    </section>
  );
}
