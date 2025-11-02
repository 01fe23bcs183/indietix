import type { SmsTemplate, TemplateData } from "../../types";
import { renderBookingConfirmed } from "./booking_confirmed";
import { renderBookingCancelled } from "./booking_cancelled";
import { renderEventReminderT24 } from "./event_reminder_T24";
import { renderEventReminderT2 } from "./event_reminder_T2";
import { renderWaitlistOfferCreated } from "./waitlist_offer_created";

export * from "./booking_confirmed";
export * from "./booking_cancelled";
export * from "./event_reminder_T24";
export * from "./event_reminder_T2";
export * from "./waitlist_offer_created";

const smsTemplates = {
  booking_confirmed: renderBookingConfirmed,
  booking_cancelled: renderBookingCancelled,
  event_reminder_T24: renderEventReminderT24,
  event_reminder_T2: renderEventReminderT2,
  waitlist_offer_created: renderWaitlistOfferCreated,
};

export function renderSmsTemplate(
  type: string,
  data: TemplateData
): SmsTemplate {
  const renderer = smsTemplates[type];
  if (!renderer) {
    throw new Error(`Unknown SMS template type: ${type}`);
  }
  return renderer(data);
}
