/* eslint-disable no-unused-vars */
export const FEES = {
  paymentGateway: 2,
  serverMaintenance: 2,
  platformSupport: 10,
};

export const GST_RATE = 0.18;

interface PrismaClient {
  platformSetting: {
    findUnique: (args: {
      where: { key: string };
    }) => Promise<{ key: string; value: unknown } | null>;
  };
}

export async function getFeesFromSettings(prisma: PrismaClient) {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "fees" },
    });
    return setting?.value || FEES;
  } catch {
    return FEES;
  }
}

export async function getGstRateFromSettings(prisma: PrismaClient) {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "gstRate" },
    });
    return setting?.value || GST_RATE;
  } catch {
    return GST_RATE;
  }
}

export interface PricingBreakdown {
  subtotal: number;
  fees: number;
  gst: number;
  total: number;
  breakdown: {
    paymentGateway: number;
    serverMaintenance: number;
    platformSupport: number;
  };
}

export interface BookingAmounts {
  ticketPrice: number;
  seats: number;
  subtotal: number;
  convenienceFee: number;
  platformFee: number;
  gst: number;
  finalAmount: number;
  breakdown: {
    paymentGateway: number;
    serverMaintenance: number;
    platformSupport: number;
  };
}

export function computeTotals(basePrice: number): PricingBreakdown {
  const subtotal = basePrice;
  const fees =
    FEES.paymentGateway + FEES.serverMaintenance + FEES.platformSupport;
  const gst = Math.round(fees * GST_RATE);
  const total = subtotal + fees + gst;

  return {
    subtotal,
    fees,
    gst,
    total,
    breakdown: {
      paymentGateway: FEES.paymentGateway,
      serverMaintenance: FEES.serverMaintenance,
      platformSupport: FEES.platformSupport,
    },
  };
}

export function computeBookingAmounts(
  ticketPrice: number,
  quantity: number
): BookingAmounts {
  const subtotal = ticketPrice * quantity;
  const feesPerTicket =
    FEES.paymentGateway + FEES.serverMaintenance + FEES.platformSupport;
  const totalFees = feesPerTicket * quantity;
  const gst = Math.round(totalFees * GST_RATE);
  const finalAmount = subtotal + totalFees + gst;

  return {
    ticketPrice,
    seats: quantity,
    subtotal,
    convenienceFee: feesPerTicket * quantity,
    platformFee: totalFees,
    gst,
    finalAmount,
    breakdown: {
      paymentGateway: FEES.paymentGateway * quantity,
      serverMaintenance: FEES.serverMaintenance * quantity,
      platformSupport: FEES.platformSupport * quantity,
    },
  };
}
