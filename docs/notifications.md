# IndieTix Notifications System

## Overview

The IndieTix notifications system provides a comprehensive, multi-channel notification infrastructure supporting Email, SMS, and Push notifications. The system is designed to be provider-agnostic, test-friendly, and fully operational in CI environments without external dependencies.

## Architecture

### Provider Layer

The notification system uses a pluggable provider architecture that supports both production and test environments:

#### Email Providers
- **Production**: Resend (requires `RESEND_API_KEY`)
- **Test/Offline**: FakeEmail (automatic in `NODE_ENV=test`)

Interface:
```typescript
sendEmail({
  to: string,
  subject: string,
  html: string,
  text: string
})
```

#### SMS Providers
- **Production**: Twilio (requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`)
- **Test/Offline**: FakeSms (automatic in `NODE_ENV=test`)

Interface:
```typescript
sendSms({
  to: string,
  body: string
})
```

#### Push Providers
- **Production**: Expo Push (no API key required)
- **Test/Offline**: FakePush (automatic in `NODE_ENV=test`)

Interface:
```typescript
sendPush({
  toToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
})
```

### Template System

Templates are file-based and organized by channel:

#### Email Templates
- Location: `packages/notify/src/templates/email/`
- Format: TypeScript functions returning `{ subject, html, text }`
- Styling: Inline CSS for email client compatibility

#### SMS Templates
- Location: `packages/notify/src/templates/sms/`
- Format: TypeScript functions returning `{ body }`
- Constraint: 160 characters recommended

#### Push Templates
- Location: `packages/notify/src/templates/push/`
- Format: TypeScript functions returning `{ title, body, data? }`

#### Available Templates

| Template Key | Channels | Category | Description |
|-------------|----------|----------|-------------|
| `booking_confirmed` | Email, SMS, Push | Transactional | Sent when booking is confirmed |
| `booking_cancelled` | Email, SMS | Transactional | Sent when booking is cancelled |
| `refund_succeeded` | Email | Transactional | Sent when refund is processed |
| `waitlist_offer_created` | Email, SMS, Push | Reminders | Sent when waitlist offer is available |
| `event_reminder_T24` | Email, SMS, Push | Reminders | Sent 24 hours before event |
| `event_reminder_T2` | Email, SMS, Push | Reminders | Sent 2 hours before event |
| `organizer_payout_completed` | Email | Transactional | Sent when organizer payout is completed |
| `admin_announcement` | Email | Marketing | Sent for platform announcements |

### User Preferences

Users can control their notification preferences through the `/profile/notifications` page.

#### Preference Model

```typescript
{
  // Channel preferences
  emailEnabled: boolean,
  smsEnabled: boolean,
  pushEnabled: boolean,
  
  // Category preferences
  transactional: boolean,
  reminders: boolean,
  marketing: boolean
}
```

#### Default Preferences
- Email: Enabled
- SMS: Disabled
- Push: Enabled
- Transactional: Enabled (cannot be disabled)
- Reminders: Enabled
- Marketing: Disabled

### Notification Scheduling

Notifications can be sent immediately or scheduled for future delivery.

#### Immediate Sending

```typescript
await sendNotification({
  userId: "user_123",
  type: "booking_confirmed",
  channel: "EMAIL",
  category: "TRANSACTIONAL",
  to: "user@example.com",
  payload: {
    userName: "John Doe",
    eventTitle: "Tech Conference 2025",
    // ... other template data
  }
});
```

#### Scheduled Sending

```typescript
await scheduleNotification({
  userId: "user_123",
  type: "event_reminder_T24",
  channel: "EMAIL",
  category: "REMINDERS",
  to: "user@example.com",
  payload: { /* template data */ },
  scheduledAt: new Date("2025-03-14T10:00:00Z")
});
```

### Cron Processing

Scheduled notifications are processed by a cron job that runs every 5 minutes.

#### Endpoint
`GET /api/cron/notifications`

#### Authentication
Requires `Authorization: Bearer <CRON_TOKEN>` header

#### Workflow
1. Finds all `PENDING` notifications with `scheduledAt <= now`
2. Processes up to 100 notifications per run
3. Sends via appropriate provider
4. Updates status to `SENT` or `FAILED`
5. Implements exponential backoff (max 3 attempts)

#### GitHub Actions Workflow
`.github/workflows/cron-notifications.yml` triggers the endpoint every 5 minutes.

For production deployment on Vercel, use Vercel Cron instead.

## API Reference

### tRPC Procedures

#### `notify.getPreferences`
Get current user's notification preferences.

**Auth**: Required  
**Returns**: `NotificationPreference`

#### `notify.updatePreferences`
Update current user's notification preferences.

**Auth**: Required  
**Input**:
```typescript
{
  emailEnabled?: boolean,
  smsEnabled?: boolean,
  pushEnabled?: boolean,
  transactional?: boolean,
  reminders?: boolean,
  marketing?: boolean
}
```

#### `notify.schedule`
Schedule a notification for future delivery.

**Auth**: Optional  
**Input**:
```typescript
{
  userId?: string,
  type: string,
  channel: "EMAIL" | "SMS" | "PUSH",
  category: "TRANSACTIONAL" | "REMINDERS" | "MARKETING",
  to: string,
  payload: Record<string, unknown>,
  scheduledAt?: Date
}
```

#### `notify.send`
Send a notification immediately (for testing/preview).

**Auth**: Optional  
**Input**: Same as `schedule` without `scheduledAt`

#### `notify.getHistory`
Get notification history for current user.

**Auth**: Required  
**Input**:
```typescript
{
  limit?: number,  // 1-100, default 20
  offset?: number  // default 0
}
```

#### `notify.preview`
Preview a notification template (admin only).

**Auth**: Required (Admin)  
**Input**:
```typescript
{
  type: string,
  channel: "EMAIL" | "SMS" | "PUSH",
  payload: Record<string, unknown>
}
```

### REST Endpoints

#### `POST /api/push/register`
Register a push notification token for the current user.

**Auth**: Required  
**Body**:
```json
{
  "token": "ExponentPushToken[...]"
}
```

#### `GET /api/cron/notifications`
Process pending notifications (cron job).

**Auth**: Bearer token (`CRON_TOKEN`)  
**Returns**:
```json
{
  "success": true,
  "processed": 10,
  "sent": 8,
  "failed": 2
}
```

## Admin Features

### Notification Preview UI

Location: `/admin/notifications/preview`

Features:
- Select template type and channel
- Edit payload JSON
- Preview rendered notification
- Send test notification to own email

## Integration Examples

### Booking Confirmation

```typescript
import { scheduleNotification } from "@indietix/notify";

// After successful booking
await scheduleNotification({
  userId: booking.userId,
  type: "booking_confirmed",
  channel: "EMAIL",
  category: "TRANSACTIONAL",
  to: user.email,
  payload: {
    userName: user.name,
    eventTitle: event.title,
    eventDate: formatDate(event.date),
    eventVenue: event.venue,
    seats: booking.seats,
    ticketNumber: booking.ticketNumber,
    finalAmount: booking.finalAmount
  }
});
```

### Event Reminders

```typescript
// Schedule T-24h reminder
const reminderT24 = new Date(event.date);
reminderT24.setHours(reminderT24.getHours() - 24);

await scheduleNotification({
  userId: booking.userId,
  type: "event_reminder_T24",
  channel: "EMAIL",
  category: "REMINDERS",
  to: user.email,
  payload: {
    userName: user.name,
    eventTitle: event.title,
    eventDate: formatDate(event.date),
    eventVenue: event.venue,
    ticketNumber: booking.ticketNumber
  },
  scheduledAt: reminderT24
});

// Schedule T-2h reminder
const reminderT2 = new Date(event.date);
reminderT2.setHours(reminderT2.getHours() - 2);

await scheduleNotification({
  userId: booking.userId,
  type: "event_reminder_T2",
  channel: "PUSH",
  category: "REMINDERS",
  to: user.pushTokens[0], // Use first push token
  payload: {
    userName: user.name,
    eventTitle: event.title,
    eventVenue: event.venue
  },
  scheduledAt: reminderT2
});
```

## Testing

### Unit Tests

Location: `packages/notify/src/__tests__/`

Run: `pnpm --filter @indietix/notify test`

### E2E Tests

Locations:
- `apps/web/e2e/notifications.spec.ts`
- `apps/admin/e2e/notifications.spec.ts`

Run: `npx playwright test`

### CI Compatibility

The notification system is fully CI-compatible:
- Fake providers are automatically used in `NODE_ENV=test`
- No external API credentials required
- All tests pass offline

## Environment Variables

### Production

```env
# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@indietix.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1234567890

# Cron
CRON_TOKEN=your_secure_token
```

### Test/Development

No environment variables required. Fake providers are used automatically.

## Database Schema

### NotificationPreference

```prisma
model NotificationPreference {
  id                String   @id @default(cuid())
  userId            String   @unique
  
  emailEnabled      Boolean  @default(true)
  smsEnabled        Boolean  @default(false)
  pushEnabled       Boolean  @default(true)
  
  transactional     Boolean  @default(true)
  reminders         Boolean  @default(true)
  marketing         Boolean  @default(false)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user              User     @relation(...)
}
```

### Notification

```prisma
model Notification {
  id                String             @id @default(cuid())
  userId            String?
  type              String
  channel           NotificationChannel
  category          NotificationCategory
  to                String
  payload           Json
  scheduledAt       DateTime
  sentAt            DateTime?
  status            NotificationStatus @default(PENDING)
  attempts          Int                @default(0)
  lastAttemptAt     DateTime?
  errorMessage      String?
  providerMessageId String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  user              User?              @relation(...)
}
```

## Troubleshooting

### Notifications not sending

1. Check notification status in database
2. Verify user preferences allow the channel/category
3. Check cron job is running
4. Review error messages in notification records

### Template rendering errors

1. Verify payload contains all required fields
2. Check template type exists
3. Review template implementation for errors

### Provider errors

1. Verify environment variables are set correctly
2. Check provider credentials are valid
3. Review provider-specific error messages

## Future Enhancements

- [ ] Batch notification sending
- [ ] Notification analytics dashboard
- [ ] A/B testing for templates
- [ ] Rich push notifications with images
- [ ] WhatsApp integration
- [ ] Slack integration for organizers
