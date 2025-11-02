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

export async function processPendingNotifications(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date();

  const pendingNotifications = await db.notification.findMany({
    where: {
      status: "PENDING",
      scheduledAt: {
        lte: now,
      },
      attempts: {
        lt: 3, // Max 3 attempts
      },
    },
    take: 100, // Process in batches
  });

  let sent = 0;
  let failed = 0;

  for (const notification of pendingNotifications) {
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

      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: result.status === "sent" ? "SENT" : "FAILED",
          sentAt: result.status === "sent" ? new Date() : null,
          attempts: notification.attempts + 1,
          lastAttemptAt: new Date(),
          errorMessage: result.error,
          providerMessageId: result.messageId,
        },
      });

      if (result.status === "sent") {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          attempts: notification.attempts + 1,
          lastAttemptAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });
      failed++;
    }
  }

  return {
    processed: pendingNotifications.length,
    sent,
    failed,
  };
}
