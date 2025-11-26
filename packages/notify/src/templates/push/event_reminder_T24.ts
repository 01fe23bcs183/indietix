import type { PushTemplate, TemplateData } from "../../types";

export function renderEventReminderT24(data: TemplateData): PushTemplate {
  const { eventTitle, eventDate } = data;

  return {
    title: "Event Tomorrow!",
    body: `${eventTitle} is happening tomorrow on ${eventDate}. Don't forget your ticket!`,
    data: {
      type: "event_reminder_T24",
      eventTitle: eventTitle as string,
    },
  };
}
