import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const instant = false;

/**
 * API notifikasi pesan kontak untuk Admin.
 * Menyediakan jumlah pesan baru (status NEW) + daftar pesan terbaru.
 * Dipanggil berkala oleh lonceng notifikasi di dashboard Admin (real-time polling).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak memiliki izin" }, { status: 403 });
  }

  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 15), 1), 50);

  const [unread, messages] = await Promise.all([
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return NextResponse.json({
    unread,
    messages: messages.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      subject: m.subject,
      message: m.message,
      status: m.status,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
