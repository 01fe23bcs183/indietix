import { describe, it, expect } from "vitest";
import { FakeEmailProvider } from "../providers/email.fake";
import { FakeSmsProvider } from "../providers/sms.fake";
import { FakePushProvider } from "../providers/push.fake";

describe("Notification Providers", () => {
  describe("FakeEmailProvider", () => {
    it("should send email successfully", async () => {
      const provider = new FakeEmailProvider();
      const result = await provider.sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
        text: "Test Text",
      });

      expect(result.status).toBe("sent");
      expect(result.messageId).toMatch(/^fake_email_/);
    });
  });

  describe("FakeSmsProvider", () => {
    it("should send SMS successfully", async () => {
      const provider = new FakeSmsProvider();
      const result = await provider.sendSms({
        to: "+1234567890",
        body: "Test SMS message",
      });

      expect(result.status).toBe("sent");
      expect(result.messageId).toMatch(/^fake_sms_/);
    });
  });

  describe("FakePushProvider", () => {
    it("should send push notification successfully", async () => {
      const provider = new FakePushProvider();
      const result = await provider.sendPush({
        toToken: "ExponentPushToken[test]",
        title: "Test Title",
        body: "Test Body",
        data: { key: "value" },
      });

      expect(result.status).toBe("sent");
      expect(result.messageId).toMatch(/^fake_push_/);
    });
  });
});
