import { randomBytes } from "crypto";
import type { EmailProvider, EmailResult } from "../types";

export class FakeEmailProvider implements EmailProvider {
  kind: "fake-email" = "fake-email";

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailResult> {
    const fakeMessageId = `fake_email_${randomBytes(12).toString("hex")}`;

    console.log(`[FAKE EMAIL] To: ${params.to}, Subject: ${params.subject}`);

    return {
      messageId: fakeMessageId,
      status: "sent",
    };
  }
}
