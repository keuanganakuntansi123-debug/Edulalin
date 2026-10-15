import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import type { ContentBlockKey } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "keuanganakuntansi123@gmail.com";
const ADMIN_PASSWORD = "keuanganjr";

async function main() {
  console.log("🌱 Seeding EDULALIN...");

  // Hapus data demo (urut relasi), pertahankan Admin utama
  await prisma.quizAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.module.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.uploadedFile.deleteMany();
  // Konten CMS
  await prisma.contentBlock.deleteMany();
  await prisma.siteFeature.deleteMany();
  await prisma.missionItem.deleteMany();
  await prisma.goalItem.deleteMany();
  await prisma.programModule.deleteMany();
  await prisma.program.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.collaborationPartner.deleteMany();
  await prisma.user.deleteMany({ where: { role: { in: ["GURU", "MURID", "POLISI"] } } });
  await prisma.school.deleteMany();

  // ===== Admin utama =====
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  let admin = existingAdmin;
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "Administrator",
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        role: "ADMIN",
        status: "ACTIVE",
        verifiedAt: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        status: "ACTIVE",
        deletedAt: null,
      },
    });
  }

  // ===== Konten CMS default =====
  const blocks: {
    key: ContentBlockKey;
    title: string;
    subtitle?: string;
    body: string;
    meta?: Prisma.InputJsonValue;
    order: number;
  }[] = [
    {
      key: "HERO_ANIMATION",
      title: "Animasi Hero",
      body: "bicycle",
      meta: { animation: "bicycle" },
      order: 0,
    },
    {
      key: "INTRO",
      title: "Apa Itu EDULALIN?",
      body: "EDULALIN (Edukasi Lalu Lintas) hadir sebagai media pembelajaran digital untuk meningkatkan pengetahuan dan kesadaran pelajar terhadap pentingnya keselamatan berlalu lintas. Melalui materi edukatif, modul interaktif, dan evaluasi pembelajaran, EDULALIN mendukung proses belajar yang mudah, menarik, dan terukur.",
      order: 1,
    },
    {
      key: "STATS_SETTINGS",
      title: "Statistik Platform",
      body: "schools,murids,modules,quizzes",
      meta: { enabled: ["schools", "murids", "modules", "quizzes"] },
      order: 2,
    },
    {
      key: "CTA",
      title: "Yuk, Jadi Generasi yang Peduli Keselamatan Berlalu Lintas!",
      subtitle: "Mulai perjalanan belajarmu bersama EDULALIN dan tingkatkan pemahaman tentang keselamatan di jalan.",
      body: "Mulai Belajar Sekarang",
      order: 3,
    },
    {
      key: "ABOUT_PROFILE",
      title: "Mengenal EDULALIN",
      body: "EDULALIN (Edukasi Lalu Lintas) merupakan platform pembelajaran digital yang berfokus pada peningkatan literasi keselamatan berlalu lintas bagi pelajar. Platform ini menyediakan akses terhadap materi edukasi, modul digital, kuis interaktif, dan pemantauan hasil pembelajaran untuk mendukung pembentukan perilaku tertib berlalu lintas sejak usia sekolah.",
      order: 4,
    },
    {
      key: "ABOUT_VISION",
      title: "Visi",
      body: "Mendorong terwujudnya generasi muda yang memahami, menghargai, dan menerapkan prinsip keselamatan berlalu lintas dalam kehidupan sehari-hari.",
      order: 5,
    },
    {
      key: "ABOUT_MISSION",
      title: "Misi",
      body: "Menyediakan materi edukasi keselamatan lalu lintas yang mudah dipahami.\nMeningkatkan kesadaran pelajar terhadap pentingnya keselamatan di jalan.\nMemanfaatkan teknologi digital untuk mendukung pembelajaran interaktif.\nMemfasilitasi evaluasi dan pemantauan perkembangan pembelajaran.\nMendukung keterlibatan sekolah dan kepolisian dalam edukasi keselamatan lalu lintas.",
      order: 6,
    },
    {
      key: "ABOUT_GOALS",
      title: "Tujuan EDULALIN",
      body: "Meningkatkan pengetahuan tentang peraturan lalu lintas.\nMembentuk kebiasaan tertib dan aman di jalan.\nMemberikan akses pembelajaran digital.\nMembantu guru mengevaluasi pemahaman murid.\nMendukung pemantauan kegiatan edukasi lalu lintas.",
      order: 7,
    },
    {
      key: "ABOUT_PARTNERS",
      title: "Kolaborasi Edukasi",
      body: "EDULALIN melibatkan sekolah, guru, murid, dan kepolisian dalam ekosistem pembelajaran keselamatan berlalu lintas. Informasi kerja sama resmi dengan lembaga lain ditampilkan setelah Admin memasukkan data kerja sama yang telah memperoleh izin.",
      order: 8,
    },
  ];

  for (const b of blocks) {
    await prisma.contentBlock.upsert({
      where: { key: b.key as never },
      update: { ...b, published: true, publishedAt: new Date() },
      create: { ...b, published: true, publishedAt: new Date() },
    });
  }

  await prisma.siteFeature.createMany({
    data: [
      { title: "Materi Edukatif", description: "Pelajari keselamatan lalu lintas melalui materi digital yang mudah dipahami.", emoji: "📚", order: 0 },
      { title: "Kuis Interaktif", description: "Uji pemahaman melalui soal dan evaluasi pembelajaran dengan hasil otomatis.", emoji: "✏️", order: 1 },
      { title: "Pembelajaran Sesuai Jenjang", description: "Akses materi yang sesuai dengan tingkat pendidikan dan kebutuhan pelajar.", emoji: "🎓", order: 2 },
      { title: "Pemantauan Pembelajaran", description: "Guru dapat memantau perkembangan dan hasil belajar murid secara terstruktur.", emoji: "📈", order: 3 },
    ],
  });

  await prisma.missionItem.createMany({
    data: [
      { text: "Menyediakan materi edukasi keselamatan lalu lintas yang mudah dipahami.", order: 0 },
      { text: "Meningkatkan kesadaran pelajar terhadap pentingnya keselamatan di jalan.", order: 1 },
      { text: "Memanfaatkan teknologi digital untuk mendukung pembelajaran interaktif.", order: 2 },
      { text: "Memfasilitasi evaluasi dan pemantauan perkembangan pembelajaran.", order: 3 },
      { text: "Mendukung keterlibatan sekolah dan kepolisian dalam edukasi keselamatan lalu lintas.", order: 4 },
    ],
  });

  await prisma.goalItem.createMany({
    data: [
      { text: "Meningkatkan pengetahuan tentang peraturan lalu lintas.", order: 0 },
      { text: "Membentuk kebiasaan tertib dan aman di jalan.", order: 1 },
      { text: "Memberikan akses pembelajaran digital.", order: 2 },
      { text: "Membantu guru mengevaluasi pemahaman murid.", order: 3 },
      { text: "Mendukung pemantauan kegiatan edukasi lalu lintas.", order: 4 },
    ],
  });

  await prisma.faq.createMany({
    data: [
      { question: "Apa itu EDULALIN?", answer: "EDULALIN merupakan platform edukasi lalu lintas berbasis digital yang menyediakan materi pembelajaran dan kuis interaktif bagi pelajar.", order: 0 },
      { question: "Siapa yang dapat menggunakan EDULALIN?", answer: "EDULALIN menyediakan layanan pembelajaran untuk murid serta fitur pemantauan bagi guru, Admin, dan kepolisian sesuai hak akses masing-masing.", order: 1 },
      { question: "Bagaimana cara mengakses materi pembelajaran?", answer: "Murid dapat login menggunakan akun yang terdaftar dan membuka modul yang tersedia sesuai sekolah serta jenjang pendidikannya.", order: 2 },
      { question: "Apakah EDULALIN menyediakan kuis?", answer: "Ya. EDULALIN menyediakan kuis interaktif untuk membantu mengukur pemahaman murid terhadap materi pembelajaran.", order: 3 },
      { question: "Apakah nilai kuis langsung muncul?", answer: "Ya. Setelah murid menyelesaikan dan mengirimkan jawaban, sistem menghitung nilai secara otomatis.", order: 4 },
      { question: "Apakah guru dapat melihat hasil belajar murid?", answer: "Ya. Guru dapat memantau hasil kuis dan perkembangan pembelajaran murid dari sekolah yang menjadi tanggung jawabnya.", order: 5 },
      { question: "Apakah semua murid dapat mengakses modul SIM?", answer: "Tidak. Modul SIM hanya tersedia bagi murid yang telah berusia minimal 17 tahun dan memenuhi ketentuan akses lainnya.", order: 6 },
      { question: "Bagaimana jika mengalami kendala saat menggunakan EDULALIN?", answer: "Pengguna dapat menghubungi pengelola melalui halaman Kontak.", order: 7 },
    ],
  });

  await prisma.program.createMany({
    data: [
      {
        title: "Pengenalan Keselamatan Lalu Lintas",
        slug: "pengenalan-keselamatan-lalu-lintas",
        description: "Mengenalkan aturan dasar berlalu lintas, rambu, marka jalan, dan perilaku aman di lingkungan jalan raya.",
        target: "Murid SD dan SMP",
        objectives: "Memahami rambu lalu lintas dan marka jalan.\nMenerapkan perilaku aman di jalan raya.",
        content: "Program ini memberikan pengenalan dasar tentang aturan berlalu lintas, arti rambu dan marka jalan, serta perilaku aman yang harus diterapkan pejalan kaki dan pesepeda di lingkungan jalan raya.",
        order: 0,
      },
      {
        title: "Edukasi Keselamatan untuk Pelajar",
        slug: "edukasi-keselamatan-untuk-pelajar",
        description: "Membantu pelajar memahami keselamatan saat berjalan kaki, bersepeda, menggunakan transportasi umum, maupun menjadi penumpang kendaraan.",
        target: "Murid SD, SMP, dan SMA/SMK",
        objectives: "Memahami keselamatan saat berjalan kaki dan bersepeda.\nMengetahui tata cara aman menggunakan transportasi umum.",
        content: "Program ini membekali pelajar dengan pengetahuan keselamatan saat beraktivitas di jalan, baik sebagai pejalan kaki, pesepeda, penumpang kendaraan, maupun pengguna transportasi umum.",
        order: 1,
      },
      {
        title: "Edukasi Berkendara Aman",
        slug: "edukasi-berkendara-aman",
        description: "Memberikan pemahaman mengenai penggunaan helm, perlengkapan keselamatan, kepatuhan terhadap aturan jalan, serta risiko pelanggaran lalu lintas.",
        target: "Murid SMA/SMK",
        objectives: "Memahami pentingnya helm dan perlengkapan keselamatan.\nMematuhi aturan jalan dan menghindari pelanggaran lalu lintas.",
        content: "Program ini berfokus pada keselamatan berkendara, mencakup penggunaan helm yang benar, perlengkapan keselamatan, kepatuhan pada rambu, serta risiko yang ditimbulkan oleh pelanggaran lalu lintas.",
        order: 2,
      },
      {
        title: "Edukasi Persiapan SIM",
        slug: "edukasi-persiapan-sim",
        description: "Memberikan pengenalan aturan berkendara dan pengetahuan dasar yang relevan dengan persiapan memperoleh SIM.",
        target: "Murid usia minimal 17 tahun",
        objectives: "Mengenal persyaratan dan aturan memperoleh SIM.\nMemahami pengetahuan dasar berkendara yang diujikan.",
        content: "Program ini dirancang untuk murid yang telah berusia minimal 17 tahun sebagai bekal pengetahuan dasar menghadapi ujian dan persiapan memperoleh Surat Izin Mengemudi (SIM). Materi khusus SIM hanya dapat diakses oleh murid yang memenuhi ketentuan usia.",
        order: 3,
      },
    ],
  });

  await prisma.collaborationPartner.createMany({
    data: [
      {
        name: "Sekolah",
        slug: "sekolah",
        role: "SCHOOL",
        roleLabel: "Institusi Pendidikan",
        description:
          "Sekolah menjadi tempat utama pembelajaran. Guru memandu murid mengenal aturan lalu lintas melalui modul dan kuis EDULALIN, serta memantau perkembangan belajar murid.",
        logoUrl: "/logo-kemendikbud.svg",
        order: 0,
      },
      {
        name: "Kepolisian Republik Indonesia (POLRI)",
        slug: "polri",
        role: "POLRI",
        roleLabel: "Instansi Pemerintah",
        description:
          "Kepolisian berperan dalam edukasi serta pemantauan keselamatan berlalu lintas di lingkungan sekolah dan masyarakat melalui program edukasi lalu lintas.",
        logoUrl: "/logo-polri.svg",
        order: 1,
      },
      {
        name: "PT Jasa Raharja",
        slug: "jasa-raharja",
        role: "JASA_RAHARJA",
        roleLabel: "BUMN Asuransi Sosial",
        description:
          "Jasa Raharja mendukung edukasi keselamatan berlalu lintas untuk menumbuhkan budaya tertib berlalu lintas sejak dini di kalangan pelajar.",
        logoUrl: "/logo-jasa-raharja.svg",
        order: 2,
      },
    ],
  });

  console.log("✅ Seed selesai!");
  console.log("Akun yang dipertahankan:");
  console.log(" - Admin: " + ADMIN_EMAIL);
  console.log("Semua akun guru/murid/polisi demo telah dihapus.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });