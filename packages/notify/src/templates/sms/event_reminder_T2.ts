import type { SmsTemplate, TemplateData } from "../../types";

export function renderEventReminderT2(data: TemplateData): SmsTemplate {
  const { eventTitle, eventVenue } = data;

  return {
    body: `IndieTix: ${eventTitle} starts in 2 hours at ${eventVenue}! Time to head to the venue. Have your QR code ready!`,
  };
}
