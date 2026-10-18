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
  const q = await prisma.quiz.findFirst({
    where: { title: "UJI-QUIZ-SIM" },
    include: { quizToSchools: { include: { school: { select: { name: true, educationLevel: true } } } } },
  });
  console.log(JSON.stringify(
    { id: q?.id, title: q?.title, educationLevel: q?.educationLevel, status: q?.status, targets: q?.quizToSchools.map(t => ({ name: t.school.name, level: t.school.educationLevel })) },
    null, 2
  ));
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});