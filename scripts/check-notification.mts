import { prisma } from "../src/lib/prisma";

const rows: { table_name: string }[] =
  await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Notification','QuizAttempt','QuizAnswer')`;
console.log("Tables found:", rows.map((r) => r.table_name).join(", "));

const count: { c: bigint }[] =
  await prisma.$queryRaw`SELECT COUNT(*)::bigint AS c FROM "Notification"`;
console.log("Notification rows:", count[0].c.toString());

await prisma.$disconnect();
