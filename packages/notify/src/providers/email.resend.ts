import type { EmailProvider, EmailResult } from "../types";

export class ResendEmailProvider implements EmailProvider {
  kind: "resend" = "resend";
  private resend: any;

  constructor(apiKey: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Resend } = require("resend");
      this.resend = new Resend(apiKey);
    } catch (error) {
      throw new Error(
        "Resend package not installed. Install with: pnpm add resend"
      );
    }
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailResult> {
    try {
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@indietix.com",
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      return {
        messageId: result.id || "unknown",
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
