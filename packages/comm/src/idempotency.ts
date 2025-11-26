import { prisma } from "@indietix/db";

export interface IdempotencyCheckResult {
  exists: boolean;
  notificationId?: string;
}

export async function checkIdempotency(
  userId: string | null,
  campaignId: string,
  channel: "EMAIL" | "SMS" | "PUSH"
): Promise<IdempotencyCheckResult> {
  if (!userId) {
    return { exists: false };
  }

  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      campaignId,
      channel,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      exists: true,
      notificationId: existing.id,
    };
  }

  return { exists: false };
}

export async function checkBulkIdempotency(
  userIds: string[],
  campaignId: string,
  channel: "EMAIL" | "SMS" | "PUSH"
): Promise<Set<string>> {
  if (userIds.length === 0) {
    return new Set();
  }

  const existing = await prisma.notification.findMany({
    where: {
      userId: { in: userIds },
      campaignId,
      channel,
    },
    select: {
      userId: true,
    },
  });

  return new Set(existing.map((n) => n.userId).filter(Boolean) as string[]);
}

export function generateIdempotencyKey(
  userId: string,
  campaignId: string,
  channel: "EMAIL" | "SMS" | "PUSH"
): string {
  return `${userId}:${campaignId}:${channel}`;
}
