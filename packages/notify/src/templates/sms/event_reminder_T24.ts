import type { SmsTemplate, TemplateData } from "../../types";

export function renderEventReminderT24(data: TemplateData): SmsTemplate {
  const { eventTitle, eventDate, eventVenue } = data;

  return {
    body: `IndieTix: Reminder! ${eventTitle} is tomorrow at ${eventVenue} on ${eventDate}. Don't forget your ticket QR code!`,
  };
}
