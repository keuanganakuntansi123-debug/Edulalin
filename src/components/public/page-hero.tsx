import type { ReactNode } from "react";

/**
 * Hero konsisten untuk halaman publik selain Beranda (Program, Modul, Tentang,
 * Kontak, FAQ, dll). Menampilkan badge, judul besar, deskripsi, dan ornamen
 * rambu lalu lintas dekoratif.
 */
export function PageHero({
  badge,
  badgeEmoji,
  title,
  description,
  children,
}: {
  badge: string;
  badgeEmoji?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 text-white">
      {/* Ornamen dekoratif */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 20%, white 0, transparent 30%), radial-gradient(circle at 85% 25%, white 0, transparent 28%), radial-gradient(circle at 70% 85%, white 0, transparent 32%)",
        }}
        aria-hidden="true"
      />
      {/* Rambu dekoratif */}
      <svg
        viewBox="0 0 120 120"
        className="pointer-events-none absolute -right-8 -top-10 hidden h-44 w-44 opacity-15 lg:block"
        aria-hidden="true"
      >
        <path d="M60 6l50 18v30c0 28-20 46-50 58C30 100 10 82 10 54V24l50-18z" fill="none" stroke="white" strokeWidth="3" />
        <path d="M28 44h64M28 54h64" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
        <rect x="50" y="62" width="20" height="22" rx="3" fill="white" />
      </svg>
      <svg
        viewBox="0 0 120 120"
        className="pointer-events-none absolute -left-10 bottom-0 hidden h-40 w-40 opacity-10 lg:block"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="42" fill="none" stroke="white" strokeWidth="4" />
        <circle cx="60" cy="60" r="14" fill="white" />
        <path d="M60 18v14M60 88v14M18 60h14M88 60h14" stroke="white" strokeWidth="6" strokeLinecap="round" />
      </svg>

      <div className="container-page relative py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
          <span aria-hidden="true">{badgeEmoji ?? "🚦"}</span>
          {badge}
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-blue-50">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
