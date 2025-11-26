import { prisma, Prisma } from "@indietix/db";
import { getReward, Reward } from "./rewards";

export interface SpendResult {
  success: boolean;
  delta: number;
  newBalance: number;
  transactionId?: string;
  rewardGrantId?: string;
  promoCode?: string;
  error?: string;
}

export interface RedeemOptions {
  userId: string;
  rewardKey: string;
}

function generatePromoCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "KARMA-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function redeemReward(options: RedeemOptions): Promise<SpendResult> {
  const { userId, rewardKey } = options;

  const reward = getReward(rewardKey);
  if (!reward) {
    return {
      success: false,
      delta: 0,
      newBalance: 0,
      error: `Unknown reward: ${rewardKey}`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { karma: true },
  });

  if (!user) {
    return {
      success: false,
      delta: 0,
      newBalance: 0,
      error: "User not found",
    };
  }

  if (user.karma < reward.cost) {
    return {
      success: false,
      delta: 0,
      newBalance: user.karma,
      error: `Insufficient karma. Need ${reward.cost}, have ${user.karma}`,
    };
  }

  if (reward.permanent) {
    const existingGrant = await prisma.rewardGrant.findFirst({
      where: {
        userId,
        rewardKey,
        status: { in: ["ACTIVE", "USED"] },
      },
    });

    if (existingGrant) {
      return {
        success: false,
        delta: 0,
        newBalance: user.karma,
        error: "You already have this permanent reward",
      };
    }
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const transaction = await tx.karmaTransaction.create({
      data: {
        userId,
        delta: -reward.cost,
        type: "SPEND",
        reason: "REWARD_REDEEM",
        refId: rewardKey,
        meta: { rewardName: reward.name },
      },
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        karma: { decrement: reward.cost },
      },
    });

    let promoCodeRecord = null;
    let promoCode: string | undefined;

    if (reward.type === "PROMO_CODE") {
      promoCode = generatePromoCode();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      promoCodeRecord = await tx.promoCode.create({
        data: {
          code: promoCode,
          type: reward.promoType === "PERCENT" ? "PERCENT" : "FLAT",
          value: reward.promoValue ?? 0,
          startAt: new Date(),
          endAt: expiresAt,
          usageLimit: 1,
          perUserLimit: 1,
          minPrice: reward.maxEventPrice ? 0 : undefined,
          active: true,
        },
      });
    }

    const rewardGrant = await tx.rewardGrant.create({
      data: {
        userId,
        rewardKey,
        status: reward.type === "PROMO_CODE" ? "ACTIVE" : "ACTIVE",
        promoCodeId: promoCodeRecord?.id,
        meta: {
          rewardName: reward.name,
          rewardType: reward.type,
          promoCode,
        },
        expiresAt: reward.permanent ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    if (reward.type === "PERK" || reward.type === "STATUS") {
      const existingPerks = await tx.userPerks.findUnique({
        where: { userId },
      });

      if (existingPerks) {
        const flags = existingPerks.flags.includes(reward.perkFlag!)
          ? existingPerks.flags
          : [...existingPerks.flags, reward.perkFlag!];
        
        await tx.userPerks.update({
          where: { userId },
          data: { flags },
        });
      } else {
        await tx.userPerks.create({
          data: {
            userId,
            flags: [reward.perkFlag!],
          },
        });
      }
    }

    return {
      transaction,
      rewardGrant,
      newBalance: updatedUser.karma,
      promoCode,
    };
  });

  return {
    success: true,
    delta: -reward.cost,
    newBalance: result.newBalance,
    transactionId: result.transaction.id,
    rewardGrantId: result.rewardGrant.id,
    promoCode: result.promoCode,
  };
}

export async function adminAdjustKarma(
  userId: string,
  delta: number,
  reason: string,
  adminId: string
): Promise<SpendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { karma: true },
  });

  if (!user) {
    return {
      success: false,
      delta: 0,
      newBalance: 0,
      error: "User not found",
    };
  }

  if (user.karma + delta < 0) {
    return {
      success: false,
      delta: 0,
      newBalance: user.karma,
      error: "Adjustment would result in negative karma balance",
    };
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const transaction = await tx.karmaTransaction.create({
      data: {
        userId,
        delta,
        type: "ADJUST",
        reason: "ADMIN_ADJUST",
        refId: `admin-${adminId}-${Date.now()}`,
        meta: { reason, adminId },
      },
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        karma: { increment: delta },
      },
    });

    return {
      transaction,
      newBalance: updatedUser.karma,
    };
  });

  return {
    success: true,
    delta,
    newBalance: result.newBalance,
    transactionId: result.transaction.id,
  };
}
