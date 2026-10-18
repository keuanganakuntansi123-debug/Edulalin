// @ts-nocheck
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const main = async () => {
  // Hapus modul & kuis uji
  const delMod = await prisma.module.deleteMany({ where: { title: "UJI-SIM-101" } });
  const delQuiz = await prisma.quiz.deleteMany({ where: { title: "UJI-QUIZ-SIM" } });
  // Hapus user uji temporer
  const delUsers = await prisma.user.deleteMany({
    where: { email: { in: ["young.sim@edulalin.test", "adult.sim@edulalin.test", "smk.sim@edulalin.test", "guru.sim@edulalin.test"] } },
  });
  console.log(JSON.stringify({ delMod, delQuiz, delUsers }, null, 2));
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});