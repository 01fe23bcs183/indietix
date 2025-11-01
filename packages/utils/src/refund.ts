import { FEES, GST_RATE } from "./pricing";

export interface RefundPolicy {
  cancellationFeeFlat: number;
  allowLateRefundPercent?: number | null;
}

export interface RefundCalculation {
  refundableAmount: number;
  nonRefundableBreakdown: {
    cancellationFee: number;
    paymentGateway: number;
    serverMaintenance: number;
    platformSupport: number;
    gst: number;
  };
  message: string;
}

export const DEFAULT_REFUND_POLICY: RefundPolicy = {
  cancellationFeeFlat: 50,
  allowLateRefundPercent: null,
};

export function computeRefund(params: {
  baseTicketPrice: number;
  qty: number;
  feesConfig?: {
    paymentGateway: number;
    serverMaintenance: number;
    platformSupport: number;
  };
  gstRate?: number;
  policy: RefundPolicy;
  now: Date;
  eventStart: Date;
  deadlineHours: number;
}): RefundCalculation {
  const {
    baseTicketPrice,
    qty,
    feesConfig = FEES,
    gstRate = GST_RATE,
    policy,
    now,
    eventStart,
    deadlineHours,
  } = params;

  const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilEvent < 0) {
    return {
      refundableAmount: 0,
      nonRefundableBreakdown: {
        cancellationFee: 0,
        paymentGateway: feesConfig.paymentGateway * qty,
        serverMaintenance: feesConfig.serverMaintenance * qty,
        platformSupport: feesConfig.platformSupport * qty,
        gst: Math.round((feesConfig.paymentGateway + feesConfig.serverMaintenance + feesConfig.platformSupport) * qty * gstRate),
      },
      message: "Event has already started. No refund available.",
    };
  }

  if (hoursUntilEvent < deadlineHours && !policy.allowLateRefundPercent) {
    return {
      refundableAmount: 0,
      nonRefundableBreakdown: {
        cancellationFee: 0,
        paymentGateway: feesConfig.paymentGateway * qty,
        serverMaintenance: feesConfig.serverMaintenance * qty,
        platformSupport: feesConfig.platformSupport * qty,
        gst: Math.round((feesConfig.paymentGateway + feesConfig.serverMaintenance + feesConfig.platformSupport) * qty * gstRate),
      },
      message: `Past cancellation deadline (${deadlineHours} hours before event). No refund available.`,
    };
  }

  const subtotal = baseTicketPrice * qty;
  const feesPerTicket = feesConfig.paymentGateway + feesConfig.serverMaintenance + feesConfig.platformSupport;
  const totalFees = feesPerTicket * qty;
  const gst = Math.round(totalFees * gstRate);

  let refundableAmount: number;
  let message: string;

  if (hoursUntilEvent >= deadlineHours) {
    refundableAmount = subtotal - policy.cancellationFeeFlat;
    message = `Refund: ₹${(refundableAmount / 100).toFixed(2)} (ticket price minus ₹${(policy.cancellationFeeFlat / 100).toFixed(2)} cancellation fee)`;
  } else if (policy.allowLateRefundPercent) {
    const lateRefundAmount = Math.round(subtotal * (policy.allowLateRefundPercent / 100));
    refundableAmount = lateRefundAmount - policy.cancellationFeeFlat;
    message = `Late refund: ₹${(refundableAmount / 100).toFixed(2)} (${policy.allowLateRefundPercent}% of ticket price minus ₹${(policy.cancellationFeeFlat / 100).toFixed(2)} cancellation fee)`;
  } else {
    refundableAmount = 0;
    message = "No refund available";
  }

  if (refundableAmount < 0) {
    refundableAmount = 0;
  }

  return {
    refundableAmount,
    nonRefundableBreakdown: {
      cancellationFee: policy.cancellationFeeFlat,
      paymentGateway: feesConfig.paymentGateway * qty,
      serverMaintenance: feesConfig.serverMaintenance * qty,
      platformSupport: feesConfig.platformSupport * qty,
      gst,
    },
    message,
  };
}

export function canCancelBooking(params: {
  now: Date;
  eventStart: Date;
  deadlineHours: number;
  allowCancellation: boolean;
}): { canCancel: boolean; reason?: string } {
  const { now, eventStart, deadlineHours, allowCancellation } = params;

  if (!allowCancellation) {
    return {
      canCancel: false,
      reason: "Cancellations are not allowed for this event",
    };
  }

  const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilEvent < 0) {
    return {
      canCancel: false,
      reason: "Event has already started",
    };
  }

  if (hoursUntilEvent < deadlineHours) {
    return {
      canCancel: false,
      reason: `Past cancellation deadline (${deadlineHours} hours before event)`,
    };
  }

  return { canCancel: true };
}
