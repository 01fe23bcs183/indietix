import type { SmsTemplate, TemplateData } from "../../types";

export function renderWaitlistOfferCreated(data: TemplateData): SmsTemplate {
  const { eventTitle, quantity, offerUrl } = data;

  return {
    body: `IndieTix: Great news! ${quantity} ticket(s) available for ${eventTitle}. Claim now: ${offerUrl} (Offer expires soon!)`,
  };
}
