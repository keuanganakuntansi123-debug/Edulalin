import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/public/animations/reveal";
import { GraduationCap, Shield, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Logo resmi mitra kolaborasi yang disimpan di folder /public.
 * Digunakan sebagai fallback ketika Admin belum mengunggah logo kustom
 * pada menu Kelola Konten Website > Kolaborasi Edukasi.
 */
const LOGO_BY_ROLE: Record<string, string> = {
  SCHOOL: "/logo-kemendikbud.svg",
  POLRI: "/logo-polri.svg",
  JASA_RAHARJA: "/logo-jasa-raharja.svg",
};

/**
 * Bagian "Kolaborasi Edukasi" — menampilkan mitra kolaborasi (Sekolah,
 * Kepolisian/POLRI, Jasa Raharja, dan lainnya) yang dikelola Admin melalui
 * Kelola Konten Website. Jika belum ada data partner, tampilkan default
 * peran yang jelas tanpa mengklaim kerja sama resmi yang belum terkonfirmasi.
 */
export async function CollaborationSection({
  title = "Kolaborasi Edukasi",
  subtitle = "EDULALIN mendukung kolaborasi antara sekolah, Kepolisian, dan Jasa Raharja dalam mewujudkan edukasi keselamatan berlalu lintas. Informasi kerja sama resmi ditampilkan sesuai data yang dikelola Admin.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const partners = await prisma.collaborationPartner.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    take: 6,
  });

  const DEFAULT_ROLES = [
    {
      role: "SCHOOL",
      name: "Sekolah",
      desc: "Sekolah menjadi tempat utama pembelajaran. Guru memandu murid mengenal aturan lalu lintas melalui modul dan kuis EDULALIN.",
      Icon: GraduationCap,
      iconClass: "from-emerald-500 to-teal-600",
      logo: LOGO_BY_ROLE.SCHOOL,
    },
    {
      role: "POLRI",
      name: "Kepolisian (POLRI)",
      desc: "Kepolisian berperan dalam edukasi serta pemantauan keselamatan berlalu lintas di lingkungan sekolah.",
      Icon: Shield,
      iconClass: "from-blue-600 to-indigo-700",
      logo: LOGO_BY_ROLE.POLRI,
    },
    {
      role: "JASA_RAHARJA",
      name: "Jasa Raharja",
      desc: "Jasa Raharja mendukung edukasi keselamatan berlalu lintas untuk menumbuhkan budaya tertib sejak dini.",
      Icon: HeartHandshake,
      iconClass: "from-amber-500 to-orange-600",
      logo: LOGO_BY_ROLE.JASA_RAHARJA,
    },
  ] as const;

  const roleLabel: Record<string, string> = {
    SCHOOL: "Sekolah",
    POLRI: "Kepolisian",
    JASA_RAHARJA: "Jasa Raharja",
    OTHER: "Mitra",
  };

  const iconByRole: Record<string, { Icon: typeof GraduationCap; iconClass: string; logo: string }> = {
    SCHOOL: { Icon: GraduationCap, iconClass: "from-emerald-500 to-teal-600", logo: LOGO_BY_ROLE.SCHOOL },
    POLRI: { Icon: Shield, iconClass: "from-blue-600 to-indigo-700", logo: LOGO_BY_ROLE.POLRI },
    JASA_RAHARJA: { Icon: HeartHandshake, iconClass: "from-amber-500 to-orange-600", logo: LOGO_BY_ROLE.JASA_RAHARJA },
    OTHER: { Icon: HeartHandshake, iconClass: "from-sky-500 to-blue-600", logo: "" },
  };

  const items =
    partners.length > 0
      ? partners.map((p) => {
          const fallback = iconByRole[p.role] ?? iconByRole.OTHER;
          return {
            id: p.id,
            name: p.name,
            roleLabel: p.roleLabel ?? roleLabel[p.role] ?? "Mitra",
            description: p.description ?? "",
            logoUrl: p.logoUrl ?? iconByRole[p.role]?.logo ?? null,
            Icon: fallback.Icon,
            iconClass: fallback.iconClass,
          };
        })
      : DEFAULT_ROLES.map((r) => ({
          id: r.role,
          name: r.name,
          roleLabel: roleLabel[r.role],
          description: r.desc,
          logoUrl: r.logo,
          Icon: r.Icon,
          iconClass: r.iconClass,
        }));

  return (
    <section className="overflow-hidden bg-linear-to-br from-slate-50 via-white to-blue-50 py-20">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
            🤝 Kolaborasi Edukasi
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 md:text-4xl">{title}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = item.Icon;
            return (
              <Reveal key={item.id} delay={i * 90}>
                <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">
                  <div className="flex items-center gap-4">
                    {item.logoUrl ? (
                      <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.logoUrl}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-105",
                          item.iconClass
                        )}
                      >
                        <Icon className="h-8 w-8" />
                      </span>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.roleLabel}
                      </p>
                      <h3 className="text-lg font-bold leading-tight text-slate-900">{item.name}</h3>
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={200} className="mt-8 text-center">
          <p className="mx-auto max-w-2xl text-xs text-muted-foreground">
            * Logo dan informasi mitra dikelola oleh Admin melalui menu Kelola Konten Website.
            Peran kolaborasi bersifat edukatif; kemitraan resmi ditampilkan sesuai data yang tersedia.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
