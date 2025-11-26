import { randomBytes } from "crypto";
import type { SmsProvider, SmsResult } from "../types";

export class FakeSmsProvider implements SmsProvider {
  kind: "fake-sms" = "fake-sms";

  async sendSms(params: { to: string; body: string }): Promise<SmsResult> {
    const fakeMessageId = `fake_sms_${randomBytes(12).toString("hex")}`;

    console.log(`[FAKE SMS] To: ${params.to}, Body: ${params.body}`);

    return {
      messageId: fakeMessageId,
      status: "sent",
    };
  }
}
