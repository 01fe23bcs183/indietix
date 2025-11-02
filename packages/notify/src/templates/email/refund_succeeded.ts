import type { EmailTemplate, TemplateData } from "../../types";

export function renderRefundSucceeded(data: TemplateData): EmailTemplate {
  const { userName, eventTitle, ticketNumber, refundAmount } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Refund Processed</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your refund has been successfully processed.</p>
      <div class="info">
        <p><strong>Event:</strong> ${eventTitle}</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Refund Amount:</strong> ₹${refundAmount}</p>
      </div>
      <p>The amount should reflect in your account within 5-7 business days.</p>
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

Your refund has been successfully processed.

Event: ${eventTitle}
Ticket Number: ${ticketNumber}
Refund Amount: ₹${refundAmount}

The amount should reflect in your account within 5-7 business days.

IndieTix - Your trusted event ticketing platform
  `;

  return {
    subject: `Refund Processed: ${eventTitle}`,
    html,
    text,
  };
}
