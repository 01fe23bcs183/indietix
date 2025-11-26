import type { PromoCode } from "@prisma/client";

export interface ApplyPromoResult {
  success: boolean;
  discountedSubtotal?: number;
  discountAmount?: number;
  reason?: string;
}

export interface ValidatePromoParams {
  code: PromoCode;
  basePrice: number;
  quantity: number;
  now: Date;
  eventId?: string;
  eventCategory?: string;
  eventCity?: string;
  userId?: string;
  userUsageCount?: number;
}

/**
 * Validates if a promo code can be applied based on constraints
 */
export function validatePromoCode(params: ValidatePromoParams): {
  valid: boolean;
  reason?: string;
} {
  const {
    code,
    basePrice,
    now,
    eventId,
    eventCategory,
    eventCity,
    userId,
    userUsageCount = 0,
  } = params;

  if (!code.active) {
    return { valid: false, reason: "Promo code is inactive" };
  }

  if (code.startAt && now < code.startAt) {
    return { valid: false, reason: "Promo code not yet valid" };
  }

  if (code.endAt && now > code.endAt) {
    return { valid: false, reason: "Promo code has expired" };
  }

  if (code.minPrice && basePrice < code.minPrice) {
    return {
      valid: false,
      reason: `Minimum ticket price of ₹${code.minPrice / 100} required`,
    };
  }

  if (code.perUserLimit && userId && userUsageCount >= code.perUserLimit) {
    return {
      valid: false,
      reason: `You have reached the usage limit for this promo code`,
    };
  }

  if (
    code.applicableEvents.length > 0 &&
    eventId &&
    !code.applicableEvents.includes(eventId)
  ) {
    return {
      valid: false,
      reason: "Promo code not applicable to this event",
    };
  }

  if (
    code.applicableCategories.length > 0 &&
    eventCategory &&
    !code.applicableCategories.includes(eventCategory)
  ) {
    return {
      valid: false,
      reason: "Promo code not applicable to this event category",
    };
  }

  if (
    code.applicableCities.length > 0 &&
    eventCity &&
    !code.applicableCities.includes(eventCity)
  ) {
    return { valid: false, reason: "Promo code not applicable to this city" };
  }

  return { valid: true };
}

/**
 * Calculates the discount amount based on promo code type
 */
export function calculateDiscount(code: PromoCode, subtotal: number): number {
  if (code.type === "PERCENT") {
    const discountPercent = code.value / 100;
    return Math.round(subtotal * discountPercent);
  } else {
    return Math.min(code.value, subtotal);
  }
}

/**
 * Applies a promo code to calculate discounted subtotal
 * Returns the discounted subtotal and discount amount
 */
export function applyPromo(params: ValidatePromoParams): ApplyPromoResult {
  const { code, basePrice, quantity } = params;

  const validation = validatePromoCode(params);
  if (!validation.valid) {
    return {
      success: false,
      reason: validation.reason,
    };
  }

  const subtotal = basePrice * quantity;

  const discountAmount = calculateDiscount(code, subtotal);

  const discountedSubtotal = subtotal - discountAmount;

  return {
    success: true,
    discountedSubtotal,
    discountAmount,
  };
}

/**
 * Formats promo code for display
 */
export function formatPromoCode(code: PromoCode): string {
  if (code.type === "PERCENT") {
    return `${code.value}% OFF`;
  } else {
    return `₹${code.value / 100} OFF`;
  }
}
