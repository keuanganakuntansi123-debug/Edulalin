"use client";

import { useRef } from "react";
import { MapPin } from "lucide-react";
import { SchoolLogo } from "@/components/school/school-logo";
import { LEVEL_LABEL } from "@/lib/constants";

type SchoolItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  logoEmbedded: string | null;
  educationLevel: string;
  city: string | null;
  address: string | null;
};

/**
 * Marquee horizontal infinite untuk logo & nama sekolah.
 * - Animasi CSS berjalan terus-menerus (konten digandakan untuk loop mulus).
 * - Hover menjeda animasi agar pengunjung bisa melihat dengan jelas.
 * - Responsif & mengurangi gerak untuk pengguna prefers-reduced-motion.
 */
export function SchoolMarquee({ schools }: { schools: SchoolItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const items = [...schools, ...schools];

  return (
    <div
      className="group relative"
      onMouseEnter={() => trackRef.current?.style.setProperty("animation-play-state", "paused")}
      onMouseLeave={() => trackRef.current?.style.removeProperty("animation-play-state")}
      onFocusCapture={() => trackRef.current?.style.setProperty("animation-play-state", "paused")}
      onBlurCapture={() => trackRef.current?.style.removeProperty("animation-play-state")}
    >
      {/* Gradient tepi */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-white to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-white to-transparent sm:w-28" />

      <div className="overflow-hidden py-2">
        <div
          ref={trackRef}
          className="ed-marquee-track flex w-max items-stretch gap-5 px-5"
          aria-label="Daftar sekolah yang bergabung dengan EDULALIN"
        >
          {items.map((school, i) => (
            <div
              key={`${school.id}-${i}`}
              className="flex w-56 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:w-64"
            >
              <SchoolLogo
                logoUrl={school.logoUrl}
                embedded={school.logoEmbedded}
                name={school.name}
                size="lg"
                className="h-20 w-20 rounded-2xl"
              />
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold text-slate-800" title={school.name}>
                  {school.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {LEVEL_LABEL[school.educationLevel as keyof typeof LEVEL_LABEL] ?? school.educationLevel}
                  {school.city ? ` • ${school.city}` : ""}
                </p>
                {school.address ? (
                  <p
                    className="mt-1 flex items-center justify-center gap-1 text-[11px] leading-snug text-slate-400"
                    title={school.address}
                  >
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="line-clamp-1">{school.address}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
