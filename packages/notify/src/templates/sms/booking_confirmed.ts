import type { SmsTemplate, TemplateData } from "../../types";

export function renderBookingConfirmed(data: TemplateData): SmsTemplate {
  const { eventTitle, eventDate, ticketNumber } = data;

  return {
    body: `IndieTix: Your booking for ${eventTitle} on ${eventDate} is confirmed! Ticket #${ticketNumber}. Show QR code at venue.`,
  };
}
