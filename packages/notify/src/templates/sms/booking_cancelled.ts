import type { SmsTemplate, TemplateData } from "../../types";

export function renderBookingCancelled(data: TemplateData): SmsTemplate {
  const { eventTitle, ticketNumber, refundAmount } = data;

  return {
    body: `IndieTix: Your booking for ${eventTitle} (Ticket #${ticketNumber}) has been cancelled. Refund of ₹${refundAmount} will be processed in 5-7 days.`,
  };
}
