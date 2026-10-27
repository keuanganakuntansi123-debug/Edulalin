// @ts-nocheck
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

/**
 * Normalisasi data identitas lama di Neon:
 * 1) Hapus jurusan pada murid SD/SMP (jurusan hanya untuk SMA/SMK).
 * 2) Rapikan nama, kelas, jurusan, mapel, kesatuan ke HURUF KAPITAL.
 * 3) Sinkronkan jenjang murid dengan jenjang sekolah.
 * Tidak menghapus akun/data apa pun — hanya memperbaiki penulisan.
 */
const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const up = (v) =>
  v == null ? null : String(v).trim().replace(/\s+/g, " ").toUpperCase() || null;

const apply = process.argv.includes("--apply");

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      educationLevel: true,
      classLevel: true,
      major: true,
      subject: true,
      policeUnit: true,
      policeDivision: true,
      school: { select: { name: true, educationLevel: true } },
    },
  });

  let changed = 0;
  for (const u of users) {
    const data = {};
    if (u.name !== up(u.name)) data.name = up(u.name);
    if (u.classLevel !== up(u.classLevel)) data.classLevel = up(u.classLevel);
    if (u.subject !== up(u.subject)) data.subject = up(u.subject);
    if (u.policeUnit !== up(u.policeUnit)) data.policeUnit = up(u.policeUnit);
    if (u.policeDivision !== up(u.policeDivision)) data.policeDivision = up(u.policeDivision);

    const level = u.educationLevel ?? u.school?.educationLevel ?? null;
    if (u.role === "MURID" && (level === "SD" || level === "SMP")) {
      if (u.major !== null) {
        data.major = null;
        console.log(`  - jurusan dihapus (${level}): ${u.name} (${u.major})`);
      }
    } else if (u.major !== up(u.major)) {
      data.major = up(u.major);
    }

    if (u.role === "MURID" && u.educationLevel == null && u.school?.educationLevel) {
      data.educationLevel = u.school.educationLevel;
    }

    if (Object.keys(data).length === 0) continue;
    changed++;
    console.log(`UBAH ${u.role} ${u.name}:`, JSON.stringify(data));
    if (apply) await prisma.user.update({ where: { id: u.id }, data });
  }

  console.log(`\n${apply ? "DITERAPKAN" : "DRY-RUN"}: ${changed} akun ${apply ? "diperbarui" : "akan diperbarui"}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
