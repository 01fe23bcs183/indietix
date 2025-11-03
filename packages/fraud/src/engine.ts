import { PrismaClient } from "@indietix/db";

export interface BookingAttemptInput {
  id?: string;
  bookingId?: string;
  userId?: string;
  eventId: string;
  ip?: string;
  userAgent?: string;
  city?: string;
  emailDomain?: string;
  phonePrefix?: string;
  qty: number;
  paymentProvider?: string;
  result?: string;
  paidAt?: Date;
  razorpayOrderId?: string;
}

export interface EvaluationContext {
  eventPrice?: number;
  userSignupDate?: Date;
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

interface RuleDefinition {
  type: string;
  [key: string]: any;
}

export async function evaluate(
  prisma: PrismaClient,
  attempt: BookingAttemptInput,
  context: EvaluationContext = {}
): Promise<EvaluationResult> {
  const rules = await prisma.fraudRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "desc" },
  });

  const matches: RuleMatch[] = [];
  const riskTags: string[] = [];

  for (const rule of rules) {
    const definition = rule.definition as RuleDefinition;
    const isMatch = await evaluateRule(prisma, definition, attempt, context);

    if (isMatch) {
      matches.push({
        ruleId: rule.id,
        ruleName: rule.name,
        weight: rule.weight,
        action: rule.action as "FLAG" | "REJECT" | "REVIEW",
      });

      const tag = getRiskTag(definition);
      if (tag && !riskTags.includes(tag)) {
        riskTags.push(tag);
      }
    }
  }

  const totalWeight = matches.reduce((sum, match) => sum + match.weight, 0);
  const riskScore = Math.min(100, totalWeight);

  let action: "FLAG" | "REJECT" | "REVIEW" | undefined;
  for (const match of matches) {
    if (match.action === "REJECT") {
      action = "REJECT";
      break;
    } else if (match.action === "REVIEW" && action !== "REJECT") {
      action = "REVIEW";
    } else if (match.action === "FLAG" && !action) {
      action = "FLAG";
    }
  }

  return {
    riskScore,
    matches,
    action,
    riskTags,
  };
}

async function evaluateRule(
  prisma: PrismaClient,
  definition: RuleDefinition,
  attempt: BookingAttemptInput,
  context: EvaluationContext
): Promise<boolean> {
  switch (definition.type) {
    case "velocity_ip":
      return evaluateVelocityIP(prisma, definition, attempt);
    case "velocity_user":
      return evaluateVelocityUser(prisma, definition, attempt);
    case "email_domain_blacklist":
      return evaluateEmailDomainBlacklist(prisma, attempt);
    case "phone_prefix_blacklist":
      return evaluatePhonePrefixBlacklist(prisma, attempt);
    case "ip_blacklist":
      return evaluateIPBlacklist(prisma, attempt);
    case "qty_threshold":
      return evaluateQtyThreshold(definition, attempt);
    case "high_value_new_user":
      return evaluateHighValueNewUser(definition, attempt, context);
    case "repeated_failed_payments":
      return evaluateRepeatedFailedPayments(prisma, definition, attempt);
    default:
      return false;
  }
}

async function evaluateVelocityIP(
  prisma: PrismaClient,
  definition: RuleDefinition,
  attempt: BookingAttemptInput
): Promise<boolean> {
  if (!attempt.ip) return false;

  const minutes = definition.last_minutes || 10;
  const threshold = definition.threshold || 5;

  const since = new Date(Date.now() - minutes * 60 * 1000);

  const count = await prisma.bookingAttempt.count({
    where: {
      ip: attempt.ip,
      createdAt: { gte: since },
    },
  });

  return count >= threshold;
}

async function evaluateVelocityUser(
  prisma: PrismaClient,
  definition: RuleDefinition,
  attempt: BookingAttemptInput
): Promise<boolean> {
  if (!attempt.userId) return false;

  const minutes = definition.last_minutes || 10;
  const threshold = definition.threshold || 5;

  const since = new Date(Date.now() - minutes * 60 * 1000);

  const count = await prisma.bookingAttempt.count({
    where: {
      userId: attempt.userId,
      createdAt: { gte: since },
    },
  });

  return count >= threshold;
}

async function evaluateEmailDomainBlacklist(
  prisma: PrismaClient,
  attempt: BookingAttemptInput
): Promise<boolean> {
  if (!attempt.emailDomain) return false;

  const entry = await prisma.fraudList.findFirst({
    where: {
      type: "EMAIL",
      value: attempt.emailDomain,
    },
  });

  return !!entry;
}

async function evaluatePhonePrefixBlacklist(
  prisma: PrismaClient,
  attempt: BookingAttemptInput
): Promise<boolean> {
  if (!attempt.phonePrefix) return false;

  const entry = await prisma.fraudList.findFirst({
    where: {
      type: "PHONE",
      value: attempt.phonePrefix,
    },
  });

  return !!entry;
}

async function evaluateIPBlacklist(
  prisma: PrismaClient,
  attempt: BookingAttemptInput
): Promise<boolean> {
  if (!attempt.ip) return false;

  const entry = await prisma.fraudList.findFirst({
    where: {
      type: "IP",
      value: attempt.ip,
    },
  });

  return !!entry;
}

function evaluateQtyThreshold(
  definition: RuleDefinition,
  attempt: BookingAttemptInput
): boolean {
  const threshold = definition.threshold || 10;
  return attempt.qty >= threshold;
}

function evaluateHighValueNewUser(
  definition: RuleDefinition,
  attempt: BookingAttemptInput,
  context: EvaluationContext
): boolean {
  const minPrice = definition.min_price || 5000; // in paise
  const maxSignupAgeDays = definition.max_signup_age_days || 7;

  if (!context.eventPrice || !context.userSignupDate) return false;

  const eventPrice = context.eventPrice;
  const signupAgeDays =
    (Date.now() - context.userSignupDate.getTime()) / (1000 * 60 * 60 * 24);

  return eventPrice >= minPrice && signupAgeDays < maxSignupAgeDays;
}

async function evaluateRepeatedFailedPayments(
  prisma: PrismaClient,
  definition: RuleDefinition,
  attempt: BookingAttemptInput
): Promise<boolean> {
  const minutes = definition.last_minutes || 30;
  const threshold = definition.threshold || 3;

  const since = new Date(Date.now() - minutes * 60 * 1000);

  const whereClause: any = {
    createdAt: { gte: since },
    result: "failed",
  };

  if (attempt.userId) {
    whereClause.userId = attempt.userId;
  } else if (attempt.ip) {
    whereClause.ip = attempt.ip;
  } else {
    return false;
  }

  const count = await prisma.bookingAttempt.count({
    where: whereClause,
  });

  return count >= threshold;
}

function getRiskTag(definition: RuleDefinition): string | null {
  switch (definition.type) {
    case "velocity_ip":
      return "velocity_ip";
    case "velocity_user":
      return "velocity_user";
    case "email_domain_blacklist":
      return "blacklist_email";
    case "phone_prefix_blacklist":
      return "blacklist_phone";
    case "ip_blacklist":
      return "blacklist_ip";
    case "qty_threshold":
      return "high_quantity";
    case "high_value_new_user":
      return "high_value_new_user";
    case "repeated_failed_payments":
      return "repeated_failures";
    default:
      return null;
  }
}
