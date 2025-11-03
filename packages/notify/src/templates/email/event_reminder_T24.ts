import type { EmailTemplate, TemplateData } from "../../types";

export function renderEventReminderT24(data: TemplateData): EmailTemplate {
  const { userName, eventTitle, eventDate, eventVenue, ticketNumber } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #8B5CF6; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Event Tomorrow!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>This is a reminder that your event is happening tomorrow!</p>
      <div class="info">
        <p><strong>Event:</strong> ${eventTitle}</p>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Venue:</strong> ${eventVenue}</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
      </div>
      <p>Don't forget to bring your ticket QR code for entry. See you there!</p>
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

This is a reminder that your event is happening tomorrow!

Event: ${eventTitle}
Date: ${eventDate}
Venue: ${eventVenue}
Ticket Number: ${ticketNumber}

Don't forget to bring your ticket QR code for entry. See you there!

IndieTix - Your trusted event ticketing platform
  `;

  return {
    subject: `Reminder: ${eventTitle} is Tomorrow!`,
    html,
    text,
  };
}
