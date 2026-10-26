import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

export const instant = false;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 30);
  const typeParam = req.nextUrl.searchParams.get("type");
  const types = typeParam
    ? typeParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  const scope: Prisma.NotificationWhereInput = {
    recipientId: user.id,
    ...(types && types.length ? { type: { in: types } } : {}),
  };

  const [unread, total, notifications] = await Promise.all([
    prisma.notification.count({ where: { ...scope, readAt: null } }),
    prisma.notification.count({ where: scope }),
    prisma.notification.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return NextResponse.json({
    unread,
    total,
    read: total - unread,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
