import type { EmailProvider, EmailResult } from "../types";

export class ResendEmailProvider implements EmailProvider {
  kind: "resend" = "resend";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resend: any;

  constructor(apiKey: string) {
    try {
      const { Resend } = require("resend");
      this.resend = new Resend(apiKey);
    } catch {
      throw new Error(
        "Resend package not installed. Install with: pnpm add resend"
      );
    }
  }

  async sendEmail(emailParams: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailResult> {
    try {
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@indietix.com",
        to: emailParams.to,
        subject: emailParams.subject,
        html: emailParams.html,
        text: emailParams.text,
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
