import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { config } from "dotenv";

config();

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolveFn) => rl.question(question, resolveFn));
}

async function main() {
  console.log("");
  console.log("=== Setup SMTP Gmail (App Password) ===");
  console.log("");
  console.log("Langkah membuat App Password (sekali saja):");
  console.log("  1. Buka https://myaccount.google.com/apppasswords");
  console.log("     dengan akun keuanganakuntansi123@gmail.com.");
  console.log("  2. Pastikan Verifikasi 2 Langkah sudah AKTIF.");
  console.log("  3. Nama aplikasi: EDULALIN  ->  Buat.");
  console.log("  4. Salin App Password 16 karakter yang muncul.");
  console.log("     (Google menampilkannya sekali saja.)");
  console.log("");

  const pass = (await ask("Tempel App Password lalu tekan Enter: ")).trim();
  const normalized = pass.replace(/\s+/g, "");

  if (normalized.length !== 16) {
    console.error(
      `\nX App Password harus 16 karakter (yang Anda tempel: ${normalized.length} karakter). Coba lagi.`
    );
    process.exit(1);
  }

  const envPath = resolve(process.cwd(), ".env");
  const content = readFileSync(envPath, "utf8");
  const updated = content.replace(
    /^SMTP_PASS=.*$/m,
    `SMTP_PASS="${normalized}"`
  );
  if (updated === content) {
    console.error("\nX Baris SMTP_PASS tidak ditemukan di .env.");
    process.exit(1);
  }
  writeFileSync(envPath, updated);

  console.log("\n OK SMTP_PASS tersimpan di .env.");

  // Tawarkan sinkronisasi ke Vercel agar produksi ikut bisa mengirim OTP.
  const pushVercel = (await ask(
    "\nSinkronkan juga ke Vercel (production & preview)? [y/N]: "
  ))
    .trim()
    .toLowerCase();

  if (pushVercel === "y" || pushVercel === "ya") {
    // Nama proyek Vercel sebenarnya: "edulalin" (lihat .vercel/repo.json).
    const projectName = process.env.VERCEL_PROJECT ?? "edulalin";
    for (const scope of ["production", "preview"]) {
      console.log(`\nMengirim SMTP_PASS ke Vercel (${scope})...`);
      const res = spawnSync(
        process.platform === "win32" ? "npx.cmd" : "npx",
        [
          "vercel",
          "env",
          "add",
          "SMTP_PASS",
          scope,
          "--value",
          normalized,
          "--sensitive",
          "--force",
          "--yes",
          "--project",
          projectName,
        ],
        { stdio: "inherit", shell: process.platform === "win32" }
      );
      if (res.status !== 0) {
        console.warn(
          `! Gagal mengirim ke Vercel (${scope}). Set manual di Vercel → Settings → Environment Variables.`
        );
      }
    }
    console.log(
      "\nJalankan `npx vercel --prod --yes` agar perubahan env dipakai produksi."
    );
  }

  console.log("\nMenjalankan tes kirim email...\n");
  rl.close();

  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "test:smtp"],
    { stdio: "inherit", shell: false }
  );
  process.exit(result.status ?? 1);
}

main();