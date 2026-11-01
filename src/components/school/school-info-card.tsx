import { MapPin, School as SchoolIcon, Users, BookOpen } from "lucide-react";
import { SchoolLogo } from "@/components/school/school-logo";

export type ReadOnlySchoolInfo = {
  name: string;
  educationLevel: string;
  address: string;
  city: string;
  province: string;
  logoUrl: string | null;
  logoEmbedded: string | null;
  studentCount?: number;
  moduleCount?: number;
};

/**
 * "Sekolah Anda" untuk MURID: hanya baca (read-only).
 * Murid tidak memiliki aksi ubah data maupun logo sekolah.
 */
export function SchoolInfoCard({ school }: { school: ReadOnlySchoolInfo }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <SchoolLogo
          logoUrl={school.logoUrl}
          embedded={school.logoEmbedded}
          name={school.name}
          size="lg"
        />
        <div className="min-w-0 flex-1">
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

      {school.studentCount != null || school.moduleCount != null ? (
        <dl className="mt-4 flex flex-wrap gap-4 rounded-xl bg-slate-50 p-3 text-sm">
          {school.studentCount != null ? (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Murid</dt>
              <dd className="font-semibold">{school.studentCount}</dd>
            </div>
          ) : null}
          {school.moduleCount != null ? (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Modul</dt>
              <dd className="font-semibold">{school.moduleCount}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}
