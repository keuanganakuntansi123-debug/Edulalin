/**
 * Sinkronisasi data SMK lama → SMK di Neon.
 *
 * Sebelum enum SMK ada, sekolah kejuruan (mis. "SMKN 15 Jakarta") tersimpan
 * dengan educationLevel = "SMA". Script ini memperbarui:
 *  - School  : nama mengandung "smk" / "sekolah menengah kejuruan" → "SMK"
 *  - Murid   : user pada sekolah tersebut → "SMK"
 *  - Guru    : user pada sekolah tersebut → "SMK"
 *
 * AMAN: hanya menyentuh entitas yang jelas-jelas SMK; tidak menghapus data.
 * Jalankan: npm run sync:smk
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 5 });
const adapter = new PrismaPg(pool, { disposeExternalPool: false });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("→ Mencari sekolah kejuruan yang masih berlabel SMA...");

  const candidates = await prisma.school.findMany({
    where: {
      educationLevel: { not: "SMK" },
      OR: [
        { name: { contains: "smk", mode: "insensitive" } },
        { name: { contains: "sekolah menengah kejuruan", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, educationLevel: true },
  });

  console.log(`   Ditemukan ${candidates.length} sekolah SMK mislabel.`);

  for (const school of candidates) {
    await prisma.school.update({
      where: { id: school.id },
      data: { educationLevel: "SMK" },
    });

    const users = await prisma.user.updateMany({
      where: { schoolId: school.id, educationLevel: { not: "SMK" } },
      data: { educationLevel: "SMK" },
    });

    console.log(
      `   ✓ ${school.name} (${school.educationLevel ?? "-"} → SMK), user ter-update: ${users.count}`
    );
  }

  // Tampilkan ringkasan akhir
  const smkCount = await prisma.school.count({ where: { educationLevel: "SMK" } });
  const smaCount = await prisma.school.count({ where: { educationLevel: "SMA" } });
  console.log(`\nSelesai. Sekolah SMK: ${smkCount}, Sekolah SMA: ${smaCount}.`);

  await pool.end();
}

main().catch(async (e) => {
  console.error("Gagal sinkronisasi:", e);
  await pool.end();
  process.exit(1);
});