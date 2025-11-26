import { prisma as db, Prisma } from "@indietix/db";
import { getEmailProvider, getSmsProvider, getPushProvider } from "./providers";
import { renderEmailTemplate } from "./templates/email";
import { renderSmsTemplate } from "./templates/sms";
import { renderPushTemplate } from "./templates/push";
import type { SendNotificationParams } from "./types";

export async function sendNotification(
  params: SendNotificationParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { userId, type, channel, category, to, payload, scheduledAt } = params;

  if (userId) {
    const preferences = await db.notificationPreference.findUnique({
      where: { userId },
    });

    if (preferences) {
      const channelEnabled =
        (channel === "EMAIL" && preferences.emailEnabled) ||
        (channel === "SMS" && preferences.smsEnabled) ||
        (channel === "PUSH" && preferences.pushEnabled);

      if (!channelEnabled) {
        return {
          success: false,
          error: `User has disabled ${channel} notifications`,
        };
      }

      const categoryEnabled =
        (category === "TRANSACTIONAL" && preferences.transactional) ||
        (category === "REMINDERS" && preferences.reminders) ||
        (category === "MARKETING" && preferences.marketing);

      if (!categoryEnabled) {
        return {
          success: false,
          error: `User has disabled ${category} notifications`,
        };
      }
    }
  }

  if (scheduledAt && scheduledAt > new Date()) {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        channel,
        category,
        to,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: payload as any,
        scheduledAt,
        status: "PENDING",
      },
    });

    return {
      success: true,
      messageId: notification.id,
    };
  }

  try {
    let result;

    if (channel === "EMAIL") {
      const emailProvider = getEmailProvider();
      const template = renderEmailTemplate(type, payload);
      result = await emailProvider.sendEmail({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } else if (channel === "SMS") {
      const smsProvider = getSmsProvider();
      const template = renderSmsTemplate(type, payload);
      result = await smsProvider.sendSms({
        to,
        body: template.body,
      });
    } else if (channel === "PUSH") {
      const pushProvider = getPushProvider();
      const template = renderPushTemplate(type, payload);
      result = await pushProvider.sendPush({
        toToken: to,
        title: template.title,
        body: template.body,
        data: template.data,
      });
    } else {
      return {
        success: false,
        error: `Unknown channel: ${channel}`,
      };
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        channel,
        category,
        to,
        payload: payload as Prisma.InputJsonValue,
        scheduledAt: new Date(),
        sentAt: new Date(),
        status: result.status === "sent" ? "SENT" : "FAILED",
        attempts: 1,
        lastAttemptAt: new Date(),
        errorMessage: result.error,
        providerMessageId: result.messageId,
      },
    });

    return {
      success: result.status === "sent",
      messageId: notification.id,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function scheduleNotification(
  params: SendNotificationParams
): Promise<string> {
  const { userId, type, channel, category, to, payload, scheduledAt } = params;

  const notification = await db.notification.create({
    data: {
      userId,
      type,
      channel,
      category,
      to,
      payload: payload as Prisma.InputJsonValue,
      scheduledAt: scheduledAt || new Date(),
      status: "PENDING",
    },
  });

  return notification.id;
}

const RETRY_INTERVALS_MS = [
  2 * 60 * 1000,
  10 * 60 * 1000,
  30 * 60 * 1000,
];

const CHANNEL_RATE_LIMITS = {
  EMAIL: 20,
  SMS: 10,
  PUSH: 100,
};

function getNextRetryTime(attempts: number): Date {
  const intervalIndex = Math.min(attempts, RETRY_INTERVALS_MS.length - 1);
  const interval = RETRY_INTERVALS_MS[intervalIndex] ?? RETRY_INTERVALS_MS[0] ?? 2 * 60 * 1000;
  return new Date(Date.now() + interval);
}

export async function processPendingNotifications(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const now = new Date();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let totalProcessed = 0;

  for (const channel of ["EMAIL", "SMS", "PUSH"] as const) {
    const rateLimit = CHANNEL_RATE_LIMITS[channel];

    const pendingNotifications = await db.notification.findMany({
      where: {
        status: "PENDING",
        channel,
        scheduledAt: {
          lte: now,
        },
        attempts: {
          lt: 3,
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            paused: true,
          },
        },
      },
      take: rateLimit,
      orderBy: {
        scheduledAt: "asc",
      },
    });

    for (const notification of pendingNotifications) {
      if (notification.campaign?.paused) {
        skipped++;
        continue;
      }

      try {
        let result;

        if (notification.channel === "EMAIL") {
          const emailProvider = getEmailProvider();
          const template = renderEmailTemplate(
            notification.type,
            notification.payload as Record<string, unknown>
          );
          result = await emailProvider.sendEmail({
            to: notification.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });
        } else if (notification.channel === "SMS") {
          const smsProvider = getSmsProvider();
          const template = renderSmsTemplate(
            notification.type,
            notification.payload as Record<string, unknown>
          );
          result = await smsProvider.sendSms({
            to: notification.to,
            body: template.body,
          });
        } else if (notification.channel === "PUSH") {
          const pushProvider = getPushProvider();
          const template = renderPushTemplate(
            notification.type,
            notification.payload as Record<string, unknown>
          );
          result = await pushProvider.sendPush({
            toToken: notification.to,
            title: template.title,
            body: template.body,
            data: template.data,
          });
        } else {
          throw new Error(`Unknown channel: ${notification.channel}`);
        }

        if (result.status === "sent") {
          await db.notification.update({
            where: { id: notification.id },
            data: {
              status: "SENT",
              sentAt: new Date(),
              attempts: notification.attempts + 1,
              lastAttemptAt: new Date(),
              providerMessageId: result.messageId,
            },
          });
          sent++;
        } else {
          const nextRetry = getNextRetryTime(notification.attempts);
          await db.notification.update({
            where: { id: notification.id },
            data: {
              status: notification.attempts + 1 >= 3 ? "FAILED" : "PENDING",
              attempts: notification.attempts + 1,
              lastAttemptAt: new Date(),
              scheduledAt: nextRetry,
              errorMessage: result.error,
              error: result.error,
            },
          });
          if (notification.attempts + 1 >= 3) {
            failed++;
          }
        }
      } catch (error) {
        const nextRetry = getNextRetryTime(notification.attempts);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await db.notification.update({
          where: { id: notification.id },
          data: {
            status: notification.attempts + 1 >= 3 ? "FAILED" : "PENDING",
            attempts: notification.attempts + 1,
            lastAttemptAt: new Date(),
            scheduledAt: nextRetry,
            errorMessage,
            error: errorMessage,
          },
        });
        if (notification.attempts + 1 >= 3) {
          failed++;
        }
      }

      totalProcessed++;
    }

    if (pendingNotifications.length > 0) {
      const campaignIds = [...new Set(
        pendingNotifications
          .filter((n) => n.campaignId)
          .map((n) => n.campaignId as string)
      )];

      for (const campaignId of campaignIds) {
        await updateCampaignStats(campaignId);
      }
    }
  }

  return {
    processed: totalProcessed,
    sent,
    failed,
    skipped,
  };
}

async function updateCampaignStats(campaignId: string): Promise<void> {
  const [total, sentCount, failedCount] = await Promise.all([
    db.notification.count({ where: { campaignId } }),
    db.notification.count({ where: { campaignId, status: "SENT" } }),
    db.notification.count({ where: { campaignId, status: "FAILED" } }),
  ]);

  const recipients = await db.campaignRecipient.findMany({
    where: { campaignId },
    select: { status: true },
  });

  const opened = recipients.filter(
    (r) => r.status === "OPENED" || r.status === "CLICKED"
  ).length;
  const clicked = recipients.filter((r) => r.status === "CLICKED").length;

  const openRate = sentCount > 0 ? (opened / sentCount) * 100 : 0;
  const clickRate = sentCount > 0 ? (clicked / sentCount) * 100 : 0;

  await db.campaign.update({
    where: { id: campaignId },
    data: {
      stats: {
        queued: total - sentCount - failedCount,
        sent: sentCount,
        failed: failedCount,
        openRate,
        clickRate,
      },
      status: total === sentCount + failedCount ? "SENT" : "SENDING",
    },
  });
}
