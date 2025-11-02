import { FakeEmailProvider } from "./email.fake";
import { ResendEmailProvider } from "./email.resend";
import { FakeSmsProvider } from "./sms.fake";
import { TwilioSmsProvider } from "./sms.twilio";
import { FakePushProvider } from "./push.fake";
import { ExpoPushProvider } from "./push.expo";
import type { EmailProvider, SmsProvider, PushProvider } from "../types";

export * from "./email.fake";
export * from "./email.resend";
export * from "./sms.fake";
export * from "./sms.twilio";
export * from "./push.fake";
export * from "./push.expo";

export function getEmailProvider(): EmailProvider {
  const isTest = process.env.NODE_ENV === "test";
  const resendApiKey = process.env.RESEND_API_KEY;

  if (isTest || !resendApiKey) {
    return new FakeEmailProvider();
  }

  return new ResendEmailProvider(resendApiKey);
}

export function getSmsProvider(): SmsProvider {
  const isTest = process.env.NODE_ENV === "test";
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

  if (isTest || !twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    return new FakeSmsProvider();
  }

  return new TwilioSmsProvider(
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber
  );
}

export function getPushProvider(): PushProvider {
  const isTest = process.env.NODE_ENV === "test";

  if (isTest) {
    return new FakePushProvider();
  }

  try {
    return new ExpoPushProvider();
  } catch (error) {
    console.warn("Expo Push not available, using fake provider:", error);
    return new FakePushProvider();
  }
}
