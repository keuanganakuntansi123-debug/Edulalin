import { prisma } from "@/lib/prisma";
import type { SiteContentKey, ContentBlockKey, ProgramStatus, ContactMessageStatus } from "@/generated/prisma/client";

export type SiteContentItem = {
  key: SiteContentKey;
  title: string;
  body: string;
};

const DEFAULTS: Record<string, SiteContentItem> = {
  HERO_TITLE: { key: "HERO_TITLE", title: "Belajar Tertib Berlalu Lintas, Mulai dari Sekarang!", body: "Belajar Tertib Berlalu Lintas, Mulai dari Sekarang!" },
  HERO_SUBTITLE: {
    key: "HERO_SUBTITLE",
    title: "EDULALIN — Edukasi Lalu Lintas",
    body: "Tingkatkan pemahaman tentang keselamatan berlalu lintas melalui materi edukatif, kuis interaktif, dan simulasi berkendara yang dikemas sesuai jenjang pendidikan.",
  },
  ABOUT_TEXT: {
    key: "ABOUT_TEXT",
    title: "Tentang EDULALIN",
    body: "EDULALIN (Edukasi Lalu Lintas) adalah platform pembelajaran keselamatan berlalu lintas untuk pelajar SD, SMP, SMA, dan calon pengendara. Kami menggabungkan materi digital, kuis interaktif, dan pemantauan berbasis data agar budaya tertib berlalu lintas tumbuh sejak dini.",
  },
  CONTACT_ADDRESS: { key: "CONTACT_ADDRESS", title: "Alamat", body: "" },
  CONTACT_EMAIL: { key: "CONTACT_EMAIL", title: "Email", body: "" },
  CONTACT_PHONE: { key: "CONTACT_PHONE", title: "Telepon", body: "" },
  CONTACT_WHATSAPP: { key: "CONTACT_WHATSAPP", title: "WhatsApp", body: "" },
  CONTACT_SOCIAL: { key: "CONTACT_SOCIAL", title: "Media Sosial", body: "" },
  FAQ: {
    key: "FAQ",
    title: "Pertanyaan yang Sering Diajukan",
    body: [
      "Siapa yang bisa mendaftar di EDULALIN?",
      "Registrasi publik tersedia untuk murid. Akun guru dan polisi dibuat oleh administrator sekolah/platform.",
      "",
      "Bagaimana aturan akses modul SIM?",
      "Modul SIM hanya terbuka untuk murid berusia minimal 17 tahun. Backend memvalidasi usia setiap kali akses.",
      "",
      "Apakah data antar sekolah terpisah?",
      "Ya. Setiap sekolah hanya melihat data dan konten miliknya sendiri (isolasi multi-tenant).",
      "",
      "Apakah EDULALIN gratis?",
      "Platform ini dirancang sebagai media edukasi keselamatan bagi sekolah dan mitra edukasi lalu lintas.",
    ].join("\n"),
  },
};

export async function getSiteContentMap(): Promise<Map<SiteContentKey, SiteContentItem>> {
  const rows = await prisma.siteContent.findMany();
  const map = new Map<SiteContentKey, SiteContentItem>();
  for (const r of rows) {
    map.set(r.key, { key: r.key, title: r.title, body: r.body });
  }
  for (const d of Object.values(DEFAULTS)) {
    if (!map.has(d.key)) map.set(d.key, d);
  }
  return map;
}

export type PublishedBlock = {
  key: ContentBlockKey;
  title: string;
  subtitle: string | null;
  body: string;
  imageUrl: string | null;
  meta: Record<string, unknown> | null;
  order: number;
};

/** Ambil blok konten yang sudah diterbitkan, gunakan draft jika belum ada yang terbit. */
export async function getPublishedBlocks(): Promise<Map<ContentBlockKey, PublishedBlock>> {
  const rows = await prisma.contentBlock.findMany({
    orderBy: { order: "asc" },
  });
  const map = new Map<ContentBlockKey, PublishedBlock>();
  for (const r of rows) {
    // Jika published=false dan ada draft, pakai draft sebagai versi yang tampil (mis. mode "terbit otomatis saat simpan draft").
    // Namun sesuai ketentuan: hanya konten terbit yang tampil ke pengunjung.
    const published = r.published
      ? {
          key: r.key,
          title: r.title,
          subtitle: r.subtitle,
          body: r.body,
          imageUrl: r.imageUrl,
          meta: (r.meta as Record<string, unknown> | null) ?? null,
          order: r.order,
        }
      : null;
    if (published) map.set(r.key, published);
  }
  return map;
}

export async function getSiteStats() {
  const [schools, murids, modules, quizzes] = await Promise.all([
    prisma.school.count(),
    prisma.user.count({ where: { role: "MURID", deletedAt: null } }),
    prisma.module.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.quiz.count({ where: { deletedAt: null } }),
  ]);
  return { schools, murids, modules, quizzes };
}

export type { SiteContentKey, ContentBlockKey, ProgramStatus, ContactMessageStatus };

export { DEFAULTS };