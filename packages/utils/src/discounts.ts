/**
 * Discount and promo code logic for IndieTix marketing features
 *
 * Rules:
 * - No promo stacking allowed
 * - Discounts apply to subtotal BEFORE fees
 * - Fees are computed on the discounted subtotal
 */

export interface PromoCode {
  id: string;
  code: string;
  type: "PERCENT" | "FLAT";
  value: number;
  startAt: Date | null;
  endAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  minPrice: number | null;
  organizerId: string | null;
  applicableEvents: string[];
  applicableCategories: string[];
  applicableCities: string[];
  active: boolean;
}

export interface ApplyPromoResult {
  valid: boolean;
  discountedSubtotal: number;
  discountAmount: number;
  reason?: string;
}

export interface ValidatePromoParams {
  code: PromoCode;
  basePrice: number;
  qty: number;
  now: Date;
  eventId?: string;
  eventCategory?: string;
  eventCity?: string;
  userUsageCount?: number;
}

/**
 * Validate promo code against all constraints
 */
export function validatePromoCode(params: ValidatePromoParams): {
  valid: boolean;
  reason?: string;
} {
  const {
    code,
    basePrice,
    qty,
    now,
    eventId,
    eventCategory,
    eventCity,
    userUsageCount,
  } = params;

  if (!code.active) {
    return { valid: false, reason: "Promo code is no longer active" };
  }

  if (code.startAt && now < code.startAt) {
    return { valid: false, reason: "Promo code is not yet valid" };
  }

  if (code.endAt && now > code.endAt) {
    return { valid: false, reason: "Promo code has expired" };
  }

  if (code.usageLimit !== null && code.usageCount >= code.usageLimit) {
    return { valid: false, reason: "Promo code usage limit reached" };
  }

  if (
    code.perUserLimit !== null &&
    userUsageCount !== undefined &&
    userUsageCount >= code.perUserLimit
  ) {
    return {
      valid: false,
      reason: "You have reached the usage limit for this promo code",
    };
  }

  const subtotal = basePrice * qty;
  if (code.minPrice !== null && subtotal < code.minPrice) {
    return {
      valid: false,
      reason: `Minimum purchase amount is ₹${code.minPrice / 100}`,
    };
  }

  if (
    eventId &&
    code.applicableEvents.length > 0 &&
    !code.applicableEvents.includes(eventId)
  ) {
    return {
      valid: false,
      reason: "Promo code is not applicable to this event",
    };
  }

  if (
    eventCategory &&
    code.applicableCategories.length > 0 &&
    !code.applicableCategories.includes(eventCategory)
  ) {
    return {
      valid: false,
      reason: "Promo code is not applicable to this event category",
    };
  }

  if (
    eventCity &&
    code.applicableCities.length > 0 &&
    !code.applicableCities.includes(eventCity)
  ) {
    return {
      valid: false,
      reason: "Promo code is not applicable to events in this city",
    };
  }

  return { valid: true };
}

/**
 * Apply promo code discount to base price
 * Returns discounted subtotal (before fees)
 */
export function applyPromo(params: ValidatePromoParams): ApplyPromoResult {
  const { code, basePrice, qty } = params;

  const validation = validatePromoCode(params);
  if (!validation.valid) {
    return {
      valid: false,
      discountedSubtotal: basePrice * qty,
      discountAmount: 0,
      reason: validation.reason,
    };
  }

  const subtotal = basePrice * qty;
  let discountAmount = 0;

  if (code.type === "PERCENT") {
    discountAmount = Math.round((subtotal * code.value) / 100);
  } else if (code.type === "FLAT") {
    discountAmount = Math.min(code.value, subtotal); // Can't discount more than subtotal
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  return {
    valid: true,
    discountedSubtotal,
    discountAmount,
  };
}

/**
 * Calculate effective price for an event considering active price phases
 */
export interface PricePhase {
  id: string;
  name: string;
  startsAt: Date | null;
  endsAt: Date | null;
  maxSeats: number | null;
  price: number;
}

export interface EffectivePriceResult {
  effectivePrice: number;
  basePrice: number;
  activePhase: PricePhase | null;
  message?: string;
}

export function getEffectivePrice(
  basePrice: number,
  phases: PricePhase[],
  bookedSeats: number,
  now: Date
): EffectivePriceResult {
  const sortedPhases = [...phases].sort((a, b) => {
    const aHasTime = a.startsAt !== null || a.endsAt !== null;
    const bHasTime = b.startsAt !== null || b.endsAt !== null;

    if (aHasTime && !bHasTime) return -1;
    if (!aHasTime && bHasTime) return 1;

    if (a.startsAt && b.startsAt) {
      return a.startsAt.getTime() - b.startsAt.getTime();
    }

    return 0;
  });

  for (const phase of sortedPhases) {
    let isActive = true;

    if (phase.startsAt && now < phase.startsAt) {
      isActive = false;
    }
    if (phase.endsAt && now > phase.endsAt) {
      isActive = false;
    }

    if (phase.maxSeats !== null && bookedSeats >= phase.maxSeats) {
      isActive = false;
    }

    if (isActive) {
      let message: string | undefined;
      if (phase.endsAt) {
        const timeRemaining = phase.endsAt.getTime() - now.getTime();
        const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.floor(
          (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );

        if (daysRemaining > 0) {
          message = `${phase.name} ends in ${daysRemaining}d ${hoursRemaining}h`;
        } else if (hoursRemaining > 0) {
          message = `${phase.name} ends in ${hoursRemaining}h`;
        } else {
          message = `${phase.name} ends soon`;
        }
      } else if (phase.maxSeats !== null) {
        const seatsRemaining = phase.maxSeats - bookedSeats;
        message = `${phase.name} - ${seatsRemaining} seats left`;
      }

      return {
        effectivePrice: phase.price,
        basePrice,
        activePhase: phase,
        message,
      };
    }
  }

  return {
    effectivePrice: basePrice,
    basePrice,
    activePhase: null,
  };
}
