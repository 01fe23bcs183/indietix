# Communication Center Implementation Plan

## Overview

This document outlines the implementation plan for building a first-party Communication Center that orchestrates bulk sends to Email, SMS, and Push notifications. The system will leverage the existing 5A notifications stack (`packages/notify`) and 5B campaign segments (`packages/marketing`).

## Existing Infrastructure Analysis

### 5A Notifications Stack (packages/notify)
- **Core Functions**: `sendNotification()`, `scheduleNotification()`, `processPendingNotifications()`
- **Providers**: Email (Resend/Fake), SMS (Twilio/Fake), Push (Expo/Fake)
- **Provider Selection**: Env-driven (`NODE_ENV=test` uses fake providers)
- **Templates**: Email, SMS, Push templates with rendering functions
- **Preference Gating**: Checks `NotificationPreference` for channel/category enablement

### 5B Campaign Segments (packages/marketing)
- **Segment DSL**: JSON query format (`city`, `categories`, `attended_in_last_days`, `price_ceiling`)
- **Functions**: `buildSegmentWhereClause()`, `validateSegmentQuery()`, `estimateSegmentSize()`
- **Models**: `Segment` (query DSL), `Campaign`, `CampaignRecipient`

### Existing API Routers
- `packages/api/src/routers/notify.ts`: Preference management, send/schedule, history, preview
- `packages/api/src/routers/campaigns.ts`: Create, schedule, cancel, list, detail
- `packages/api/src/routers/segments.ts`: CRUD, estimate

### Existing Cron Jobs
- `/api/cron/notifications`: Calls `processPendingNotifications()` (batch of 100, max 3 attempts)
- `/api/cron/holds`: Expire pending bookings
- `/api/cron/payouts`: Generate organizer settlements
- `/api/cron/waitlist`: Expire waitlist offers

### Existing Tracking Endpoints
- `/api/trk/open`: Email open tracking pixel (updates `CampaignRecipient.openedAt`)
- `/api/trk/c`: Click tracking redirect (updates `CampaignRecipient.clickedAt`)

---

## Implementation Phases

### Phase 0: Data Model & Schema Changes
**Estimated Effort**: 1-2 hours

#### New Tables
1. **UserConsent** - Legal consent tracking
   ```prisma
   model UserConsent {
     id        String   @id @default(cuid())
     userId    String
     type      ConsentType  // "marketing" | "reminders" | "terms" | "privacy"
     value     Boolean
     createdAt DateTime @default(now())
     
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     
     @@index([userId, type])
     @@index([createdAt])
   }
   
   enum ConsentType {
     MARKETING
     REMINDERS
     TERMS
     PRIVACY
   }
   ```

#### Schema Modifications
2. **Campaign** - Add pause/stats fields
   ```prisma
   // Add to existing Campaign model:
   paused    Boolean @default(false)
   stats     Json?   // { queued, sent, failed, openRate, clickRate }
   segmentId String? // Link to segment used
   payload   Json?   // Template payload data
   rateLimit Int?    // Per-channel rate limit (e.g., 20/sec for email)
   utmEnabled Boolean @default(true)
   ```

3. **Notification** - Add campaign/inbox fields
   ```prisma
   // Add to existing Notification model:
   campaignId String?
   readAt     DateTime?
   error      String?
   
   campaign   Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
   
   @@unique([userId, campaignId, channel], name: "idempotency_key") // Prevent double-enqueue
   ```

4. **CampaignChannel Enum** - Add PUSH
   ```prisma
   enum CampaignChannel {
     EMAIL
     SMS
     PUSH  // New
   }
   ```

---

### Phase 1: Unified Send Pipeline
**Estimated Effort**: 4-6 hours
**Location**: `packages/comm/pipeline.ts`

#### Core Pipeline Functions

1. **materializeRecipients(segmentId | inlineFilter)**
   - Snapshot segment query at send time
   - Execute query against User table
   - Return array of `{ userId, email, phone, pushToken }`

2. **expandTemplates(templateKey, channel, payload)**
   - Render template for each channel
   - Inject UTM parameters if enabled
   - Add unsubscribe footer for marketing emails

3. **enqueueNotifications(recipients, campaign, options)**
   - Create Notification rows with `scheduledAt` and `campaignId`
   - Implement idempotency via unique constraint `(userId, campaignId, channel)`
   - Batch insert for performance

4. **Rate Limiting**
   - Per-channel rate limits (default: email 20/sec, SMS 10/sec, push 100/sec)
   - Throttling windows (configurable)
   - Token bucket or sliding window algorithm

5. **Idempotency**
   - Unique key: `userId + campaignId + channel`
   - Skip if notification already exists for this combination
   - Return existing notification ID if duplicate

#### Pipeline Interface
```typescript
interface SendPipelineOptions {
  channel: "EMAIL" | "SMS" | "PUSH";
  templateKey: string;
  segmentId?: string;
  inlineFilter?: SegmentQuery;
  payload: Record<string, unknown>;
  schedule?: Date;
  rateLimit?: number;
  utmEnabled?: boolean;
}

interface SendPipelineResult {
  campaignId: string;
  recipientCount: number;
  queuedCount: number;
  skippedCount: number; // Due to preferences or idempotency
}
```

---

### Phase 2: tRPC API Endpoints
**Estimated Effort**: 3-4 hours
**Location**: `packages/api/src/routers/comm.ts`, `packages/api/src/routers/inbox.ts`

#### comm.send Router
```typescript
// comm.send.create
input: {
  channel: "EMAIL" | "SMS" | "PUSH";
  templateKey: string;
  segmentId?: string;
  inlineFilter?: SegmentQuery;
  payload: Record<string, unknown>;
  schedule?: Date;
  rate?: number;
}

// comm.send.pause
input: { campaignId: string }

// comm.send.resume
input: { campaignId: string }

// comm.outbox.list
input: { status?: CampaignStatus }
output: Campaign[] with stats

// comm.outbox.detail
input: { campaignId: string }
output: Campaign with recipients, progress
```

#### inbox Router
```typescript
// inbox.list
input: { userId?: string; limit?: number }
output: Notification[] (last 50, ordered by createdAt desc)

// inbox.read
input: { notificationId: string }
output: { success: boolean }

// inbox.markAllRead
input: {}
output: { count: number }
```

---

### Phase 3: Schedulers & Workers Enhancement
**Estimated Effort**: 3-4 hours
**Location**: `packages/notify/src/send.ts`, `/api/cron/notifications`

#### Enhanced processPendingNotifications()
1. **Per-Channel Rate Limiting**
   - Query pending notifications grouped by channel
   - Apply rate limit per channel
   - Process in priority order (TRANSACTIONAL > REMINDERS > MARKETING)

2. **Campaign Pause Check**
   - Skip notifications where `campaign.paused = true`
   - Update campaign stats after each batch

3. **Exponential Backoff**
   - Retry intervals: 2m, 10m, 30m
   - Calculate next retry based on `attempts` count
   - Mark as FAILED after max attempts (3)

4. **Stats Update**
   - Update `Campaign.stats` JSON after each batch
   - Track: queued, sent, failed, openRate, clickRate

#### New Cron Behavior
```typescript
// Enhanced /api/cron/notifications
async function processNotifications() {
  const channels = ["EMAIL", "SMS", "PUSH"];
  const rateLimits = { EMAIL: 20, SMS: 10, PUSH: 100 };
  
  for (const channel of channels) {
    const pending = await getPendingForChannel(channel, rateLimits[channel]);
    
    for (const notification of pending) {
      // Skip if campaign is paused
      if (notification.campaign?.paused) continue;
      
      // Check retry backoff
      if (!isReadyForRetry(notification)) continue;
      
      // Process notification
      await processNotification(notification);
    }
  }
  
  // Update campaign stats
  await updateCampaignStats();
}
```

---

### Phase 4: Admin UI
**Estimated Effort**: 6-8 hours
**Location**: `apps/admin/src/app/(dashboard)/comm/`

#### Page Structure
```
apps/admin/src/app/(dashboard)/comm/
├── page.tsx              # Campaigns list (default tab)
├── new/
│   └── page.tsx          # New Send wizard
├── outbox/
│   └── page.tsx          # Live progress view
├── failed/
│   └── page.tsx          # Failed notifications with retry
└── layout.tsx            # Tab navigation
```

#### Campaigns Tab (Default)
- List all campaigns with status, recipient count, sent/failed counts
- Filter by status (DRAFT, SCHEDULED, SENDING, SENT, FAILED)
- Click to view details

#### New Send Wizard
1. **Step 1: Channel Selection**
   - Radio buttons: Email, SMS, Push
   - Multi-select for multi-channel sends

2. **Step 2: Template Selection**
   - Dropdown of available templates for selected channel
   - Preview pane showing rendered template

3. **Step 3: Audience Selection**
   - Select existing segment OR
   - Build ad-hoc filter (city, categories, etc.)
   - Show estimated recipient count

4. **Step 4: Schedule & Options**
   - Send now / Schedule for later (datetime picker)
   - Rate limit override (default shown)
   - UTM injection toggle
   - Unsubscribe footer preview (for marketing)

5. **Step 5: Review & Confirm**
   - Summary of all selections
   - Final recipient count
   - Confirm button

#### Outbox Tab
- Real-time progress display (polling every 5s)
- Progress bar: queued → sent → failed
- Pause/Resume buttons per campaign
- Cancel button for scheduled campaigns

#### Failed Tab
- List of failed notifications grouped by campaign
- Error message display
- Retry button (with backoff info)
- Export CSV button

---

### Phase 5: User Inbox (Web)
**Estimated Effort**: 3-4 hours
**Location**: `apps/web/src/app/inbox/`

#### Page Structure
```
apps/web/src/app/inbox/
├── page.tsx              # Inbox list
└── [id]/
    └── page.tsx          # Notification detail (optional)
```

#### Features
- List last 50 notifications for logged-in user
- Read/unread status with visual indicator
- Mark as read on click
- Mark all as read button
- Deep link support (click to navigate)
- Empty state for no notifications

---

### Phase 6: User Inbox (Mobile)
**Estimated Effort**: 2-3 hours
**Location**: `apps/mobile/app/(tabs)/notifications.tsx`

#### Features
- Notifications tab in bottom navigation
- List view with pull-to-refresh
- Read/unread status
- Tap to mark as read
- Deep link navigation
- Offline cache with React Query persistence

---

### Phase 7: Compliance & Preferences
**Estimated Effort**: 3-4 hours

#### Unsubscribe Flow
1. **Token Generation**
   - Generate signed JWT with `{ userId, type: "marketing" | "reminders" }`
   - Include in email footer: `/unsubscribe?token=...`

2. **Unsubscribe Endpoint**
   - `GET /unsubscribe?token=...` - Show confirmation page
   - `POST /api/unsubscribe` - Process unsubscribe
   - Update `NotificationPreference` and create `UserConsent` record

3. **Email Footer**
   - Auto-inject for MARKETING category emails
   - Configurable text
   - Tracking pixel for open tracking

#### Transactional Override
- Document that TRANSACTIONAL category bypasses preference checks
- Ensure `sendNotification()` respects this

#### UserConsent Recording
- Record consent events on:
  - Signup (terms, privacy)
  - Preference changes (marketing, reminders)
  - Unsubscribe actions

---

### Phase 8: Tracking Integration
**Estimated Effort**: 2-3 hours

#### Existing Endpoints (Already Implemented)
- `/api/trk/open?rid=...` - Email open pixel
- `/api/trk/c?rid=...&url=...` - Click tracking redirect

#### New Endpoint
- `/api/trk/push-open?rid=...` - Push notification opened
  - Called from mobile app when notification is tapped
  - Updates `CampaignRecipient.openedAt` or `Notification.readAt`

#### UTM Injection
- Add UTM parameters to all links in marketing emails
- Parameters: `utm_source=indietix`, `utm_medium=email|sms|push`, `utm_campaign={campaignId}`

---

### Phase 9: Testing
**Estimated Effort**: 4-6 hours

#### Unit Tests (Vitest)
**Location**: `packages/comm/src/__tests__/`

1. **Pipeline Idempotency**
   - Test that duplicate sends for same user+campaign+channel are skipped
   - Verify existing notification ID is returned

2. **Rate Limiting Batches**
   - Test that batches respect rate limits
   - Verify throttling windows work correctly

3. **Preference Gating**
   - Test that disabled channels are skipped
   - Test that disabled categories are skipped
   - Test transactional override

4. **Unsubscribe Token Flow**
   - Test token generation and validation
   - Test preference update on unsubscribe

#### Playwright E2E Tests
**Location**: `apps/admin/e2e/comm.spec.ts`, `apps/web/e2e/inbox.spec.ts`

1. **Admin New Send Wizard**
   - Navigate through all wizard steps
   - Verify recipient count estimation
   - Schedule a campaign
   - Verify campaign appears in outbox

2. **Admin Outbox Progress**
   - Verify progress updates
   - Test pause/resume functionality

3. **Web Inbox**
   - Verify notifications render
   - Test mark as read toggle
   - Test mark all as read

---

### Phase 10: Documentation
**Estimated Effort**: 1-2 hours
**Location**: `docs/comm.md`

#### Content
1. **Pipeline Overview**
   - Architecture diagram
   - Flow from segment → recipients → notifications

2. **Rate Limits**
   - Default limits per channel
   - How to configure overrides
   - Throttling behavior

3. **Compliance**
   - Preference gating behavior
   - Transactional override documentation
   - Unsubscribe flow

4. **API Reference**
   - tRPC endpoints with examples
   - Cron job configuration

---

## File Structure Summary

```
packages/
├── comm/                          # NEW PACKAGE
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── pipeline.ts            # Core send pipeline
│   │   ├── rate-limiter.ts        # Rate limiting logic
│   │   ├── idempotency.ts         # Idempotency helpers
│   │   ├── unsubscribe.ts         # Token generation/validation
│   │   └── __tests__/
│   │       ├── pipeline.spec.ts
│   │       ├── rate-limiter.spec.ts
│   │       └── unsubscribe.spec.ts
│   └── vitest.config.ts
│
├── api/src/routers/
│   ├── comm.ts                    # NEW - comm.send.*, comm.outbox.*
│   └── inbox.ts                   # NEW - inbox.list, inbox.read
│
├── db/prisma/
│   └── schema.prisma              # MODIFIED - UserConsent, Campaign.paused, Notification.campaignId
│
└── notify/src/
    └── send.ts                    # MODIFIED - Enhanced processPendingNotifications

apps/
├── admin/src/app/(dashboard)/
│   └── comm/                      # NEW
│       ├── page.tsx
│       ├── new/page.tsx
│       ├── outbox/page.tsx
│       ├── failed/page.tsx
│       └── layout.tsx
│
├── web/src/app/
│   ├── inbox/                     # NEW
│   │   └── page.tsx
│   ├── unsubscribe/               # NEW
│   │   └── page.tsx
│   └── api/
│       ├── unsubscribe/route.ts   # NEW
│       ├── trk/push-open/route.ts # NEW
│       └── cron/notifications/route.ts  # MODIFIED
│
└── mobile/app/
    └── (tabs)/
        └── notifications.tsx      # NEW or MODIFIED

docs/
└── comm.md                        # NEW
```

---

## Definition of Done Checklist

- [ ] `pnpm -w typecheck` passes
- [ ] `pnpm -w test` passes
- [ ] `pnpm -w build` passes
- [ ] Playwright tests for admin send wizard are green
- [ ] Playwright tests for web inbox are green
- [ ] All CI checks pass (excluding android-e2e which is non-blocking)
- [ ] PR created with title: `[comm] Communication Center (bulk send + inbox + A/B hooks + throttling + compliance)`

---

## Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rate limiting complexity | High | Start with simple token bucket, iterate |
| Idempotency edge cases | Medium | Comprehensive unit tests, unique DB constraint |
| Mobile inbox offline sync | Medium | Leverage existing React Query persistence |
| Large segment queries | Medium | Add pagination, use cursor-based queries |
| Unsubscribe token security | High | Use signed JWTs with expiration |

---

## Dependencies

- Existing `@indietix/notify` package
- Existing `@indietix/marketing` package
- Existing `@indietix/db` with Prisma
- Existing tRPC setup in `@indietix/api`
- Existing admin app structure
- Existing web app structure
- Existing mobile app structure

---

## Estimated Total Effort

| Phase | Hours |
|-------|-------|
| Phase 0: Data Model | 1-2 |
| Phase 1: Pipeline | 4-6 |
| Phase 2: API Endpoints | 3-4 |
| Phase 3: Schedulers | 3-4 |
| Phase 4: Admin UI | 6-8 |
| Phase 5: Web Inbox | 3-4 |
| Phase 6: Mobile Inbox | 2-3 |
| Phase 7: Compliance | 3-4 |
| Phase 8: Tracking | 2-3 |
| Phase 9: Testing | 4-6 |
| Phase 10: Documentation | 1-2 |
| **Total** | **33-46 hours** |

---

## Next Steps (Upon Approval)

1. Create feature branch: `devin/{timestamp}-comm-center`
2. Start with Phase 0 (schema changes) and run migration
3. Implement Phase 1 (pipeline) with unit tests
4. Continue through phases sequentially
5. Run local checks after each phase
6. Create PR after all phases complete
7. Wait for CI and address any failures
