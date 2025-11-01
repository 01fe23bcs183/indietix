export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export { formatINR } from "./format";
export {
  FEES,
  GST_RATE,
  computeTotals,
  computeBookingAmounts,
} from "./pricing";
export type { PricingBreakdown, BookingAmounts } from "./pricing";
export {
  signTicketPayload,
  verifyTicketSignature,
  generateTicketPayload,
  createSignedTicket,
  encodeTicketForQR,
  decodeTicketFromQR,
  hashTicketPayload,
} from "./ticket";
export type { TicketPayload, SignedTicket } from "./ticket";
export {
  computeRefund,
  canCancelBooking,
  DEFAULT_REFUND_POLICY,
} from "./refund";
export type { RefundPolicy, RefundCalculation } from "./refund";
export { computePayoutAmount, formatPayoutForCSV } from "./payout";
export type {
  PayoutBreakdown,
  PayoutCalculationParams,
  PrismaClient,
} from "./payout";
