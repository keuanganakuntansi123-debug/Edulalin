import "dotenv/config";
import pg from "pg";

/** Migrasi manual untuk revisi EDULALIN (karena P3015 menghalangi prisma migrate). */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum di-set");

  const pool = new pg.Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Tambahkan nilai 'SMK' pada enum EducationLevel (PostgreSQL).
    await client.query(`ALTER TYPE "EducationLevel" ADD VALUE IF NOT EXISTS 'SMK';`);

    // 2. Tambahkan kolom logoFileId pada tabel School (referensi UploadedFile).
    await client.query(`
      ALTER TABLE "School"
      ADD COLUMN IF NOT EXISTS "logoFileId" TEXT;
    `);

    // Relasi ke UploadedFile (set null jika file dihapus).
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'School_logoFileId_fkey'
        ) THEN
          ALTER TABLE "School"
          ADD CONSTRAINT "School_logoFileId_fkey"
          FOREIGN KEY ("logoFileId") REFERENCES "UploadedFile"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await client.query("COMMIT");
    console.log("Migrasi manual berhasil: enum SMK + kolom School.logoFileId.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});