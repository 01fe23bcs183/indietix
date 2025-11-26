import { prisma, Prisma, KarmaReason } from "@indietix/db";
import {
  getEarningRule,
  REFERRAL_MAX_PER_MONTH,
  STREAK_THRESHOLD,
  STREAK_WINDOW_DAYS,
  LOW_SALES_THRESHOLD_PERCENT,
  LOW_SALES_WINDOW_HOURS,
  EARLY_BIRD_DAYS_BEFORE,
} from "./rules";

export interface EarnResult {
  success: boolean;
  delta: number;
  newBalance: number;
  transactionId?: string;
  held?: boolean;
  error?: string;
  alreadyEarned?: boolean;
}

export interface EarnOptions {
  userId: string;
  reason: KarmaReason;
  refId?: string;
  meta?: Record<string, unknown>;
  checkFraud?: boolean;
}

export async function earnKarma(options: EarnOptions): Promise<EarnResult> {
  const { userId, reason, refId, meta, checkFraud = true } = options;

  const rule = getEarningRule(reason);
  if (!rule) {
    return {
      success: false,
      delta: 0,
      newBalance: 0,
      error: `Unknown earning rule: ${reason}`,
    };
  }

  const existingTransaction = await prisma.karmaTransaction.findUnique({
    where: {
      karma_idempotency_key: {
        userId,
        reason,
        refId: refId ?? "",
      },
    },
  });

  if (existingTransaction) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { karma: true },
    });
    return {
      success: true,
      delta: 0,
      newBalance: user?.karma ?? 0,
      alreadyEarned: true,
    };
  }

  if (rule.requiresAttendance && refId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: refId,
        userId,
        status: "ATTENDED",
      },
    });
    if (!booking) {
      return {
        success: false,
        delta: 0,
        newBalance: 0,
        error: "Attendance verification required",
      };
    }
  }

  if (reason === "REFERRAL" && rule.maxPerMonth) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const referralCount = await prisma.karmaTransaction.count({
      where: {
        userId,
        reason: "REFERRAL",
        createdAt: { gte: startOfMonth },
      },
    });

    if (referralCount >= REFERRAL_MAX_PER_MONTH) {
      return {
        success: false,
        delta: 0,
        newBalance: 0,
        error: `Maximum referral earnings (${REFERRAL_MAX_PER_MONTH}) reached for this month`,
      };
    }
  }

  let held = false;
  if (checkFraud) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    const recentFraudCase = await prisma.fraudCase.findFirst({
      where: {
        booking: { userId },
        status: "OPEN",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentFraudCase) {
      held = true;
    }
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const transaction = await tx.karmaTransaction.create({
      data: {
        userId,
        delta: rule.delta,
        type: "EARN",
        reason,
        refId: refId ?? "",
        meta: meta ? (meta as Prisma.InputJsonValue) : Prisma.JsonNull,
        held,
      },
    });

    let updatedUser;
    if (!held) {
      updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          karma: { increment: rule.delta },
        },
      });
    } else {
      updatedUser = await tx.user.findUnique({
        where: { id: userId },
      });
    }

    return {
      transaction,
      newBalance: updatedUser?.karma ?? 0,
    };
  });

  return {
    success: true,
    delta: held ? 0 : rule.delta,
    newBalance: result.newBalance,
    transactionId: result.transaction.id,
    held,
  };
}

export async function checkAndAwardStreak(userId: string): Promise<EarnResult | null> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - STREAK_WINDOW_DAYS);

  const attendanceCount = await prisma.booking.count({
    where: {
      userId,
      status: "ATTENDED",
      attendedAt: { gte: windowStart },
    },
  });

  if (attendanceCount < STREAK_THRESHOLD) {
    return null;
  }

  const month = new Date().toISOString().slice(0, 7);
  const streakRefId = `streak-${month}`;

  return earnKarma({
    userId,
    reason: "STREAK",
    refId: streakRefId,
    meta: { attendanceCount, month },
  });
}

export async function checkEarlyBird(
  userId: string,
  bookingId: string,
  eventDate: Date
): Promise<EarnResult | null> {
  const now = new Date();
  const daysUntilEvent = Math.floor(
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilEvent < EARLY_BIRD_DAYS_BEFORE) {
    return null;
  }

  return earnKarma({
    userId,
    reason: "EARLY_BIRD",
    refId: bookingId,
    meta: { daysUntilEvent },
  });
}

export async function checkLowSalesHelp(
  userId: string,
  bookingId: string,
  eventId: string
): Promise<EarnResult | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      date: true,
      totalSeats: true,
      bookedSeats: true,
    },
  });

  if (!event) {
    return null;
  }

  const hoursUntilEvent =
    (event.date.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilEvent > LOW_SALES_WINDOW_HOURS) {
    return null;
  }

  const capacityPercent = (event.bookedSeats / event.totalSeats) * 100;

  if (capacityPercent >= LOW_SALES_THRESHOLD_PERCENT) {
    return null;
  }

  return earnKarma({
    userId,
    reason: "LOW_SALES_HELP",
    refId: bookingId,
    meta: { capacityPercent, hoursUntilEvent },
  });
}

export async function releaseHeldKarma(transactionId: string): Promise<boolean> {
  const transaction = await prisma.karmaTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || !transaction.held) {
    return false;
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.karmaTransaction.update({
      where: { id: transactionId },
      data: { held: false },
    });

    await tx.user.update({
      where: { id: transaction.userId },
      data: {
        karma: { increment: transaction.delta },
      },
    });
  });

  return true;
}

export async function cancelHeldKarma(transactionId: string): Promise<boolean> {
  const transaction = await prisma.karmaTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || !transaction.held) {
    return false;
  }

  await prisma.karmaTransaction.delete({
    where: { id: transactionId },
  });

  return true;
}
