import jwt from "jsonwebtoken";
import { prisma } from "@indietix/db";
import type { UnsubscribeTokenPayload } from "./types";

const UNSUBSCRIBE_SECRET =
  process.env.UNSUBSCRIBE_SECRET || "indietix-unsubscribe-secret";
const TOKEN_EXPIRY_DAYS = 30;

export function generateUnsubscribeToken(
  userId: string,
  type: "marketing" | "reminders"
): string {
  const payload: UnsubscribeTokenPayload = {
    userId,
    type,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  };

  return jwt.sign(payload, UNSUBSCRIBE_SECRET);
}

export function verifyUnsubscribeToken(
  token: string
): UnsubscribeTokenPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      UNSUBSCRIBE_SECRET
    ) as UnsubscribeTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function processUnsubscribe(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const payload = verifyUnsubscribeToken(token);

  if (!payload) {
    return { success: false, error: "Invalid or expired token" };
  }

  const { userId, type } = payload;

  try {
    const updateData =
      type === "marketing" ? { marketing: false } : { reminders: false };

    await prisma.notificationPreference.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        transactional: true,
        reminders: type === "reminders" ? false : true,
        marketing: type === "marketing" ? false : false,
      },
    });

    await prisma.userConsent.create({
      data: {
        userId,
        type: type === "marketing" ? "MARKETING" : "REMINDERS",
        value: false,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function generateUnsubscribeUrl(
  baseUrl: string,
  userId: string,
  type: "marketing" | "reminders"
): string {
  const token = generateUnsubscribeToken(userId, type);
  return `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function generateUnsubscribeFooter(
  baseUrl: string,
  userId: string,
  type: "marketing" | "reminders" = "marketing"
): string {
  const url = generateUnsubscribeUrl(baseUrl, userId, type);
  return `
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
      <p>You are receiving this email because you subscribed to ${type} communications from IndieTix.</p>
      <p><a href="${url}" style="color: #666;">Unsubscribe</a> from ${type} emails.</p>
    </div>
  `;
}
