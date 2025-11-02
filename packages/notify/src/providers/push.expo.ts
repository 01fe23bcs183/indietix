import type { PushProvider, PushResult } from "../types";

export class ExpoPushProvider implements PushProvider {
  kind: "expo" = "expo";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private expo: any;

  constructor() {
    try {
      const { Expo } = require("expo-server-sdk");
      this.expo = new Expo();
    } catch {
      throw new Error(
        "expo-server-sdk package not installed. Install with: pnpm add expo-server-sdk"
      );
    }
  }

  async sendPush(pushParams: {
    toToken: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<PushResult> {
    try {
      if (!this.expo.isExpoPushToken(pushParams.toToken)) {
        return {
          messageId: "error",
          status: "failed",
          error: "Invalid Expo push token",
        };
      }

      const messages = [
        {
          to: pushParams.toToken,
          sound: "default",
          title: pushParams.title,
          body: pushParams.body,
          data: pushParams.data || {},
        },
      ];

      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      const ticket = tickets[0];
      if (ticket.status === "ok") {
        return {
          messageId: ticket.id,
          status: "sent",
        };
      } else {
        return {
          messageId: "error",
          status: "failed",
          error: ticket.message || "Unknown error",
        };
      }
    } catch (error) {
      return {
        messageId: "error",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
