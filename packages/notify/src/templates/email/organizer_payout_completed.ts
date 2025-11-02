import type { EmailTemplate, TemplateData } from "../../types";

export function renderOrganizerPayoutCompleted(
  data: TemplateData
): EmailTemplate {
  const { organizerName, amount, periodStart, periodEnd, payoutId } = data;

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
      <h1>Payout Completed</h1>
    </div>
    <div class="content">
      <p>Hi ${organizerName},</p>
      <p>Your payout has been successfully processed and transferred to your account.</p>
      <div class="info">
        <p><strong>Payout ID:</strong> ${payoutId}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>Period:</strong> ${periodStart} to ${periodEnd}</p>
      </div>
      <p>The amount should reflect in your bank account within 1-2 business days.</p>
    </div>
    <div class="footer">
      <p>IndieTix - Your trusted event ticketing platform</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hi ${organizerName},

Your payout has been successfully processed and transferred to your account.

Payout ID: ${payoutId}
Amount: ₹${amount}
Period: ${periodStart} to ${periodEnd}

The amount should reflect in your bank account within 1-2 business days.

IndieTix - Your trusted event ticketing platform
  `;

  return {
    subject: `Payout Completed: ₹${amount}`,
    html,
    text,
  };
}
