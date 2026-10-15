"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar dengan fallback otomatis: jika gambar gagal dimuat
 * (file hilang dari storage), tampilkan inisial nama pengguna.
 * Menghilangkan error 404 di console saat file avatar terhapus.
 */
export function UserAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src as string}
        alt={name}
        className={cn("rounded-full object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-xs font-bold text-white",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}