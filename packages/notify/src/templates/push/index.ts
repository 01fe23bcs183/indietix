import type { PushTemplate, TemplateData } from "../../types";
import { renderBookingConfirmed } from "./booking_confirmed";
import { renderEventReminderT24 } from "./event_reminder_T24";
import { renderEventReminderT2 } from "./event_reminder_T2";
import { renderWaitlistOfferCreated } from "./waitlist_offer_created";

export * from "./booking_confirmed";
export * from "./event_reminder_T24";
export * from "./event_reminder_T2";
export * from "./waitlist_offer_created";

const pushTemplates = {
  booking_confirmed: renderBookingConfirmed,
  event_reminder_T24: renderEventReminderT24,
  event_reminder_T2: renderEventReminderT2,
  waitlist_offer_created: renderWaitlistOfferCreated,
};

export function renderPushTemplate(
  type: string,
  data: TemplateData
): PushTemplate {
  const renderer = pushTemplates[type];
  if (!renderer) {
    throw new Error(`Unknown push template type: ${type}`);
  }
  return renderer(data);
}
