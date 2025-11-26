import type { SegmentQuery } from "@indietix/marketing";

export interface SendPipelineOptions {
  channel: "EMAIL" | "SMS" | "PUSH";
  templateKey: string;
  segmentId?: string;
  inlineFilter?: SegmentQuery;
  payload: Record<string, unknown>;
  schedule?: Date;
  rateLimit?: number;
  utmEnabled?: boolean;
}

export interface SendPipelineResult {
  campaignId: string;
  recipientCount: number;
  queuedCount: number;
  skippedCount: number;
}

export interface Recipient {
  userId: string;
  email: string;
  phone: string | null;
  pushToken: string | null;
}

export interface RateLimitConfig {
  email: number;
  sms: number;
  push: number;
}

export interface CampaignStats {
  queued: number;
  sent: number;
  failed: number;
  openRate: number;
  clickRate: number;
}

export interface UnsubscribeTokenPayload {
  userId: string;
  type: "marketing" | "reminders";
  exp: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  email: 20,
  sms: 10,
  push: 100,
};

export const RETRY_INTERVALS_MS = [
  2 * 60 * 1000,
  10 * 60 * 1000,
  30 * 60 * 1000,
];
