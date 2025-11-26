# Communication Center

The Communication Center is a first-party system for orchestrating bulk sends to Email, SMS, and Push notifications. It leverages the existing notification stack (5A) and campaign segments (5B) to provide a unified send pipeline with rate limiting, idempotency, and compliance features.

## Architecture Overview

The Communication Center consists of several components:

1. **Unified Send Pipeline** (`packages/comm/`) - Core logic for materializing recipients, expanding templates, and enqueuing notifications
2. **tRPC API Endpoints** (`packages/api/src/routers/comm.ts`, `inbox.ts`) - Admin and user-facing APIs
3. **Admin UI** (`apps/admin/src/app/(dashboard)/comm/`) - Campaign management, send wizard, outbox, and failed notification handling
4. **Web Inbox** (`apps/web/src/app/inbox/`) - User notification inbox
5. **Mobile Inbox** (`apps/mobile/app/(tabs)/notifications.tsx`) - Mobile notification tab
6. **Compliance** - Unsubscribe flow, UserConsent tracking

## Unified Send Pipeline

The pipeline is located at `packages/comm/src/pipeline.ts` and provides three main functions:

### materializeRecipients

Resolves a segment to a list of user IDs with their contact information.

```typescript
const recipients = await materializeRecipients(segmentId);
// Returns: Array<{ userId, email?, phone?, pushToken? }>
```

### expandTemplates

Renders notification templates with the provided payload.

```typescript
const content = await expandTemplates(templateKey, channel, payload);
// Returns: { subject?, body, title? }
```

### enqueueNotifications

Creates notification records for each recipient with idempotency protection.

```typescript
await enqueueNotifications({
  campaignId,
  channel,
  recipients,
  content,
  scheduledAt,
});
```

## Rate Limiting

The system enforces per-channel rate limits to prevent overwhelming external providers:

| Channel | Default Rate (per second) |
|---------|---------------------------|
| EMAIL   | 20                        |
| SMS     | 10                        |
| PUSH    | 100                       |

Rate limits can be overridden per-campaign via the `rateLimit` field. The rate limiter uses a token bucket algorithm implemented in `packages/comm/src/rate-limiter.ts`.

### Configuration

```typescript
// Custom rate limit for a campaign
await comm.send.create({
  channel: "EMAIL",
  templateKey: "marketing_promo",
  segmentId: "segment-123",
  payload: { ... },
  rateLimit: 50, // Override default 20/sec
});
```

## Idempotency

The system prevents double-enqueue of notifications using a composite key:

```
userId + campaignId + channel
```

This is enforced via:
1. Database unique constraint on `Notification(userId, campaignId, channel)`
2. Application-level check before insertion

The idempotency key generator is in `packages/comm/src/idempotency.ts`.

## Compliance & Unsubscribe

### UserConsent Table

Records user consent for different communication types:

```prisma
model UserConsent {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "marketing" | "reminders" | "terms" | "privacy"
  value     Boolean
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

### Unsubscribe Flow

1. Marketing emails include an unsubscribe footer with a signed JWT token
2. User clicks the link, which navigates to `/unsubscribe?token=...`
3. The token is verified and the user's marketing preference is disabled
4. A UserConsent record is created to track the change

### Token Generation

```typescript
import { generateUnsubscribeUrl } from "@indietix/comm";

const url = generateUnsubscribeUrl(baseUrl, userId, "marketing");
// Returns: https://indietix.com/unsubscribe?token=eyJ...
```

### Token Verification

```typescript
import { verifyUnsubscribeToken } from "@indietix/comm";

const payload = verifyUnsubscribeToken(token);
// Returns: { userId, type } or null if invalid
```

## API Endpoints

### Admin Endpoints (comm router)

| Endpoint | Description |
|----------|-------------|
| `comm.send.create` | Create a new campaign send |
| `comm.send.pause` | Pause an active campaign |
| `comm.send.resume` | Resume a paused campaign |
| `comm.outbox.list` | List campaigns with status |
| `comm.outbox.detail` | Get campaign details with notifications |
| `comm.outbox.refresh` | Refresh campaign statistics |
| `comm.failed.list` | List failed notifications |
| `comm.failed.retry` | Retry failed notifications |
| `comm.failed.export` | Export failed notifications as CSV |
| `comm.campaigns.list` | List all campaigns |
| `comm.segments.list` | List available segments |
| `comm.templates.list` | List available templates |
| `comm.recipients.estimate` | Estimate recipient count for a segment |

### User Endpoints (inbox router)

| Endpoint | Description |
|----------|-------------|
| `inbox.list` | List user's notifications (last 50) |
| `inbox.read` | Mark a notification as read |
| `inbox.unread` | Mark a notification as unread |
| `inbox.markAllRead` | Mark all notifications as read |
| `inbox.unreadCount` | Get count of unread notifications |

## Tracking Integration

### Email Open Tracking

Uses existing `/api/trk/open?rid=...` endpoint to track email opens via a 1x1 pixel.

### Email Click Tracking

Uses existing `/api/trk/c?rid=...&url=...` endpoint to track link clicks.

### Push Open Tracking

New endpoint `/api/trk/push-open?rid=...` tracks when users open push notifications.

### UTM Injection

When `utmEnabled` is set on a campaign, UTM parameters are automatically added to links:

- `utm_source=indietix`
- `utm_medium={channel}`
- `utm_campaign={campaignId}`

## Scheduler & Workers

The notification processor at `/api/cron/notifications` has been enhanced with:

1. **Per-channel rate limiting** - Processes notifications respecting channel limits
2. **Exponential backoff** - Retry intervals of 2m, 10m, 30m for failures
3. **Campaign pause support** - Skips notifications for paused campaigns
4. **Statistics updates** - Refreshes campaign stats after processing

### Retry Logic

```
Attempt 1: Immediate
Attempt 2: After 2 minutes
Attempt 3: After 10 minutes
Attempt 4: After 30 minutes (final)
```

After 4 failed attempts, the notification is marked as permanently FAILED.

## Admin UI

### Campaigns Tab

Lists all campaigns with:
- Name and channel
- Status (DRAFT, SCHEDULED, SENDING, SENT, FAILED)
- Recipient count
- Created date

### New Send Wizard

5-step wizard for creating new sends:

1. **Channel** - Select EMAIL, SMS, or PUSH
2. **Template** - Choose template and customize payload
3. **Audience** - Select segment with recipient estimate
4. **Schedule** - Set send time and rate limits
5. **Review** - Confirm and submit

### Outbox Tab

Live progress view showing:
- Queued/Sent/Failed counts
- Progress bar
- Pause/Resume controls
- Open and click rates

### Failed Tab

Failed notification management:
- List of failed notifications with error messages
- Retry individual or bulk retry
- Export to CSV for analysis

## Web Inbox

Located at `/inbox`, provides:
- List of last 50 notifications
- Read/unread status with visual indicators
- Click to expand and view details
- Mark as read/unread toggle
- Mark all as read button
- Channel badges (EMAIL, SMS, PUSH)

## Mobile Inbox

Located in the customer app's tab bar:
- Pull-to-refresh functionality
- Offline support via React Query persistence
- Same features as web inbox
- Native styling with React Native

## Testing

### Unit Tests

Located at `packages/comm/src/__tests__/pipeline.spec.ts`:
- Idempotency key generation
- Rate limiter token bucket
- Unsubscribe token generation and verification

### E2E Tests

- `apps/admin/e2e/comm.spec.ts` - Admin send wizard and outbox
- `apps/web/e2e/inbox.spec.ts` - User inbox and unsubscribe page

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `UNSUBSCRIBE_SECRET` | JWT signing secret for unsubscribe tokens | `indietix-unsubscribe-secret` |
| `NEXT_PUBLIC_APP_URL` | Base URL for unsubscribe links | `http://localhost:3000` |

## Data Model Changes

### New Tables

- `UserConsent` - Tracks user consent for communication types

### Modified Tables

- `Campaign` - Added `paused`, `stats`, `segmentId`, `payload`, `rateLimit`, `utmEnabled`
- `Notification` - Added `campaignId`, `readAt`, `error`
- `CampaignChannel` enum - Added `PUSH`
