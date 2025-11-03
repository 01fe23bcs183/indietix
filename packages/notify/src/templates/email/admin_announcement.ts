import type { EmailTemplate, TemplateData } from "../../types";

export function renderAdminAnnouncement(data: TemplateData): EmailTemplate {
  const { userName, title, message } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .message { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <div class="message">
        ${message}
      </div>
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

${title}

${message}

IndieTix - Your trusted event ticketing platform
  `;

  return {
    subject: title as string,
    html,
    text,
  };
}
