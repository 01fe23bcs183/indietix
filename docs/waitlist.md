# Waitlist System

## Overview

IndieTix implements a FIFO (First-In-First-Out) waitlist system that automatically offers seats to waiting customers when bookings are cancelled or seats become available. The system uses time-limited offers to ensure fair distribution and prevent seat hoarding.

## How It Works

### 1. Joining the Waitlist

Customers can join the waitlist when:
- Event status is `PUBLISHED` or `SOLD_OUT`
- Event has no available seats (or organizer wants to manage waitlist)

Required information:
- Email address (required)
- Phone number (optional)
- User ID (optional, if logged in)

### 2. Seat Release

Seats are freed when:
- Customer cancels a confirmed booking (with refund)
- Pending booking expires (hold timeout)
- Organizer manually releases seats

### 3. Offer Creation

When seats are freed:
1. System queries `ACTIVE` waitlist entries ordered by `createdAt` (FIFO)
2. Creates `WaitlistOffer` records for the first N entries
3. Updates entry status to `INVITED`
4. Sets offer expiration time (default: 30 minutes)
5. Sends email notification (if configured)

### 4. Offer Claim

Customer receives email with unique offer link:
- Link format: `/offers/{offerId}`
- Page shows countdown timer
- Customer clicks "Claim Seat" button
- System validates offer is still valid
- Offer status → `CLAIMED`
- Entry status → `CLAIMED`
- Customer redirected to event page to complete booking

### 5. Offer Expiry

If customer doesn't claim within time limit:
- Cron job runs every 5 minutes
- Finds offers with `status=PENDING` and `expiresAt < now`
- Updates offer status → `EXPIRED`
- Reverts entry status → `ACTIVE`
- Entry goes back to waitlist queue

## Database Schema

### WaitlistEntry Model

```prisma
model WaitlistEntry {
  id         String         @id @default(cuid())
  eventId    String
  userId     String?        // Optional: if user is logged in
  email      String         // Required for notifications
  phone      String?        // Optional
  status     WaitlistStatus @default(ACTIVE)
  createdAt  DateTime       @default(now())
  invitedAt  DateTime?      // When offer was created
  claimedAt  DateTime?      // When offer was claimed
  expiredAt  DateTime?      // When entry expired (if applicable)
  
  event      Event          @relation(fields: [eventId], references: [id])
  offers     WaitlistOffer[]
}

enum WaitlistStatus {
  ACTIVE    // Waiting in queue
  INVITED   // Has active offer
  CLAIMED   // Claimed an offer
  EXPIRED   // Entry expired (not currently used)
}
```

### WaitlistOffer Model

```prisma
model WaitlistOffer {
  id         String              @id @default(cuid())
  eventId    String
  entryId    String
  quantity   Int                 @default(1)
  expiresAt  DateTime            // Offer expiration time
  status     WaitlistOfferStatus @default(PENDING)
  createdAt  DateTime            @default(now())
  claimedAt  DateTime?
  expiredAt  DateTime?
  
  entry      WaitlistEntry       @relation(fields: [entryId], references: [id])
}

enum WaitlistOfferStatus {
  PENDING    // Offer available to claim
  CLAIMED    // Customer claimed the offer
  EXPIRED    // Offer expired
  CANCELLED  // Offer cancelled by system/organizer
}
```

## API Endpoints

### Join Waitlist

```typescript
trpc.waitlist.join.useMutation({
  eventId: string,
  email: string,
  phone?: string,
  userId?: string
})
```

Returns:
- `success`: boolean
- `entryId`: string
- `message`: string

### Check Waitlist Status

```typescript
trpc.waitlist.status.useQuery({
  eventId: string,
  email: string
})
```

Returns:
- `isOnWaitlist`: boolean
- `status`: WaitlistStatus | null
- `offer`: { id, quantity, expiresAt, status } | null

### Get Offer Details

```typescript
trpc.waitlist.getOffer.useQuery({
  offerId: string
})
```

Returns:
- `id`: string
- `quantity`: number
- `expiresAt`: Date
- `status`: WaitlistOfferStatus
- `event`: Event details

### Claim Offer

```typescript
trpc.waitlist.claim.useMutation({
  offerId: string
})
```

Returns:
- `success`: boolean
- `eventId`: string
- `quantity`: number
- `message`: string

## Waitlist Flow Sequence

```
1. Customer → Join Waitlist
   ↓
2. Entry Created (status: ACTIVE)
   ↓
3. [Wait for seat to become available]
   ↓
4. Seat Freed (cancellation/expiry)
   ↓
5. System → Issue Offers (FIFO)
   ↓
6. Entry Updated (status: INVITED)
   ↓
7. Offer Created (status: PENDING, expiresAt: now + 30min)
   ↓
8. Email Sent (with offer link)
   ↓
9a. Customer Claims → Offer (status: CLAIMED)
    ↓
    Entry (status: CLAIMED)
    ↓
    Redirect to Event Page
    
9b. Customer Doesn't Claim → Cron Job Expires Offer
    ↓
    Offer (status: EXPIRED)
    ↓
    Entry (status: ACTIVE) [back to queue]
```

## Cron Job

### Waitlist Offer Expiry

**File**: `.github/workflows/cron-waitlist.yml`

**Schedule**: Every 5 minutes

**Endpoint**: `GET /api/cron/waitlist`

**Authentication**: Bearer token via `CRON_TOKEN` secret

**Logic**:
1. Find all offers with `status=PENDING` and `expiresAt < now`
2. For each expired offer:
   - Update offer: `status=EXPIRED`, `expiredAt=now`
   - Update entry: `status=ACTIVE`, `invitedAt=null`
3. Return count of expired offers

## Configuration

### Offer TTL

Default: 30 minutes

Located in `packages/api/src/lib/waitlist.ts`:

```typescript
const WAITLIST_OFFER_TTL_MINUTES = 30;
```

### Cron Schedule

Located in `.github/workflows/cron-waitlist.yml`:

```yaml
schedule:
  - cron: "*/5 * * * *"  # Every 5 minutes
```

### Environment Variables

```env
CRON_TOKEN=your-secret-token
CRON_ENDPOINT_URL=https://indietix.vercel.app
```

## UI Components

### Event Page (Sold Out)

When event is sold out, show "Join Waitlist" button:

```tsx
<button onClick={() => joinWaitlist.mutate({ eventId, email, phone })}>
  Join Waitlist
</button>
```

### Offer Page

Located at `/offers/[offerId]`:

- Shows event details
- Countdown timer (updates every second)
- "Claim Seat" button
- Expiry warning

Key features:
- Real-time countdown
- Auto-disable on expiry
- Redirect to event page on claim
- Error handling for expired/claimed offers

## Email Notifications

When an offer is created, send email to customer:

**Subject**: "Seat Available: {Event Title}"

**Body**:
```
Good news! A seat has become available for {Event Title}.

You have been offered {quantity} seat(s) from the waitlist.

This offer expires in 30 minutes. Click the link below to claim your seat:

{offer_link}

If you don't claim within 30 minutes, the offer will be given to the next person on the waitlist.

Thanks,
IndieTix Team
```

**Implementation**: Use Resend API (if `RESEND_API_KEY` is configured)

## Testing

### Unit Tests

Located in `packages/api/src/__tests__/waitlist.spec.ts` (to be created):

- FIFO order enforcement
- Offer creation logic
- Offer expiry logic
- Duplicate entry prevention
- Status transitions

### E2E Tests

Located in `apps/web/e2e/waitlist.spec.ts` (to be created):

- Join waitlist for sold-out event
- Receive offer when seat becomes available
- Claim offer and proceed to checkout
- Offer expires if not claimed

## Edge Cases

1. **Multiple Seats Freed**: Create multiple offers (one per seat, FIFO order)
2. **Duplicate Email**: Return existing entry (idempotent)
3. **Offer Already Claimed**: Show "Already Claimed" message
4. **Offer Expired**: Show "Offer Expired" message
5. **Event Cancelled**: Notify all waitlist entries (future enhancement)
6. **No Waitlist Entries**: No-op when seats are freed

## Monitoring

Key metrics to monitor:

- Waitlist conversion rate (offers claimed / offers created)
- Average time to claim offer
- Offer expiry rate
- Waitlist size by event
- Time spent on waitlist (entry creation to offer claim)

## Future Enhancements

1. **SMS Notifications**: Send SMS in addition to email
2. **Priority Waitlist**: Allow organizers to prioritize certain customers
3. **Bulk Offers**: Offer multiple seats to one customer
4. **Waitlist Limits**: Cap waitlist size per event
5. **Auto-Checkout**: Automatically create booking on claim (with payment hold)
6. **Waitlist Analytics**: Dashboard for organizers to see waitlist metrics
