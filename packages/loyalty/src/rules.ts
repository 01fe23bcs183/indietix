import type { KarmaReason } from "@indietix/db";

export interface EarningRule {
  reason: KarmaReason;
  delta: number;
  description: string;
  requiresAttendance?: boolean;
  maxPerMonth?: number;
  onePerRef?: boolean;
}

export const EARNING_RULES: Record<string, EarningRule> = {
  BOOK: {
    reason: "BOOK",
    delta: 10,
    description: "Karma earned for booking a ticket",
    onePerRef: true,
  },
  ATTEND: {
    reason: "ATTEND",
    delta: 50,
    description: "Karma earned for attending an event (check-in verified)",
    onePerRef: true,
  },
  REFERRAL: {
    reason: "REFERRAL",
    delta: 100,
    description: "Karma earned when a referred friend makes their first booking",
    maxPerMonth: 5,
    onePerRef: true,
  },
  REVIEW: {
    reason: "REVIEW",
    delta: 20,
    description: "Karma earned for posting a review after attending",
    requiresAttendance: true,
    onePerRef: true,
  },
  EARLY_BIRD: {
    reason: "EARLY_BIRD",
    delta: 30,
    description: "Karma earned for booking 7+ days before the event",
    onePerRef: true,
  },
  PROFILE: {
    reason: "PROFILE",
    delta: 50,
    description: "Karma earned for completing your profile",
    onePerRef: true,
  },
  SHARE: {
    reason: "SHARE",
    delta: 10,
    description: "Karma earned for sharing an event on social media",
    onePerRef: true,
  },
  STREAK: {
    reason: "STREAK",
    delta: 200,
    description: "Karma earned for attending 5 shows in a month",
    onePerRef: true,
  },
  LOW_SALES_HELP: {
    reason: "LOW_SALES_HELP",
    delta: 40,
    description: "Karma earned for booking a show with <50% capacity 24h before",
    onePerRef: true,
  },
};

export function getEarningRule(reason: KarmaReason): EarningRule | undefined {
  return EARNING_RULES[reason];
}

export function getEarningDelta(reason: KarmaReason): number {
  const rule = getEarningRule(reason);
  return rule?.delta ?? 0;
}

export const STREAK_THRESHOLD = 5;
export const STREAK_WINDOW_DAYS = 30;

export const LOW_SALES_THRESHOLD_PERCENT = 50;
export const LOW_SALES_WINDOW_HOURS = 24;

export const EARLY_BIRD_DAYS_BEFORE = 7;

export const REFERRAL_MAX_PER_MONTH = 5;
