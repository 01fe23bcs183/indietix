import type { SmsProvider, SmsResult } from "../types";

export class TwilioSmsProvider implements SmsProvider {
  kind: "twilio" = "twilio";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private twilio: any;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    try {
      const mod = require("twilio");
      const twilio = mod.default ?? mod;
      this.twilio = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
    } catch {
      throw new Error(
        "Twilio package not installed. Install with: pnpm add twilio"
      );
    }
  }

  async sendSms(smsParams: { to: string; body: string }): Promise<SmsResult> {
    try {
      const message = await this.twilio.messages.create({
        from: this.fromNumber,
        to: smsParams.to,
        body: smsParams.body,
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
