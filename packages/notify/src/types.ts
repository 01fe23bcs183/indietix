/* eslint-disable no-unused-vars */
export interface EmailProvider {
  kind: "resend" | "fake-email";
  sendEmail: (params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<EmailResult>;
}

export interface SmsProvider {
  kind: "twilio" | "fake-sms";
  sendSms: (params: { to: string; body: string }) => Promise<SmsResult>;
}

export interface PushProvider {
  kind: "expo" | "fake-push";
  sendPush: (params: {
    toToken: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => Promise<PushResult>;
}
/* eslint-enable no-unused-vars */

export interface EmailResult {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
}

export interface SmsResult {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
}

export interface PushResult {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
}

export interface TemplateData {
  [key: string]: unknown;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SmsTemplate {
  body: string;
}

export interface PushTemplate {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type NotificationChannel = "EMAIL" | "SMS" | "PUSH";
export type NotificationCategory = "TRANSACTIONAL" | "REMINDERS" | "MARKETING";

export interface SendNotificationParams {
  userId?: string;
  type: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  to: string;
  payload: TemplateData;
  scheduledAt?: Date;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  transactional: boolean;
  reminders: boolean;
  marketing: boolean;
}
