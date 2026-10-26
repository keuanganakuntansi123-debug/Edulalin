"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Logo sekolah dengan fallback ikon sekolah bawaan EDULALIN.
 * Menampilkan gambar jika tersedia; jika gagal dimuat, ikon default tetap tampil.
 */
export function SchoolLogo({
  logoUrl,
  embedded,
  name,
  size = "md",
  className,
}: {
  logoUrl?: string | null;
  embedded?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = embedded ?? logoUrl ?? null;
  const showImage = !!src && !failed;

  const sizes = {
    sm: "h-10 w-10 rounded-lg",
    md: "h-12 w-12 rounded-xl",
    lg: "h-16 w-16 rounded-2xl",
  } as const;
  const iconSizes = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-8 w-8" } as const;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-sm",
        sizes[size],
        className
      )}
      title={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Logo ${name}`}
          loading="lazy"
          className={embedded ? "h-full w-full object-contain p-0.5" : "h-full w-full object-cover"}
          onError={() => setFailed(true)}
        />
      ) : (
        <Building2 className={iconSizes[size]} aria-hidden="true" />
      )}
    </span>
  );
}