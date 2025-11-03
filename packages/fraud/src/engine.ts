import { prisma } from "@indietix/db";

export interface BookingAttemptSignals {
  bookingId?: string;
  userId?: string;
  eventId: string;
  ip?: string;
  userAgent?: string;
  city?: string;
  emailDomain?: string;
  phonePrefix?: string;
  qty: number;
  eventPrice: number;
  userSignupAgeDays?: number;
}

export interface EvaluationContext {
  signals: BookingAttemptSignals;
  velocityByIp: number;
  velocityByUser: number;
  blacklistedEmails: Set<string>;
  blacklistedPhones: Set<string>;
  blacklistedIps: Set<string>;
  failedPaymentsByUser: number;
}

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  weight: number;
  action: "FLAG" | "REJECT" | "REVIEW";
}

export interface EvaluationResult {
  riskScore: number;
  matches: RuleMatch[];
  action?: "FLAG" | "REJECT" | "REVIEW";
  riskTags: string[];
}

export interface RuleDefinition {
  type: string;
  [key: string]: unknown;
}

export async function buildContext(
  signals: BookingAttemptSignals
): Promise<EvaluationContext> {
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  const velocityByIp = signals.ip
    ? await prisma.bookingAttempt.count({
        where: {
          ip: signals.ip,
          createdAt: { gte: tenMinutesAgo },
        },
      })
    : 0;

  const velocityByUser = signals.userId
    ? await prisma.bookingAttempt.count({
        where: {
          userId: signals.userId,
          createdAt: { gte: tenMinutesAgo },
        },
      })
    : 0;

  const blacklists = await prisma.fraudList.findMany({
    select: { type: true, value: true },
  });

  const blacklistedEmails = new Set<string>(
    blacklists.filter((b) => b.type === "EMAIL").map((b) => b.value)
  );
  const blacklistedPhones = new Set<string>(
    blacklists.filter((b) => b.type === "PHONE").map((b) => b.value)
  );
  const blacklistedIps = new Set<string>(
    blacklists.filter((b) => b.type === "IP").map((b) => b.value)
  );

  const failedPaymentsByUser = signals.userId
    ? await prisma.bookingAttempt.count({
        where: {
          userId: signals.userId,
          result: "failed",
          createdAt: { gte: tenMinutesAgo },
        },
      })
    : 0;

  return {
    signals,
    velocityByIp,
    velocityByUser,
    blacklistedEmails,
    blacklistedPhones,
    blacklistedIps,
    failedPaymentsByUser,
  };
}

export function evaluateRule(
  definition: RuleDefinition,
  context: EvaluationContext
): boolean {
  const { type } = definition;

  switch (type) {
    case "velocity_ip": {
      const threshold = (definition.threshold as number) || 5;
      return context.velocityByIp >= threshold;
    }

    case "velocity_user": {
      const threshold = (definition.threshold as number) || 5;
      return context.velocityByUser >= threshold;
    }

    case "email_domain_blacklist": {
      if (!context.signals.emailDomain) return false;
      return context.blacklistedEmails.has(context.signals.emailDomain);
    }

    case "phone_prefix_blacklist": {
      if (!context.signals.phonePrefix) return false;
      return context.blacklistedPhones.has(context.signals.phonePrefix);
    }

    case "ip_blacklist": {
      if (!context.signals.ip) return false;
      return context.blacklistedIps.has(context.signals.ip);
    }

    case "qty_threshold": {
      const threshold = (definition.threshold as number) || 10;
      return context.signals.qty >= threshold;
    }

    case "high_value_new_user": {
      const priceThreshold = (definition.priceThreshold as number) || 5000;
      const ageThreshold = (definition.ageThreshold as number) || 7;
      return (
        context.signals.eventPrice >= priceThreshold &&
        (context.signals.userSignupAgeDays ?? 999) < ageThreshold
      );
    }

    case "repeated_failed_payments": {
      const threshold = (definition.threshold as number) || 3;
      return context.failedPaymentsByUser >= threshold;
    }

    default:
      return false;
  }
}

export async function evaluate(
  signals: BookingAttemptSignals
): Promise<EvaluationResult> {
  const context = await buildContext(signals);

  const rules = await prisma.fraudRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "desc" },
  });

  const matches: RuleMatch[] = [];
  let totalWeight = 0;

  for (const rule of rules) {
    const definition = rule.definition as RuleDefinition;
    const isMatch = evaluateRule(definition, context);

    if (isMatch) {
      matches.push({
        ruleId: rule.id,
        ruleName: rule.name,
        weight: rule.weight,
        action: rule.action,
      });
      totalWeight += rule.weight;
    }
  }

  const riskScore = Math.min(100, totalWeight);

  const rejectMatches = matches.filter((m) => m.action === "REJECT");
  const reviewMatches = matches.filter((m) => m.action === "REVIEW");
  const flagMatches = matches.filter((m) => m.action === "FLAG");

  let action: "FLAG" | "REJECT" | "REVIEW" | undefined;
  if (rejectMatches.length > 0) {
    action = "REJECT";
  } else if (reviewMatches.length > 0) {
    action = "REVIEW";
  } else if (flagMatches.length > 0) {
    action = "FLAG";
  }

  const riskTags = matches.map((m) => m.ruleName);

  return {
    riskScore,
    matches,
    action,
    riskTags,
  };
}
