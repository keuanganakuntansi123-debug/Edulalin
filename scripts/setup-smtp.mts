/**
 * Penyiapan SMTP interaktif untuk EDULALIN.
 *
 * Alur:
 *   1. Menanyakan kredensial Gmail SMTP (App Password 16 karakter).
 *   2. Menguji koneksi & mengirim email uji lewat `src/lib/mail` — kredensial
 *      diterapkan ke proses ini lebih dulu sehingga pengujian pasti memakai
 *      nilai baru.
 *   3. Menyimpan/memperbarui variabel SMTP_* di file `.env` (baris lain utuh).
 *   4. Menawarkan sinkronisasi ke environment Vercel (production + preview).
 *
 * Rahasia hanya ditulis ke `.env` lokal dan env Vercel — tidak pernah dicetak
 * ke log. Input password disamarkan saat dijalankan di terminal interaktif.
 *
 * Jalankan:
 *   npm run setup:smtp                # interaktif penuh
 *   npm run setup:smtp -- --dry-run   # uji alur tanpa jaringan & tanpa menulis
 *   npm run setup:smtp -- --no-sync   # lewati sinkronisasi Vercel
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");
const VERCEL_PROJECT = "edulalin";
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const NO_SYNC = ARGS.includes("--no-sync");

type PromptOptions = { hidden?: boolean; fallback?: string };

/**
 * Pembaca input tunggal untuk seluruh sesi.
 *
 * readline bawaan tidak dapat dipakai berulang secara berurutan (buffer piped
 * ikut terbuang saat interface ditutup), jadi seluruh prompt memakai satu
 * pembaca ini: mode baris untuk pipa/CI, mode per-karakter untuk TTY agar dapat
 * ber-echo dan menyamarkan password.
 */
function createPrompter() {
  const stdin = process.stdin;
  const stdout = process.stdout;
  const isTty = Boolean(stdin.isTTY);
  const queue: string[] = [];
  const waiters: Array<(value: string) => void> = [];
  let buffer = "";
  let ended = false;

  if (!isTty) {
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk: string) => {
      buffer += chunk;
      let index: number;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, "");
        buffer = buffer.slice(index + 1);
        const waiter = waiters.shift();
        if (waiter) waiter(line);
        else queue.push(line);
      }
    });
    stdin.on("end", () => {
      ended = true;
      if (buffer.length > 0) {
        const waiter = waiters.shift();
        if (waiter) waiter(buffer.replace(/\r$/, ""));
        buffer = "";
      }
      while (waiters.length > 0) waiters.shift()!("");
    });
    stdin.resume();
  }

  function readPiped(): Promise<string> {
    if (queue.length > 0) return Promise.resolve(queue.shift()!);
    if (ended) return Promise.resolve("");
    return new Promise((res) => waiters.push(res));
  }

  function readTty(hidden: boolean): Promise<string> {
    return new Promise((res) => {
      const wasRaw = stdin.isRaw;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      let value = "";
      let escaping = false;
      const finish = () => {
        stdin.removeListener("data", onData);
        stdin.setRawMode(Boolean(wasRaw));
      };
      const onData = (chunk: string) => {
        for (const ch of chunk) {
          const code = ch.charCodeAt(0);
          if (escaping) {
            if (code >= 0x40 && code <= 0x7e) escaping = false;
            continue;
          }
          if (code === 27) {
            escaping = true;
            continue;
          }
          if (ch === "\r" || ch === "\n") {
            finish();
            stdout.write("\n");
            res(value);
            return;
          }
          if (code === 3) {
            finish();
            stdout.write("\nDibatalkan.\n");
            process.exit(130);
          }
          if (code === 127 || code === 8) {
            if (value.length > 0) {
              value = value.slice(0, -1);
              stdout.write("\b \b");
            }
            continue;
          }
          if (code >= 32) {
            value += ch;
            stdout.write(hidden ? "*" : ch);
          }
        }
      };
      stdin.on("data", onData);
    });
  }

  return async function prompt(question: string, options: PromptOptions = {}): Promise<string> {
    const suffix = options.fallback ? ` [${options.fallback}]` : "";
    stdout.write(`${question}${suffix}: `);
    const raw = isTty ? await readTty(Boolean(options.hidden)) : await readPiped();
    const value = raw.trim();
    return value || options.fallback || "";
  };
}

/** Upsert KEY="value" pada file .env tanpa menyentuh baris lain. */
function upsertEnv(lines: string[], key: string, value: string): void {
  const rendered = `${key}="${value.replace(/"/g, '\\"')}"`;
  const index = lines.findIndex((l) => l.trim().startsWith(`${key}=`));
  if (index >= 0) lines[index] = rendered;
  else lines.push(rendered);
}

function currentEnvValue(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function runVercel(args: string[], input?: string) {
  return spawnSync("npx", ["vercel", ...args], {
    input,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
  });
}

function syncToVercel(entries: [string, string][]) {
  console.log("\nMenyinkronkan ke Vercel...");
  for (const target of ["production", "preview"]) {
    for (const [key, value] of entries) {
      runVercel(["env", "rm", key, target, "--yes", "--project", VERCEL_PROJECT]);
      const added = runVercel(["env", "add", key, target, "--project", VERCEL_PROJECT], `${value}\n`);
      if (added.status === 0) {
        console.log(`  ✓ ${key} → ${target}`);
      } else {
        const detail = (added.stderr || added.stdout || "").trim().split("\n").slice(-1)[0] ?? "";
        console.error(`  ✗ ${key} → ${target} (${detail})`);
      }
    }
  }
}

async function main() {
  const prompt = createPrompter();

  console.log("\n=== Penyiapan Email EDULALIN (Gmail SMTP) ===");
  if (DRY_RUN) console.log("(mode dry-run: tanpa jaringan, tanpa menulis)\n");
  else console.log("");

  console.log(
    "Gmail memerlukan App Password 16 karakter. Buat di:\n" +
      "https://myaccount.google.com/apppasswords\n" +
      "(Akun wajib mengaktifkan Verifikasi 2 Langkah.)\n"
  );

  const user = await prompt("Alamat Gmail pengirim (SMTP_USER)", {
    fallback: currentEnvValue("SMTP_USER"),
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    console.error("✗ Alamat email tidak valid. Dibatalkan.");
    process.exit(1);
  }

  const pass = (await prompt("App Password 16 karakter (SMTP_PASS)", { hidden: true })).replace(
    /\s+/g,
    ""
  );
  if (pass.length < 12) {
    console.error("✗ App Password terlalu pendek (minimal 12 karakter). Dibatalkan.");
    process.exit(1);
  }
  if (user.toLowerCase().endsWith("@gmail.com") && pass.length !== 16) {
    console.warn("! Peringatan: App Password Gmail biasanya tepat 16 karakter.");
  }

  const host = await prompt("SMTP host", { fallback: currentEnvValue("SMTP_HOST") || "smtp.gmail.com" });
  const port = await prompt("SMTP port", { fallback: currentEnvValue("SMTP_PORT") || "465" });
  const secure = await prompt("SMTP secure (true/false)", {
    fallback: currentEnvValue("SMTP_SECURE") || "true",
  });
  const from = await prompt("SMTP from", {
    fallback: currentEnvValue("SMTP_FROM") || `EDULALIN — Edukasi Lalu Lintas <${user}>`,
  });
  const replyTo = await prompt("SMTP reply-to", { fallback: currentEnvValue("SMTP_REPLY_TO") || user });

  // Terapkan ke proses ini agar pengujian memakai nilai baru.
  process.env.SMTP_HOST = host;
  process.env.SMTP_PORT = port;
  process.env.SMTP_SECURE = secure;
  process.env.SMTP_USER = user;
  process.env.SMTP_PASS = pass;
  process.env.SMTP_FROM = from;
  process.env.SMTP_REPLY_TO = replyTo;

  if (DRY_RUN) {
    console.log("\nDry run — konfigurasi yang akan dipakai:");
    console.log(`  SMTP_HOST="${host}"`);
    console.log(`  SMTP_PORT="${port}"`);
    console.log(`  SMTP_SECURE="${secure}"`);
    console.log(`  SMTP_USER="${user}"`);
    console.log(`  SMTP_PASS="${"*".repeat(pass.length)}" (panjang ${pass.length})`);
    console.log(`  SMTP_FROM="${from}"`);
    console.log(`  SMTP_REPLY_TO="${replyTo}"`);
    console.log("\n✓ Alur valid. Tidak ada jaringan dipanggil dan .env tidak diubah.");
    return;
  }

  console.log("\nMenguji koneksi SMTP...");
  const { getMailStatus, verifyMailConnection, sendMail, buildMailHtml } = await import(
    "../src/lib/mail"
  );
  const status = getMailStatus();
  console.log(
    `  host=${status.host} port=${status.port} user=${status.user} panjangPassword=${status.passwordLength} secure=${status.secure}`
  );
  if (!status.configured) {
    console.error(`✗ Konfigurasi belum lengkap. Kosong: ${status.missing.join(", ")}`);
    process.exit(1);
  }

  const verified = await verifyMailConnection();
  if (!verified.ok) {
    console.error(`✗ Koneksi/autentikasi GAGAL: ${verified.error}`);
    console.error("  Periksa kembali App Password (16 karakter, tanpa spasi) dan SMTP_USER.");
    process.exit(1);
  }
  console.log("✓ Koneksi & autentikasi SMTP BERHASIL.");

  const to = await prompt("Kirim email uji ke", { fallback: user });
  const sent = await sendMail({
    to,
    subject: "EDULALIN — Uji Konfigurasi Email",
    text: `Email uji EDULALIN berhasil dikirim dari ${user}. Konfigurasi SMTP sudah benar.`,
    html: buildMailHtml({
      heading: "Email Uji Berhasil",
      intro: "Konfigurasi SMTP EDULALIN sudah benar dan email notifikasi siap digunakan.",
      rows: [
        { label: "Pengirim", value: user },
        { label: "Server", value: `${host}:${port}` },
        {
          label: "Waktu uji",
          value: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        },
      ],
      footer: "Email otomatis dari sistem EDULALIN.",
    }),
  });
  if (!sent.ok) {
    console.error(`✗ Gagal mengirim email uji: ${sent.error}`);
    process.exit(1);
  }
  console.log(`✓ Email uji terkirim ke ${to} (messageId: ${sent.messageId ?? "-"}).`);

  if ((await prompt("\nSimpan kredensial ke .env lokal? (y/n)", { fallback: "y" })).toLowerCase().startsWith("n")) {
    console.log("Dilewati. Tidak ada perubahan pada .env.");
    return;
  }

  const lines = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8").split(/\r?\n/) : [];
  upsertEnv(lines, "SMTP_HOST", host);
  upsertEnv(lines, "SMTP_PORT", port);
  upsertEnv(lines, "SMTP_SECURE", secure);
  upsertEnv(lines, "SMTP_USER", user);
  upsertEnv(lines, "SMTP_PASS", pass);
  upsertEnv(lines, "SMTP_FROM", from);
  upsertEnv(lines, "SMTP_REPLY_TO", replyTo);
  writeFileSync(ENV_PATH, lines.join("\n").replace(/\n+$/, "") + "\n", "utf8");
  console.log("✓ .env diperbarui (SMTP_HOST/PORT/SECURE/USER/PASS/FROM/REPLY_TO).");

  if (NO_SYNC) {
    console.log("Sinkronisasi Vercel dilewati (--no-sync).");
  } else if (
    !(await prompt("\nSinkronkan kredensial ke Vercel (production & preview)? (y/n)", {
      fallback: "y",
    }))
      .toLowerCase()
      .startsWith("n")
  ) {
    syncToVercel([
      ["SMTP_HOST", host],
      ["SMTP_PORT", port],
      ["SMTP_SECURE", secure],
      ["SMTP_USER", user],
      ["SMTP_PASS", pass],
      ["SMTP_FROM", from],
      ["SMTP_REPLY_TO", replyTo],
    ]);
  }

  console.log(
    "\nSelesai. Langkah berikutnya: redeploy produksi agar env baru terpakai.\n" +
      `  npx vercel --prod --project ${VERCEL_PROJECT} --yes\n`
  );
}

main().catch((error) => {
  console.error("\nGagal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
