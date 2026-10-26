import { prisma } from "@/lib/prisma";
import { SchoolMarquee } from "@/components/public/school-marquee-client";
import { Reveal } from "@/components/public/animations/reveal";

/**
 * Bagian "Sekolah yang Bergabung dengan EDULALIN".
 * Data sekolah + logo diambil langsung dari Neon DB (bukan dummy):
 * hanya sekolah AKTIF (status ACTIVE, belum dihapus).
 * Perubahan logo / penambahan sekolah oleh Admin atau Guru otomatis tampil
 * karena halaman ini selalu mengambil data terkini saat di-render.
 */
export async function SchoolMarqueeSection() {
  const schools = await prisma.school.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      logoUrl: true,
      logoEmbedded: true,
      educationLevel: true,
      city: true,
      address: true,
    },
    take: 200,
  });

  if (schools.length === 0) return null;

  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white py-14">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
            🏫 Sekolah yang Bergabung
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 md:text-4xl">
            Sekolah yang Bergabung dengan EDULALIN
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {schools.length} sekolah terdaftar aktif mengikuti program edukasi
            lalu lintas EDULALIN. Arahkan kursor untuk menjeda animasi.
          </p>
        </Reveal>
      </div>

      <div className="mt-10">
        <SchoolMarquee schools={schools} />
      </div>
    </section>
  );
}
