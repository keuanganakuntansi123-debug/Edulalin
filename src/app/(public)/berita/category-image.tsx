import { NEWS_CATEGORY_META } from "./news-constants";

/**
 * Ilustrasi kategori jenjang (SD/SMP/SMA/SMK/SIM).
 * Menggunakan berkas SVG modern di /public dan fallback label bila gagal dimuat.
 */
export function CategoryImage({
  value,
  className,
  size = 44,
}: {
  value: string;
  className?: string;
  size?: number;
}) {
  const meta = NEWS_CATEGORY_META[value] ?? NEWS_CATEGORY_META.SD;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={meta.icon}
      alt={`Kategori ${meta.label}`}
      width={size}
      height={size}
      loading="lazy"
      className={className}
    />
  );
}
