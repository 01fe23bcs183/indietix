import type { EmailTemplate, TemplateData } from "../../types";

export function renderBookingConfirmed(data: TemplateData): EmailTemplate {
  const {
    userName,
    eventTitle,
    eventDate,
    eventVenue,
    seats,
    ticketNumber,
    finalAmount,
  } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .ticket-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your booking has been confirmed. Here are your ticket details:</p>
      <div class="ticket-info">
        <p><strong>Event:</strong> ${eventTitle}</p>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Venue:</strong> ${eventVenue}</p>
        <p><strong>Seats:</strong> ${seats}</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Amount Paid:</strong> ₹${finalAmount}</p>
      </div>
      <p>Please present your ticket QR code at the venue for entry.</p>
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

Your booking has been confirmed!

Event: ${eventTitle}
Date: ${eventDate}
Venue: ${eventVenue}
Seats: ${seats}
Ticket Number: ${ticketNumber}
Amount Paid: ₹${finalAmount}

Please present your ticket QR code at the venue for entry.

IndieTix - Your trusted event ticketing platform
  `;

  return {
    subject: `Booking Confirmed: ${eventTitle}`,
    html,
    text,
  };
}
