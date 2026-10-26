import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const RETRYABLE_MESSAGES = [
  "Server has closed the connection",
  "Connection terminated unexpectedly",
  "Connection terminated",
  "Connection refused",
  "ECONNRESET",
  "ETIMEDOUT",
  "timeout expired",
  "Idle connection timeout",
  "write CONNECTION_CLOSED",
  "Socket write timeout",
];

function isRetryableError(error: unknown): boolean {
  const message = error instanceof PrismaClientKnownRequestError ? error.message : error instanceof Error ? error.message : String(error);
  return RETRYABLE_MESSAGES.some((needle) => message.includes(needle));
}

/** Jalankan operasi Prisma dengan retry untuk koneksi transien (Neon idle/suspend). */
export async function withRetry<T>(fn: () => Promise<T>, { retries = 2, delayMs = 250 }: { retries?: number; delayMs?: number } = {}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum di-set. Salin isi .env.example ke .env dan isi koneksi PostgreSQL.");
  }

  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    maxUses: 7_500,
  });

  pool.on("error", (err) => {
    console.error("[prisma:pool] Pool error:", err.message);
  });

  const adapter = new PrismaPg(pool, {
    disposeExternalPool: false,
    onPoolError: (err) => console.error("[prisma:adapter] Pool error:", err.message),
    onConnectionError: (err) => console.error("[prisma:adapter] Connection error:", err.message),
  });

  return new PrismaClient({ adapter }).$extends({
    query: {
      $allOperations({ args, query }) {
        return withRetry(() => query(args));
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@/generated/prisma/client";
