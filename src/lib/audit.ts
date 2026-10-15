import { prisma } from "@/lib/prisma";
import type { ActivityLog, Prisma } from "@/generated/prisma/client";

type LogInput = {
  actorId?: string | null;
  schoolId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Catat aktivitas penting ke activity log / audit trail. */
export async function logActivity(input: LogInput): Promise<ActivityLog> {
  return prisma.activityLog.create({
    data: {
      actorId: input.actorId ?? null,
      schoolId: input.schoolId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}