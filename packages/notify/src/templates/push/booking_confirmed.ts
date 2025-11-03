import type { PushTemplate, TemplateData } from "../../types";

export function renderBookingConfirmed(data: TemplateData): PushTemplate {
  const { eventTitle, ticketNumber } = data;

  return {
    title: "Booking Confirmed!",
    body: `Your booking for ${eventTitle} is confirmed. Ticket #${ticketNumber}`,
    data: {
      type: "booking_confirmed",
      ticketNumber: ticketNumber as string,
    },
  };
}
