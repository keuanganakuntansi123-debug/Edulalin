import "dotenv/config";
import { deflateSync, crc32 } from "zlib";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import type { ContentBlockKey } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "keuanganakuntansi123@gmail.com";
const ADMIN_PASSWORD = "keuanganjr";

/**
 * Genereer een eenvoudige gekleurde PNG (data-URI) op basis van een seed-naam.
 * Gebruikt voor artikelafbeeldingen: permanent opgeslagen in de database
 * (geen Blob/lokaal bestand nodig) en werkt ook direct na een verse seed.
 */
function placeholderImageDataUri(seed: string): string {
  const palette: Record<string, string> = {
    SD: "#22c55e",
    SMP: "#0ea5e9",
    SMA: "#6366f1",
    SMK: "#f59e0b",
    SIM: "#3b82f6",
  };
  const color = palette[seed] ?? "#3b82f6";
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const w = 64;
  const h = 40;
  // PNG header
  const png: number[] = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ];
  const chunk = (type: string, data: number[]) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, "ascii");
    const body = Buffer.from(data);
    const crcInput = Buffer.concat([typeBuf, body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(Number(BigInt.asUintN(32, BigInt(crc32(crcInput)))));
    png.push(...len, ...typeBuf, ...body, ...crc);
  };
  chunk("IHDR", [
    (w >> 24) & 0xff, (w >> 16) & 0xff, (w >> 8) & 0xff, w & 0xff,
    (h >> 24) & 0xff, (h >> 16) & 0xff, (h >> 8) & 0xff, h & 0xff,
    8, 2, 0, 0, 0,
  ]);
  // Rijen: filter byte 0 + RGB per pixel
  const raw: number[] = [];
  for (let y = 0; y < h; y++) {
    raw.push(0);
    for (let x = 0; x < w; x++) {
      raw.push(r, g, b);
    }
  }
  chunk("IDAT", Array.from(deflateSync(Buffer.from(raw))));
  chunk("IEND", []);
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}

async function main() {
  console.log("🌱 Seeding EDULALIN...");

  // Hapus data demo (urut relasi), pertahankan Admin utama
  await prisma.quizAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.module.deleteMany();
  await prisma.article.deleteMany();
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
  await prisma.verificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.passwordResetRequest.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.notification.deleteMany();
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

  // ===== Berita & Edukasi (Modul Publik) =====
  await prisma.article.createMany({
    data: [
      {
        title: "Ajak Anak SD Mengenal Rambu Lalu Lintas dengan Cara Menyenangkan",
        slug: "mengenal-rambu-lalu-lintas-sd",
        summary:
          "Mengenalkan rambu lalu lintas sejak usia dini membentuk kebiasaan aman di jalan. Berikut cara seru mengajak anak SD mengenal rambu-rambu di sekitar kita.",
        content:
          "Anak usia sekolah dasar berada pada masa emas pembentukan kebiasaan. Mengenalkan rambu lalu lintas sejak dini adalah investasi keselamatan jangka panjang yang akan terus mereka bawa hingga dewasa.\n\nMulailah dari rambu yang paling sering ditemui anak setiap hari, seperti rambu zebra cross, lampu lalu lintas, dan rambu pejalan kaki. Gunakan benda nyata di lingkungan sekitar sekolah atau rumah sebagai media belajar.\n\nAjak anak bernyanyi bersama sambil menghafal arti warna lampu lalu lintas: merah berarti berhenti, kuning berarti bersiap, dan hijau berarti jalan. Kegiatan yang menyenangkan membuat pesan keselamatan lebih mudah diingat.\n\nSaat menyeberang jalan, biasakan anak memegang tangan orang dewasa, menoleh ke kiri dan kanan sebelum menyeberang, serta hanya menyeberang di tempat yang disediakan seperti zebra cross.\n\nOrang tua dan guru dapat memanfaatkan kartu bergambar rambu lalu lintas sebagai permainan tebak-tebakan. Semakin sering anak berlatih, semakin kuat kebiasaan aman tertanam dalam diri mereka.",
        category: "SD",
        authorName: "Tim Edukasi EDULALIN",
        imageEmbedded: placeholderImageDataUri("SD"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Etika Berlalu Lintas untuk Remaja SMP di Jalan Raya",
        slug: "etika-berlalu-lintas-smp",
        summary:
          "Remaja mulai beraktivitas lebih mandiri di jalan. Memahami etika berlalu lintas membantu mereka menjaga keselamatan diri dan orang lain.",
        content:
          "Memasuki usia SMP, anak mulai berangkat dan pulang sekolah secara mandiri. Momen ini penting untuk menanamkan etika berlalu lintas yang benar.\n\nSaat berjalan kaki, gunakan trotoar dan tetap berada di sisi jalan yang aman. Jauhkan pandangan dari ponsel saat menyeberang — perhatian penuh adalah kunci keselamatan.\n\nBagi yang bersepeda ke sekolah, pastikan sepeda dalam kondisi baik: rem berfungsi, ban tidak kempes, dan lampu serta reflektor terpasang. Gunakan jalur sepeda bila tersedia dan patuhi arah lalu lintas.\n\nSaat menggunakan angkutan umum, tunggu di halte atau tempat yang aman, naik setelah kendaraan berhenti sempurna, dan selalu berpegang selama perjalanan.\n\nMenjadi pejalan kaki dan penumpang yang tertib adalah bentuk partisipasi aktif remaja dalam menciptakan lalu lintas yang aman dan nyaman bagi semua.",
        category: "SMP",
        authorName: "Tim Edukasi EDULALIN",
        imageEmbedded: placeholderImageDataUri("SMP"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Keselamatan Berkendara untuk Pelajar SMA: Helm dan Aturan Jalan",
        slug: "keselamatan-berkendara-sma",
        summary:
          "Pemahaman tentang helm standar, perlengkapan keselamatan, dan kepatuhan aturan jalan menjadi modal penting bagi pelajar SMA yang mulai berkendara.",
        content:
          "Banyak pelajar SMA mulai mengendarai sepeda motor ke sekolah. Keselamatan berkendara harus menjadi prioritas utama sebelum menekan gas.\n\nGunakan helm standar SNI yang terpasang dengan benar: tali dagu terkunci dan helm menutupi kepala dengan pas. Helm adalah pelindung paling utama saat terjadi kecelakaan.\n\nSebelum berkendara, periksa kondisi kendaraan: rem, lampu, klakson, spion, dan tekanan ban. Kendaraan yang sehat mengurangi risiko kecelakaan di jalan.\n\nPatuhi rambu-rambu lalu lintas, batas kecepatan, dan aturan jalan. Jangan melawan arah, hindari ponsel saat berkendara, dan jangan berboncengan lebih dari yang diizinkan.\n\nPerlengkapan tambahan seperti jakut dengan bahan tebal, sarung tangan, dan sepatu tertutup memberikan perlindungan ekstra. Bekali diri dengan SIM saat usia memenuhi syarat dan selalu berdoa sebelum perjalanan.",
        category: "SMA",
        authorName: "Tim Edukasi EDULALIN",
        imageEmbedded: placeholderImageDataUri("SMA"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Keselamatan Kerja dan Berkendara bagi Siswa SMK yang Praktik Industri",
        slug: "keselamatan-kerja-smk",
        summary:
          "Siswa SMK yang menjalani praktik industri kerap berpindah lokasi. Keselamatan berkendara dan keselamatan kerja harus berjalan bersama.",
        content:
          "Siswa SMK sering menjalani praktik kerja lapangan (PKL) di berbagai lokasi. Mobilitas yang tinggi menuntut kedisiplinan keselamatan, baik di jalan maupun di tempat kerja.\n\nSebelum berangkat praktik, pastikan kendaraan dalam kondisi prima dan Anda menggunakan perlengkapan keselamatan lengkap. Atur waktu berangkat agar tidak terburu-buru — berkendara terburu-buru adalah penyebab utama kecelakaan.\n\nDi lingkungan kerja, ikuti prosedur keselamatan yang ditetapkan perusahaan (K3). Gunakan alat pelindung diri sesuai bidang pekerjaan dan jangan pernah mengabaikan prosedur demi kecepatan.\n\nKeselamatan berkendara dan keselamatan kerja adalah satu paket: keduanya menuntut fokus, kepatuhan pada aturan, dan kesadaran akan risiko.\n\nKebiasaan tertib yang dibangun sejak praktik industri akan menjadi modal berharga saat siswa memasuki dunia kerja sesungguhnya.",
        category: "SMK",
        authorName: "Tim Edukasi EDULALIN",
        imageEmbedded: placeholderImageDataUri("SMK"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Panduan Persiapan SIM: Syarat, Materi Ujian, dan Tips Lolos",
        slug: "panduan-persiapan-sim",
        summary:
          "Mengurus SIM membutuhkan persiapan yang matang. Kenali syarat, materi ujian teori dan praktik, serta tips agar prosesnya lancar.",
        content:
          "Surat Izin Mengemudi (SIM) adalah bukti kompetensi seseorang untuk mengemudikan kendaraan bermotor. Memiliki SIM merupakan kewajiban hukum sekaligus bukti kesiapan berkendara.\n\nSyarat umum pengurusan SIM mencakup usia minimal 17 tahun, memiliki KTP atau surat keterangan domisili, serta lolos pemeriksaan kesehatan jasmani dan rohani.\n\nUjian teori menguji pengetahuan tentang rambu lalu lintas, marka jalan, peraturan berkendara, dan teknik mengemudi yang aman. Pelajari buku saku lalu lintas dan kumpulan soal ujian teori agar siap menghadapi ujian.\n\nUjian praktik menilai kemampuan mengemudi di lintasan: keseimbangan, kemampuan bermanuver, penguasaan tikungan, dan parkir. Latih keterampilan dasar mengemudi secara rutin sebelum hari ujian.\n\nTidak perlu menggunakan jasa calo. Proses pengurusan SIM kini dapat dilakukan secara mandiri dengan alur yang jelas di Satpas terdekat.\n\nPersiapan yang baik bukan hanya membantu Anda lulus ujian, tetapi juga mencerminkan kesiapan mental menjadi pengendara yang bertanggung jawab.",
        category: "SIM",
        authorName: "Tim Edukasi EDULALIN",
        imageEmbedded: placeholderImageDataUri("SIM"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Jenis-Jenis Rambu Lalu Lintas dan Artinya yang Wajib Diketahui",
        slug: "jenis-rambu-lalu-lintas",
        summary:
          "Rambu peringatan, larangan, perintah, dan petunjuk memiliki fungsi berbeda. Kenali arti dan bentuknya agar aman di jalan raya.",
        content:
          "Rambu lalu lintas adalah sarana yang membantu pengguna jalan memahami kondisi jalan, mengatur kelancaran, dan mencegah kecelakaan. Memahami artinya adalah kewajiban setiap pengguna jalan.\n\nRambu peringatan biasanya berbentuk segitiga dengan warna dasar kuning dan lambang hitam. Fungsinya memberi peringatan akan potensi bahaya seperti tikungan tajam, turunan curam, atau jalan menyempit.\n\nRambu larangan berbentuk lingkaran merah dengan latar putih dan lambang hitam. Contohnya larangan parkir, larangan masuk, dan batas kecepatan maksimum.\n\nRambu perintah berbentuk lingkaran biru dengan lambang putih, seperti perintah mengikuti arah tertentu atau batas kecepatan minimum.\n\nRambu petunjuk berbentuk persegi atau persegi panjang dengan warna hijau atau biru, menunjukkan arah, tujuan, fasilitas umum, dan petunjuk lainnya.\n\nMengenali jenis rambu membuat Anda lebih peka terhadap situasi jalan dan mengambil keputusan yang tepat saat berkendara. Selalu waspada dan patuhi rambu di sepanjang perjalanan.",
        category: "SMA",
        authorName: "Polri",
        imageEmbedded: placeholderImageDataUri("SMA"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Cara Aman Menyeberang Jalan untuk Anak Usia Dini",
        slug: "cara-aman-menyeberang-sd",
        summary:
          "Menyeberang jalan bukan sekadar menyeberang. Ajarkan anak langkah aman menyeberang: berhenti, melihat kiri kanan, dan menyeberang di zebra cross.",
        content:
          "Menyeberang jalan adalah kegiatan yang sangat sering dilakukan anak namun tak jarang terjadi kecelakaan di tempat penyeberangan. Pendidikan keselamatan menyeberang harus dimulai sedini mungkin.\n\nLangkah pertama yang harus diajarkan adalah mencari tempat aman untuk menyeberang, yaitu zebra cross atau jembatan penyeberangan. Anak perlu dibiasakan tidak menyeberang sembarangan di tengah jalan.\n\nBekali anak kebiasaan 'KIRI-KANAN-KIRI': berhenti di tepi jalan, menoleh ke kiri, ke kanan, dan ke kiri lagi untuk memastikan jalan aman sebelum melangkah.\n\nHindari menyeberang di tikungan atau tempat dengan pandangan terhalang. Jika membawa barang, tetap fokus pada jalan, bukan pada barang bawaan.\n\nOrang dewasa harus menjadi teladan. Anak belajar dari apa yang dilihat, bukan hanya dari apa yang didengar. Tunjukkan contoh menyeberang yang benar setiap kali berjalan bersama anak.",
        category: "SD",
        authorName: "Polri",
        imageEmbedded: placeholderImageDataUri("SD"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Berkendara Bermotor untuk Usia 17 Tahun: Apa Saja yang Harus Diketahui?",
        slug: "berkendara-usia-17-tahun",
        summary:
          "Usia 17 tahun adalah usia legal mulai mengemudi. Kenali aturan, tanggung jawab, dan tips aman berkendara bagi pengendara pemula.",
        content:
          "Usia 17 tahun menjadi momen penting karena secara hukum Anda diperbolehkan memiliki SIM dan mengemudikan kendaraan bermotor. Namun, legal tidak berarti tanpa tanggung jawab.\n\nPastikan Anda memiliki SIM sesuai golongan kendaraan yang dikendarai. Berkendara tanpa SIM adalah pelanggaran yang membahayakan diri sendiri dan orang lain.\n\nSebagai pengendara pemula, mulailah berkendara di area yang sepi untuk membiasakan diri dengan kendaraan. Tingkatkan kemampuan secara bertahap sebelum berkendara di jalan raya yang ramai.\n\nPahami aturan dasar: memakai helm, tidak menggunakan ponsel saat berkendara, menjaga jarak aman, dan menghormati pengguna jalan lain.\n\nPerlengkapan keselamatan seperti lampu yang berfungsi, spion yang benar, dan kondisi rem yang prima wajib diperiksa sebelum berkendara.\n\nKeselamatan adalah tanggung jawab utama setiap pengendara. Jadilah pengendara pemula yang disiplin, bukan sekadar berani.",
        category: "SIM",
        authorName: "Polri",
        imageEmbedded: placeholderImageDataUri("SIM"),
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      {
        title: "Tips Menggunakan Transportasi Umum dengan Aman bagi Pelajar",
        slug: "tips-transportasi-umum-smp",
        summary:
          "Transportasi umum adalah pilihan yang hemat dan ramah lingkungan. Ketahui tips aman naik bus, KRL, dan angkutan umum lainnya.",
        content:
          "Bagi pelajar yang tidak diantar orang tua, transportasi umum menjadi andalan untuk sampai ke sekolah. Gunakan dengan bijak dan aman.\n\nTunggu kendaraan di halte atau titik pemberhentian yang resmi. Jangan berdiri terlalu dekat dengan tepi jalan atau di jalur kendaraan.\n\nNaiklah setelah kendaraan benar-benar berhenti. Saat di dalam, pegang pegangan yang tersedia dan hindari bermain ponsel secara berlebihan agar tetap waspada.\n\nJika membawa tas, letakkan di depan tubuh agar lebih mudah dijaga dan tidak mengganggu penumpang lain.\n\nKenali rute dan perhentian tujuan. Jika tersesat, mintalah bantuan petugas atau orang dewasa yang terpercaya — jangan ragu untuk bertanya kepada petugas stasiun atau halte.\n\nPatuhi aturan di dalam kendaraan, antaruser dengan sopan, dan utamakan keselamatan. Kebiasaan baik ini membuat perjalanan Anda dan penumpang lain nyaman.",
        category: "SMP",
        authorName: "Tim Edukasi EDULALIN",
        imageEmbedded: placeholderImageDataUri("SMP"),
        status: "ACTIVE",
        publishedAt: new Date(),
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