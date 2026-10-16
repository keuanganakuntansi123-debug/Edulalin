import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const instant = false;

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 menit
const MAX_PER_WINDOW = 3;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(body.phone ?? "").trim().slice(0, 30);
  const subject = String(body.subject ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 5000);

  if (!name || !email || !phone || !subject || !message) {
    return NextResponse.json({ error: "Semua kolom wajib diisi" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
  }
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    return NextResponse.json({ error: "Format nomor telepon tidak valid" }, { status: 400 });
  }

  // Proteksi spam: batasi pengiriman dari IP yang sama
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await prisma.contactMessage.count({
    where: { ipAddress: ip, createdAt: { gte: since } },
  });
  if (recent >= MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: "Terlalu banyak pesan. Silakan coba lagi beberapa saat." },
      { status: 429 }
    );
  }

  await prisma.contactMessage.create({
    data: { name, email, phone, subject, message, ipAddress: ip },
  });

  return NextResponse.json({ ok: true });
}
