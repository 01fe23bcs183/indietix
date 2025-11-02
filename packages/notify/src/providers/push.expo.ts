import type { PushProvider, PushResult } from "../types";

export class ExpoPushProvider implements PushProvider {
  kind: "expo" = "expo";
  private expo: any;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Expo } = require("expo-server-sdk");
      this.expo = new Expo();
    } catch (error) {
      throw new Error(
        "expo-server-sdk package not installed. Install with: pnpm add expo-server-sdk"
      );
    }
  }

  async sendPush(params: {
    toToken: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<PushResult> {
    try {
      if (!this.expo.isExpoPushToken(params.toToken)) {
        return {
          messageId: "error",
          status: "failed",
          error: "Invalid Expo push token",
        };
      }

      const messages = [
        {
          to: params.toToken,
          sound: "default",
          title: params.title,
          body: params.body,
          data: params.data || {},
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
