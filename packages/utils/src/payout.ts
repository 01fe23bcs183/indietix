export interface PayoutBreakdown {
  gmv: number;
  refunds: number;
  feesKept: number;
  netPayable: number;
  eventCount: number;
  bookingCount: number;
  refundCount: number;
}

export interface PayoutCalculationParams {
  organizerId: string;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Compute payout amount for an organizer for a given period
 * Formula: GMV_confirmed - refunds_confirmed - fees_kept = net_payable
 * 
 * Only considers CONFIRMED bookings within the specified window
 * REFUNDED bookings subtract appropriately
 */
export async function computePayoutAmount(
  params: PayoutCalculationParams,
  prisma: any
): Promise<PayoutBreakdown> {
  const { organizerId, periodStart, periodEnd } = params;

  const events = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true },
  });

  const eventIds = events.map((e: { id: string }) => e.id);

  if (eventIds.length === 0) {
    return {
      gmv: 0,
      refunds: 0,
      feesKept: 0,
      netPayable: 0,
      eventCount: 0,
      bookingCount: 0,
      refundCount: 0,
    };
  }

  const confirmedBookings = await prisma.booking.findMany({
    where: {
      eventId: { in: eventIds },
      status: "CONFIRMED",
      paymentStatus: "COMPLETED",
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      ticketPrice: true,
      seats: true,
      convenienceFee: true,
      platformFee: true,
    },
  });

  const refundedBookings = await prisma.booking.findMany({
    where: {
      eventId: { in: eventIds },
      status: "CANCELLED",
      paymentStatus: "REFUNDED",
      cancelledAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      refunds: {
        where: {
          status: "SUCCEEDED",
        },
      },
    },
  });

  const gmv = confirmedBookings.reduce((sum: number, booking: any) => {
    return sum + booking.ticketPrice * booking.seats;
  }, 0);

  const refunds = refundedBookings.reduce((sum: number, booking: any) => {
    const successfulRefunds = booking.refunds.filter(
      (r: { status: string }) => r.status === "SUCCEEDED"
    );
    return (
      sum +
      successfulRefunds.reduce((refundSum: number, r: { amount: number }) => refundSum + r.amount, 0)
    );
  }, 0);

  const feesKept = confirmedBookings.reduce((sum: number, booking: any) => {
    return sum + booking.convenienceFee + booking.platformFee;
  }, 0);

  const netPayable = gmv - refunds - feesKept;

  const uniqueEventIds = new Set(
    confirmedBookings.map((b: any) => b.eventId)
  );

  return {
    gmv,
    refunds,
    feesKept,
    netPayable: Math.max(0, netPayable), // Ensure non-negative
    eventCount: uniqueEventIds.size,
    bookingCount: confirmedBookings.length,
    refundCount: refundedBookings.length,
  };
}

/**
 * Format payout breakdown for CSV export
 */
export function formatPayoutForCSV(payout: {
  beneficiaryName: string;
  accountMasked?: string | null;
  amount: number;
  providerPayoutId?: string | null;
}): {
  beneficiary_name: string;
  account: string;
  ifsc: string;
  amount: number;
  utr?: string;
} {
  return {
    beneficiary_name: payout.beneficiaryName,
    account: payout.accountMasked || "MASKED",
    ifsc: "N/A", // To be filled by admin
    amount: payout.amount / 100, // Convert paise to rupees
    utr: payout.providerPayoutId || undefined,
  };
}
