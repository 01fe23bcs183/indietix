import type { PushTemplate, TemplateData } from "../../types";

export function renderEventReminderT2(data: TemplateData): PushTemplate {
  const { eventTitle } = data;

  return {
    title: "Event Starting Soon!",
    body: `${eventTitle} starts in 2 hours! Time to head to the venue.`,
    data: {
      type: "event_reminder_T2",
      eventTitle: eventTitle as string,
    },
  };
}
