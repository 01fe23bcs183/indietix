import type { PushTemplate, TemplateData } from "../../types";

export function renderWaitlistOfferCreated(data: TemplateData): PushTemplate {
  const { eventTitle, quantity } = data;

  return {
    title: "Tickets Available!",
    body: `${quantity} ticket(s) now available for ${eventTitle}. Claim before they're gone!`,
    data: {
      type: "waitlist_offer_created",
      eventTitle: eventTitle as string,
    },
  };
}
