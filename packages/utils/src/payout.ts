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

export type ConfirmedBooking = {
  ticketPrice: number;
  seats: number;
  convenienceFee: number;
  platformFee: number;
  eventId: string;
};

export type RefundedBooking = {
  refunds: Array<{
    status: string;
    amount: number;
  }>;
};

export type PrismaClient = {
  event: {
    // eslint-disable-next-line no-unused-vars
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
  };
  booking: {
    // eslint-disable-next-line no-unused-vars
    findMany: (args: unknown) => Promise<unknown>;
  };
};

/**
 * Compute payout amount for an organizer for a given period
 * Formula: GMV_confirmed - refunds_confirmed - fees_kept = net_payable
 *
 * Only considers CONFIRMED bookings within the specified window
 * REFUNDED bookings subtract appropriately
 */
export async function computePayoutAmount(
  params: PayoutCalculationParams,
  prisma: PrismaClient
): Promise<PayoutBreakdown> {
  const { organizerId, periodStart, periodEnd } = params;

  const events = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true },
  });

  const eventIds = events.map((e) => e.id);

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

  const confirmedBookings = (await prisma.booking.findMany({
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
      eventId: true,
    },
  })) as ConfirmedBooking[];

  const refundedBookings = (await prisma.booking.findMany({
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
  })) as RefundedBooking[];

  const gmv = confirmedBookings.reduce((sum, booking) => {
    return sum + booking.ticketPrice * booking.seats;
  }, 0);

  const refunds = refundedBookings.reduce((sum, booking) => {
    const successfulRefunds = booking.refunds.filter(
      (r) => r.status === "SUCCEEDED"
    );
    return (
      sum + successfulRefunds.reduce((refundSum, r) => refundSum + r.amount, 0)
    );
  }, 0);

  const feesKept = confirmedBookings.reduce((sum, booking) => {
    return sum + booking.convenienceFee + booking.platformFee;
  }, 0);

  const netPayable = gmv - refunds - feesKept;

  const uniqueEventIds = new Set(confirmedBookings.map((b) => b.eventId));

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
