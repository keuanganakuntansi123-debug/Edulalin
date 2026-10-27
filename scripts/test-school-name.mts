// @ts-nocheck
/**
 * Uji end-to-end standarisasi nama sekolah & identitas pendaftaran terhadap
 * database Neon asli.
 *
 * Memakai rantai produksi nyata (tanpa UI):
 *  - `validateSchoolName` / `detectSchoolType` / `schoolPrefixFor`
 *    (`src/lib/constants`) untuk aturan prefiks & bentuk kanonik.
 *  - `registerSchema` (`src/lib/validations`) untuk normalisasi HURUF KAPITAL
 *    dan aturan jurusan per jenjang.
 *  - `verifyResetIdentity` (`src/lib/password-request`) untuk pencocokan
 *    identitas lupa password (toleran pada nama/sekolah, persis pada detail).
 *  - Query Prisma langsung untuk memastikan tidak lahir sekolah duplikat.
 *
 * Jalankan: npm run test:school
 * Skrip bersifat read-only terhadap data asli — hanya membuat lalu menghapus
 * satu akun & sekolah QA sementara (idempoten).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  validateSchoolName,
  detectSchoolType,
  schoolPrefixFor,
  classOptionsForLevel,
  normalizeIdentityName,
} from "../src/lib/constants";
import { registerSchema } from "../src/lib/validations";
import { verifyResetIdentity } from "../src/lib/password-request";

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

const QA_EMAIL = "qa.school.name@edulalin.test";
const QA_SCHOOL_NAME = "SMKS QA UJI NAMA";

let failures = 0;
function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  \u2713 ${label}`);
  } else {
    failures++;
    console.error(`  \u2717 ${label}`);
  }
}

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email: QA_EMAIL } });
  if (user) {
    await prisma.notification.deleteMany({ where: { recipientId: user.id } });
    await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id } });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  // Hapus sekolah QA — hanya aman jika tidak ada user tersisa yang memakainya.
  const school = await prisma.school.findFirst({
    where: { name: QA_SCHOOL_NAME, users: { none: {} } },
  });
  if (school) await prisma.school.delete({ where: { id: school.id } });
}

async function main() {
  console.log("=== [1] Aturan prefiks & jenis sekolah ===");
  assert(schoolPrefixFor("SD", "NEGERI") === "SDN", "SD negeri -> SDN");
  assert(schoolPrefixFor("SMP", "NEGERI") === "SMPN", "SMP negeri -> SMPN");
  assert(schoolPrefixFor("SMA", "NEGERI") === "SMAN", "SMA negeri -> SMAN");
  assert(schoolPrefixFor("SMK", "NEGERI") === "SMKN", "SMK negeri -> SMKN");
  assert(schoolPrefixFor("SD", "SWASTA") === "SDS", "SD swasta -> SDS");
  assert(schoolPrefixFor("SMP", "SWASTA") === "SMPS", "SMP swasta -> SMPS");
  assert(schoolPrefixFor("SMA", "SWASTA") === "SMAS", "SMA swasta -> SMAS");
  assert(schoolPrefixFor("SMK", "SWASTA") === "SMKS", "SMK swasta -> SMKS");
  assert(detectSchoolType("SMKN 15 JAKARTA") === "NEGERI", "deteksi negeri dari SMKN");
  assert(detectSchoolType("SMKS BUDI LUHUR") === "SWASTA", "deteksi swasta dari SMKS");

  console.log("\n=== [2] Bentuk kanonik & penolakan yang tidak sesuai jenjang ===");
  const long = validateSchoolName("smp negeri 1 jakarta", "SMP");
  assert(long.ok === true, "nama panjang negeri diterima");
  assert(long.normalized === "SMPN 1 JAKARTA", `disetarakan -> "${long.normalized}"`);
  const lower = validateSchoolName("smks budi luhur", "SMK");
  assert(lower.ok === true && lower.normalized === "SMKS BUDI LUHUR", "swasta -> SMKS BUDI LUHUR");
  const crossed = validateSchoolName("SDN 15 JAKARTA", "SMK");
  assert(crossed.ok === false, "prefiks SDN ditolak untuk jenjang SMK");
  assert(typeof crossed.error === "string" && crossed.error.length > 0, "pesan kesalahan prefiks tersedia");
  assert(validateSchoolName("SEKOLAH BEBAS", "SMA").ok === false, "nama tanpa prefiks resmi ditolak");
  assert(validateSchoolName("", "SMA").ok === false, "nama kosong ditolak");

  console.log("\n=== [3] Opsi kelas per jenjang (bug kelas SMP) ===");
  assert(classOptionsForLevel("SD").length === 6, "SD punya 6 kelas");
  assert(classOptionsForLevel("SMP").join(",") === "7,8,9", "SMP memiliki kelas 7-9");
  assert(classOptionsForLevel("SMA").length === 3 && classOptionsForLevel("SMK").length === 3, "SMA/SMK 3 kelas");
  assert(classOptionsForLevel("").length === 0, "jenjang kosong -> tanpa opsi kelas");

  console.log("\n=== [4] registerSchema: kapital otomatis & jurusan per jenjang ===");
  const base = {
    confirmPassword: "rahasia123",
    password: "rahasia123",
    birthDate: "2010-01-01",
    email: "QA.School.Name@Edulalin.Test",
    phone: "08123456789",
  };
  const smaParse = registerSchema.safeParse({
    ...base,
    name: "  anna   latifah ",
    schoolName: "sman 82 jakarta",
    educationLevel: "SMA",
    classLevel: "10",
    major: "ipa",
  });
  assert(smaParse.success === true, "data SMA valid diterima");
  if (smaParse.success) {
    assert(smaParse.data.name === "ANNA LATIFAH", "nama dirapikan & dikapital -> ANNA LATIFAH");
    assert(smaParse.data.schoolName === "SMAN 82 JAKARTA", "sekolah dikapital -> SMAN 82 JAKARTA");
    assert(smaParse.data.major === "IPA", "jurusan SMA dikapital -> IPA");
  }
  const smpParse = registerSchema.safeParse({
    ...base,
    name: "dinda rizky",
    schoolName: "smpn 13 jakarta",
    educationLevel: "SMP",
    classLevel: "8",
    major: "SMP",
  });
  assert(smpParse.success === true, "data SMP valid diterima");
  if (smpParse.success) {
    assert(smpParse.data.major === "" || smpParse.data.major == null, "jurusan SMP dikosongkan");
  }
  const badSchool = registerSchema.safeParse({
    ...base,
    name: "budI",
    schoolName: "SDN 5 JAKARTA",
    educationLevel: "SMA",
    classLevel: "10",
    major: "IPA",
  });
  assert(badSchool.success === false, "registrasi ditolak bila prefiks sekolah beda jenjang");

  console.log("\n=== [5] Alur register() nyata + dedup sekolah di Neon ===");
  const email = QA_EMAIL;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) await cleanup();

  const schoolsBefore = await prisma.school.count();
  const parsed = registerSchema.parse({
    ...base,
    email,
    name: "qa uji nama",
    schoolName: QA_SCHOOL_NAME,
    educationLevel: "SMK",
    classLevel: "11",
    major: "tkj",
  });

  // Simulasi alur produksi: kanonik sekolah + jenjang dari prefiks.
  const check = validateSchoolName(parsed.schoolName, parsed.educationLevel);
  assert(check.ok === true && check.normalized === QA_SCHOOL_NAME, "sekolah QA valid & kanonik");
  assert(check.educationLevel === "SMK", "jenjang diturunkan dari prefiks SMKS -> SMK");

  const { hashPassword } = await import("../src/lib/password");
  const passwordHash = await hashPassword(parsed.password);
  const school = await prisma.school.findFirst({
    where: { name: { equals: check.normalized, mode: "insensitive" }, deletedAt: null },
  });
  assert(school === null, "sekolah QA belum ada sebelum registrasi");
  assert((await prisma.school.count()) === schoolsBefore, "jumlah sekolah tidak berubah setelah pencarian");

  const createdSchool = school ?? (await prisma.school.create({
    data: {
      code: `QA-${Date.now().toString(36)}`,
      name: check.normalized,
      educationLevel: check.educationLevel,
      address: "-",
      city: "-",
      province: "-",
      status: "ACTIVE",
    },
  }));
  assert(createdSchool.name === QA_SCHOOL_NAME, "sekolah QA dibuat dengan nama kanonik");

  // Pencarian kedua (variasi penulisan) harus menemukan sekolah yang sama.
  const relookup = await prisma.school.findFirst({
    where: { name: { equals: "smks qa uji nama", mode: "insensitive" }, deletedAt: null },
  });
  assert(relookup?.id === createdSchool.id, "variasi penulisan menemukan sekolah yang sama (tidak duplikat)");
  assert((await prisma.school.count()) === schoolsBefore + 1, "hanya 1 sekolah baru dibuat");

  const majorForLevel = "SMK" === "SMA" || "SMK" === "SMK" ? normalizeIdentityName(parsed.major) || null : null;
  const createdUser = await prisma.user.create({
    data: {
      name: "QA UJI NAMA",
      email,
      passwordHash,
      role: "MURID",
      birthDate: new Date(parsed.birthDate),
      schoolId: createdSchool.id,
      educationLevel: "SMK",
      classLevel: "11",
      major: majorForLevel,
      phone: parsed.phone ?? null,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });
  assert(createdUser.major === "TKJ", "jurusan murid SMK tersimpan kapital (TKJ)");
  assert(createdUser.educationLevel === "SMK", "jenjang murid = SMK");
  assert(createdUser.schoolId === createdSchool.id, "murid terhubung ke School ID yang sama");

  console.log("\n=== [6] verifyResetIdentity: toleran vs persis ===");
  const userRow = await prisma.user.findUnique({
    where: { id: createdUser.id },
    include: { school: { select: { name: true } } },
  });
  const exact = verifyResetIdentity(userRow!, {
    email,
    name: "qa uji nama",
    schoolName: "SMKS QA UJI NAMA",
    educationLevel: "SMK",
    classLevel: "11",
    major: "tkj",
  });
  assert(exact.verified === true, "identitas benar & kapital bebas -> terverifikasi");
  assert(exact.mismatchFields.length === 0, "tidak ada field yang bertentangan");

  const shorthand = verifyResetIdentity(userRow!, {
    email,
    name: "QA UJI NAMA",
    schoolName: "sekolah qa",
    educationLevel: "SMK",
    classLevel: "11",
  });
  assert(shorthand.mismatchFields.includes("school") === true, "sekolah salah -> tercatat mismatch");

  const wrongDetail = verifyResetIdentity(userRow!, {
    email,
    name: "QA UJI NAMA",
    schoolName: "SMKS QA UJI NAMA",
    educationLevel: "SMK",
    classLevel: "12",
    major: "TKJ",
  });
  assert(wrongDetail.verified === false, "kelas salah -> TIDAK terverifikasi");
  assert(wrongDetail.mismatchFields.includes("classLevel"), "kelas salah tercatat di mismatchFields");

  const sdIgnoreMajor = verifyResetIdentity(
    {
      ...userRow!,
      educationLevel: "SD",
      classLevel: "5",
      major: null,
    },
    {
      email,
      name: "QA UJI NAMA",
      schoolName: "SMKS QA UJI NAMA",
      educationLevel: "SD",
      classLevel: "5",
      major: "APAPUN",
    }
  );
  assert(sdIgnoreMajor.mismatchFields.includes("major") === false, "jurusan diabaikan untuk jenjang SD");

  await cleanup();
  const afterUser = await prisma.user.findUnique({ where: { email } });
  assert(afterUser === null, "akun QA terhapus (data asli aman)");
  const afterSchool = await prisma.school.findFirst({ where: { name: QA_SCHOOL_NAME } });
  assert(afterSchool === null, "sekolah QA terhapus");

  console.log(
    `\n${failures === 0 ? "\u2714 SEMUA UJI LULUS" : `\u2716 ${failures} UJI GAGAL`}`
  );
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch(async (err) => {
    console.error(err);
    try {
      await cleanup();
    } catch {
      /* abaikan */
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
