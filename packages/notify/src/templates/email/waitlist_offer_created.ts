import type { EmailTemplate, TemplateData } from "../../types";

export function renderWaitlistOfferCreated(data: TemplateData): EmailTemplate {
  const { userName, eventTitle, eventDate, quantity, offerUrl, expiresAt } =
    data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .cta { text-align: center; margin: 20px 0; }
    .button { background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tickets Available!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Great news! Tickets are now available for an event you're waitlisted for.</p>
      <div class="info">
        <p><strong>Event:</strong> ${eventTitle}</p>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Available Seats:</strong> ${quantity}</p>
        <p><strong>Offer Expires:</strong> ${expiresAt}</p>
      </div>
      <div class="cta">
        <a href="${offerUrl}" class="button">Claim Your Tickets Now</a>
      </div>
      <p><strong>Important:</strong> This offer expires soon. Claim your tickets before someone else does!</p>
    </div>
    <div class="footer">
      <p>IndieTix - Your trusted event ticketing platform</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hi ${userName},

Great news! Tickets are now available for an event you're waitlisted for.

Event: ${eventTitle}
Date: ${eventDate}
Available Seats: ${quantity}
Offer Expires: ${expiresAt}

Claim your tickets now: ${offerUrl}

Important: This offer expires soon. Claim your tickets before someone else does!

IndieTix - Your trusted event ticketing platform
  `;

  return {
    subject: `Tickets Available: ${eventTitle}`,
    html,
    text,
  };
}
