import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel, categoryOf } from "@/lib/constants";
import { ModuleCatalog } from "./module-catalog";
import { PageHero } from "@/components/public/page-hero";
import { fileUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Modul | EDULALIN | Edukasi Lalu Lintas",
  description: "Jelajahi modul edukasi lalu lintas sesuai jenjang pendidikan di EDULALIN.",
};
export const instant = false;

const CATEGORIES = [
  { value: "SD", label: "Modul SD", emoji: "🧒" },
  { value: "SMP", label: "Modul SMP", emoji: "🧑" },
  { value: "SMA", label: "Modul SMA", emoji: "🧑‍🎓" },
  { value: "SMK", label: "Modul SMK", emoji: "👷" },
];

export default async function ModulPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string }>;
}) {
  const { q, kategori } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const activeCategory = kategori ?? "";

  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [
        // Modul global tampil untuk semua
        { schoolId: null, moduleToSchools: { none: {} } },
        // Modul yang ditargetkan ke sekolah aktif (tidak terhapus)
        {
          moduleToSchools: {
            some: { school: { status: "ACTIVE", deletedAt: null } },
          },
        },
        // Modul milik satu sekolah aktif
        {
          school: { is: { status: "ACTIVE", deletedAt: null } },
        },
      ],
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      educationLevel: true,
      classLevel: true,
      moduleType: true,
      thumbnailUrl: true,
      thumbnailFile: { select: { storedName: true } },
      contentFile: { select: { originalName: true, mimeType: true } },
      durationMin: true,
    },
  });

  const filtered = modules.filter((m) => {
    const matchCategory = !activeCategory || categoryOf(m.educationLevel) === activeCategory;
    const matchQuery =
      !query ||
      m.title.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      levelDisplayLabel(m.educationLevel).toLowerCase().includes(query);
    return matchCategory && matchQuery;
  });

  // thumbnailUrl dari relasi file atau field
  const displayModules = filtered.map((m) => ({
    ...m,
    displayThumbnail:
      m.thumbnailFile?.storedName
        ? fileUrl(m.thumbnailFile.storedName)
        : m.thumbnailUrl ?? null,
  }));

  const counts = CATEGORIES.map((c) => ({
    ...c,
    count: modules.filter((m) => categoryOf(m.educationLevel) === c.value).length,
  }));

  return (
    <div className="overflow-x-hidden">
      <PageHero
        badge="Pusat Materi"
        badgeEmoji="📚"
        title="Jelajahi Modul Edukasi Lalu Lintas"
        description="Pelajari berbagai materi keselamatan lalu lintas sesuai jenjang pendidikan melalui modul digital yang informatif dan mudah diakses."
      />

      <section className="bg-slate-50 py-12 md:py-16">
        <div className="container-page">
          {/* Kategori */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {counts.map((c) => (
              <a
                key={c.value}
                href={`/modul?kategori=${c.value}`}
                className={`rounded-2xl border p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                  activeCategory === c.value
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white hover:border-primary/50"
                }`}
              >
                <span className="text-3xl">{c.emoji}</span>
                <p className={`mt-2 font-semibold ${activeCategory === c.value ? "text-white" : "text-foreground"}`}>{c.label}</p>
                <p className={`mt-0.5 text-xs ${activeCategory === c.value ? "text-blue-100" : "text-muted-foreground"}`}>
                  {c.count} modul
                </p>
              </a>
            ))}
          </div>

          {/* Pencarian + daftar */}
          <ModuleCatalog modules={displayModules} initialQuery={query} initialCategory={activeCategory} />
        </div>
      </section>
    </div>
  );
}