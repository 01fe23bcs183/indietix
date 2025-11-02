import type { SmsProvider, SmsResult } from "../types";

export class TwilioSmsProvider implements SmsProvider {
  kind: "twilio" = "twilio";
  private twilio: any;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require("twilio");
      this.twilio = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
    } catch (error) {
      throw new Error(
        "Twilio package not installed. Install with: pnpm add twilio"
      );
    }
  }

  async sendSms(params: { to: string; body: string }): Promise<SmsResult> {
    try {
      const message = await this.twilio.messages.create({
        from: this.fromNumber,
        to: params.to,
        body: params.body,
      });

      return {
        messageId: message.sid,
        status: "sent",
      };
    } catch (error) {
      return {
        messageId: "error",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
