import type { EmailTemplate, TemplateData } from "../../types";
import { renderBookingConfirmed } from "./booking_confirmed";
import { renderBookingCancelled } from "./booking_cancelled";
import { renderRefundSucceeded } from "./refund_succeeded";
import { renderWaitlistOfferCreated } from "./waitlist_offer_created";
import { renderEventReminderT24 } from "./event_reminder_T24";
import { renderEventReminderT2 } from "./event_reminder_T2";
import { renderOrganizerPayoutCompleted } from "./organizer_payout_completed";
import { renderAdminAnnouncement } from "./admin_announcement";

export * from "./booking_confirmed";
export * from "./booking_cancelled";
export * from "./refund_succeeded";
export * from "./waitlist_offer_created";
export * from "./event_reminder_T24";
export * from "./event_reminder_T2";
export * from "./organizer_payout_completed";
export * from "./admin_announcement";

const emailTemplates = {
  booking_confirmed: renderBookingConfirmed,
  booking_cancelled: renderBookingCancelled,
  refund_succeeded: renderRefundSucceeded,
  waitlist_offer_created: renderWaitlistOfferCreated,
  event_reminder_T24: renderEventReminderT24,
  event_reminder_T2: renderEventReminderT2,
  organizer_payout_completed: renderOrganizerPayoutCompleted,
  admin_announcement: renderAdminAnnouncement,
};

export function renderEmailTemplate(
  type: string,
  data: TemplateData
): EmailTemplate {
  const renderer = emailTemplates[type];
  if (!renderer) {
    throw new Error(`Unknown email template type: ${type}`);
  }
  return renderer(data);
}
