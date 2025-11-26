import { prisma, Prisma } from "@indietix/db";
import {
  buildSegmentWhereClause,
  type SegmentQuery,
} from "@indietix/marketing";
import { checkBulkIdempotency } from "./idempotency";
import { calculateBatchSize } from "./rate-limiter";
import { generateUnsubscribeFooter } from "./unsubscribe";
import type {
  SendPipelineOptions,
  SendPipelineResult,
  Recipient,
  CampaignStats,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function materializeRecipients(
  segmentId?: string,
  inlineFilter?: SegmentQuery
): Promise<Recipient[]> {
  let whereClause: Prisma.UserWhereInput = {};

  if (segmentId) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    whereClause = buildSegmentWhereClause(segment.query as SegmentQuery);
  } else if (inlineFilter) {
    whereClause = buildSegmentWhereClause(inlineFilter);
  }

  const users = await prisma.user.findMany({
    where: {
      ...whereClause,
      banned: false,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      pushTokens: true,
    },
  });

  return users.map((user) => ({
    userId: user.id,
    email: user.email,
    phone: user.phone,
    pushToken: user.pushTokens.length > 0 ? (user.pushTokens[0] ?? null) : null,
  }));
}

export async function estimateRecipientCount(
  segmentId?: string,
  inlineFilter?: SegmentQuery
): Promise<number> {
  let whereClause: Prisma.UserWhereInput = {};

  if (segmentId) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      return 0;
    }

    whereClause = buildSegmentWhereClause(segment.query as SegmentQuery);
  } else if (inlineFilter) {
    whereClause = buildSegmentWhereClause(inlineFilter);
  }

  return prisma.user.count({
    where: {
      ...whereClause,
      banned: false,
    },
  });
}

function getRecipientAddress(
  recipient: Recipient,
  channel: "EMAIL" | "SMS" | "PUSH"
): string | null {
  switch (channel) {
    case "EMAIL":
      return recipient.email;
    case "SMS":
      return recipient.phone;
    case "PUSH":
      return recipient.pushToken;
    default:
      return null;
  }
}

function injectUtmParams(
  payload: Record<string, unknown>,
  campaignId: string,
  channel: "EMAIL" | "SMS" | "PUSH"
): Record<string, unknown> {
  const utmParams = {
    utm_source: "indietix",
    utm_medium: channel.toLowerCase(),
    utm_campaign: campaignId,
  };

  return {
    ...payload,
    utmParams,
  };
}

export async function createCampaign(
  options: SendPipelineOptions,
  createdBy: string
): Promise<string> {
  const campaign = await prisma.campaign.create({
    data: {
      name: `${options.templateKey} - ${new Date().toISOString()}`,
      channel: options.channel,
      templateKey: options.templateKey,
      scheduledAt: options.schedule,
      createdBy,
      status: options.schedule ? "SCHEDULED" : "DRAFT",
      paused: false,
      segmentId: options.segmentId,
      payload: options.payload as Prisma.InputJsonValue,
      rateLimit: options.rateLimit,
      utmEnabled: options.utmEnabled ?? true,
      stats: {
        queued: 0,
        sent: 0,
        failed: 0,
        openRate: 0,
        clickRate: 0,
      } as Prisma.InputJsonValue,
    },
  });

  return campaign.id;
}

export async function enqueueNotifications(
  campaignId: string,
  recipients: Recipient[],
  options: SendPipelineOptions
): Promise<{ queuedCount: number; skippedCount: number }> {
  const { channel, templateKey, payload, schedule, utmEnabled } = options;

  const userIds = recipients.map((r) => r.userId);
  const existingUserIds = await checkBulkIdempotency(
    userIds,
    campaignId,
    channel
  );

  const preferencesMap = new Map<
    string,
    { channelEnabled: boolean; categoryEnabled: boolean }
  >();
  const preferences = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds } },
  });

  for (const pref of preferences) {
    const channelEnabled =
      (channel === "EMAIL" && pref.emailEnabled) ||
      (channel === "SMS" && pref.smsEnabled) ||
      (channel === "PUSH" && pref.pushEnabled);

    const categoryEnabled = pref.marketing;

    preferencesMap.set(pref.userId, { channelEnabled, categoryEnabled });
  }

  const notificationsToCreate: Prisma.NotificationCreateManyInput[] = [];
  let skippedCount = 0;

  for (const recipient of recipients) {
    if (existingUserIds.has(recipient.userId)) {
      skippedCount++;
      continue;
    }

    const address = getRecipientAddress(recipient, channel);
    if (!address) {
      skippedCount++;
      continue;
    }

    const prefs = preferencesMap.get(recipient.userId);
    if (prefs) {
      if (!prefs.channelEnabled || !prefs.categoryEnabled) {
        skippedCount++;
        continue;
      }
    }

    let finalPayload = { ...payload };

    if (utmEnabled !== false) {
      finalPayload = injectUtmParams(finalPayload, campaignId, channel);
    }

    if (channel === "EMAIL") {
      const unsubscribeFooter = generateUnsubscribeFooter(
        BASE_URL,
        recipient.userId,
        "marketing"
      );
      finalPayload = {
        ...finalPayload,
        unsubscribeFooter,
      };
    }

    notificationsToCreate.push({
      userId: recipient.userId,
      type: templateKey,
      channel,
      category: "MARKETING",
      to: address,
      payload: finalPayload as Prisma.InputJsonValue,
      scheduledAt: schedule || new Date(),
      status: "PENDING",
      campaignId,
    });
  }

  if (notificationsToCreate.length > 0) {
    const batchSize = calculateBatchSize(
      channel,
      notificationsToCreate.length,
      options.rateLimit
    );

    for (let i = 0; i < notificationsToCreate.length; i += batchSize) {
      const batch = notificationsToCreate.slice(i, i + batchSize);
      await prisma.notification.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "SENDING",
      stats: {
        queued: notificationsToCreate.length,
        sent: 0,
        failed: 0,
        openRate: 0,
        clickRate: 0,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    queuedCount: notificationsToCreate.length,
    skippedCount,
  };
}

export async function executeSendPipeline(
  options: SendPipelineOptions,
  createdBy: string
): Promise<SendPipelineResult> {
  const recipients = await materializeRecipients(
    options.segmentId,
    options.inlineFilter
  );

  if (recipients.length === 0) {
    throw new Error("No recipients found for the given segment or filter");
  }

  const campaignId = await createCampaign(options, createdBy);

  const { queuedCount, skippedCount } = await enqueueNotifications(
    campaignId,
    recipients,
    options
  );

  return {
    campaignId,
    recipientCount: recipients.length,
    queuedCount,
    skippedCount,
  };
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { paused: true },
  });
}

export async function resumeCampaign(campaignId: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { paused: false },
  });
}

export async function getCampaignStats(
  campaignId: string
): Promise<CampaignStats | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { stats: true },
  });

  if (!campaign?.stats) {
    return null;
  }

  return campaign.stats as unknown as CampaignStats;
}

export async function updateCampaignStats(campaignId: string): Promise<void> {
  const [total, sent, failed] = await Promise.all([
    prisma.notification.count({ where: { campaignId } }),
    prisma.notification.count({ where: { campaignId, status: "SENT" } }),
    prisma.notification.count({ where: { campaignId, status: "FAILED" } }),
  ]);

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { status: true },
  });

  const opened = recipients.filter(
    (r) => r.status === "OPENED" || r.status === "CLICKED"
  ).length;
  const clicked = recipients.filter((r) => r.status === "CLICKED").length;

  const openRate = sent > 0 ? (opened / sent) * 100 : 0;
  const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;

  const stats: CampaignStats = {
    queued: total - sent - failed,
    sent,
    failed,
    openRate,
    clickRate,
  };

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      stats: stats as unknown as Prisma.InputJsonValue,
      status: total === sent + failed ? "SENT" : "SENDING",
    },
  });
}

export async function getOutboxList(status?: string): Promise<
  Array<{
    id: string;
    name: string;
    channel: string;
    status: string;
    scheduledAt: Date | null;
    paused: boolean;
    stats: CampaignStats | null;
    recipientCount: number;
  }>
> {
  const where = status
    ? { status: status as Prisma.EnumCampaignStatusFilter }
    : {};

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { recipients: true, notifications: true },
      },
    },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    status: c.status,
    scheduledAt: c.scheduledAt,
    paused: c.paused,
    stats: c.stats as unknown as CampaignStats | null,
    recipientCount: c._count.recipients || c._count.notifications,
  }));
}

export async function getFailedNotifications(campaignId?: string): Promise<
  Array<{
    id: string;
    userId: string | null;
    to: string;
    type: string;
    channel: string;
    errorMessage: string | null;
    attempts: number;
    lastAttemptAt: Date | null;
    campaignId: string | null;
  }>
> {
  const where: Prisma.NotificationWhereInput = {
    status: "FAILED",
    ...(campaignId ? { campaignId } : {}),
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { lastAttemptAt: "desc" },
    take: 100,
  });

  return notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    to: n.to,
    type: n.type,
    channel: n.channel,
    errorMessage: n.errorMessage,
    attempts: n.attempts,
    lastAttemptAt: n.lastAttemptAt,
    campaignId: n.campaignId,
  }));
}

export async function retryFailedNotification(
  notificationId: string
): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: "PENDING",
      errorMessage: null,
    },
  });
}

export async function retryAllFailedForCampaign(
  campaignId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      campaignId,
      status: "FAILED",
    },
    data: {
      status: "PENDING",
      errorMessage: null,
    },
  });

  return result.count;
}
