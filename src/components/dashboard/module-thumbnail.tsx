import { fileUrl } from "@/lib/file-url";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sampul modul yang mendukung gambar (JPG/PNG/WebP) maupun PDF.
 *
 * - Gambar ditampilkan sebagai <img> (object-cover).
 * - PDF ditampilkan sebagai pratinjau halaman pertama via <iframe> sehingga
 *   thumbnail PDF tetap terlihat, lengkap dengan preview.
 * - Bila tidak ada berkas, tampil ikon fallback netral.
 *
 * Komponen ini murni presentasional (tanpa hook) sehingga aman dipakai di
 * Server Component maupun Client Component.
 */
export function ModuleThumbnail({
  storedName,
  mimeType,
  url,
  title,
  className,
  imgClassName,
  fallbackIconClassName,
  fallback,
}: {
  storedName?: string | null;
  mimeType?: string | null;
  /** URL langsung (opsional) — dipakai bila tak ada UploadedFile. */
  url?: string | null;
  title: string;
  /** Kelas untuk wrapper penuh (mis. aspect-video, rounded, bg). */
  className?: string;
  /** Kelas tambahan untuk elemen gambar. */
  imgClassName?: string;
  fallbackIconClassName?: string;
  /** Simpul kustom pengganti ikon fallback. */
  fallback?: React.ReactNode;
}) {
  const src = url ?? (storedName ? fileUrl(storedName) : null);
  const isPdf =
    mimeType === "application/pdf" ||
    (typeof src === "string" && src.toLowerCase().split("?")[0].endsWith(".pdf")) ||
    (typeof storedName === "string" && storedName.toLowerCase().endsWith(".pdf"));

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5",
          className
        )}
      >
        {fallback ?? <BookOpen className={cn("h-10 w-10 text-primary/40", fallbackIconClassName)} />}
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className={cn("relative overflow-hidden bg-slate-100", className)}>
        <iframe
          src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title={`Pratinjau ${title}`}
          className="pointer-events-none h-full w-full border-0 bg-white"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className={cn("h-full w-full object-cover", imgClassName, className)}
    />
  );
}
