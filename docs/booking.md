# IndieTix Booking Core Documentation

## Overview

The IndieTix booking core provides an end-to-end booking flow with payment orchestration, seat holds, and idempotent webhook processing. The system supports both Razorpay (production) and a fake payment provider (testing).

## Architecture

### Domain Flow

1. **Seat Hold**: User selects N seats → Create Booking (PENDING/PENDING) with 15-minute hold TTL
2. **Payment**: Create Razorpay Order for finalAmount (base + fees + GST)
3. **Success**: Webhook verification → Mark CONFIRMED/COMPLETED → Increment Event.bookedSeats atomically
4. **Failure/Timeout**: Automatically release holds and revert inventory

### Key Components

#### Pricing (`packages/utils/src/pricing.ts`)
- `computeBookingAmounts(ticketPrice, quantity)` - Calculates breakdown for multiple tickets
- Returns: subtotal, convenienceFee, platformFee, gst, finalAmount
- Formula: `finalAmount = (ticketPrice * qty) + (fees * qty) + round(fees * qty * 0.18)`

#### Payment Providers (`packages/payments/`)
- **RazorpayProvider**: Real Razorpay integration with HMAC webhook verification
- **FakePaymentProvider**: Test-only provider (no network calls)
- Auto-selection: Uses fake provider when `NODE_ENV=test` or Razorpay keys missing

#### Booking Router (`packages/api/src/routers/booking.ts`)
- `start({eventId, quantity, userId})` - Creates booking with seat hold
- `poll({bookingId})` - Returns live booking status
- `cancel({bookingId})` - Cancels pending booking
- `confirmPayment({bookingId})` - Internal procedure for webhook handler

#### Webhook Handler (`apps/web/src/app/api/webhooks/razorpay/route.ts`)
- Verifies HMAC signature with `RAZORPAY_KEY_SECRET`
- Stores webhook event with unique `eventId` for idempotency
- Confirms booking and increments seats atomically
- Handles `payment.captured` and `payment.failed` events

#### Checkout UI (`apps/web/src/app/checkout/[bookingId]/page.tsx`)
- Shows event details, amount breakdown, hold timer
- Displays "Simulate Payment Success" button (fake provider)
- Auto-polls booking status every 3 seconds
- Redirects to success page when confirmed

#### Cron Cleanup (`apps/web/src/app/api/cron/holds/route.ts`)
- Finds PENDING bookings with `holdExpiresAt < now`
- Marks as CANCELLED with `cancelledAt` timestamp
- Protected by `CRON_TOKEN` authorization header
- Runs every 5 minutes via GitHub Actions

## Data Model

### Booking Table
```prisma
model Booking {
  id                 String        @id @default(cuid())
  eventId            String
  userId             String
  ticketNumber       String        @unique
  seats              Int
  ticketPrice        Int
  convenienceFee     Int
  platformFee        Int
  finalAmount        Int
  paymentStatus      PaymentStatus @default(PENDING)
  status             BookingStatus @default(PENDING)
  razorpayOrderId    String?
  razorpayPaymentId  String?
  holdExpiresAt      DateTime
  cancelledAt        DateTime?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}
```

### PaymentEvent Table
```prisma
model PaymentEvent {
  id        String   @id @default(cuid())
  provider  String
  eventId   String   @unique  // Enforces idempotency
  bookingId String
  payload   Json
  createdAt DateTime @default(now())
}
```

### Event Table (Updated)
```prisma
model Event {
  // ... existing fields
  bookedSeats Int @default(0)  // Atomically incremented on CONFIRMED
}
```

## Concurrency Control

### Seat Reservation
```typescript
async function reserveSeats(eventId: string, quantity: number) {
  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    
    if (event.bookedSeats + quantity > event.totalSeats) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough seats" });
    }
    
    return event;
  });
}
```

### Booking Confirmation
```typescript
async function confirmBookingAndIncrementSeats(bookingId: string) {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    
    // Idempotency check
    if (booking.status === "CONFIRMED" && booking.paymentStatus === "COMPLETED") {
      return booking;
    }
    
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", paymentStatus: "COMPLETED" }
    });
    
    await tx.event.update({
      where: { id: booking.eventId },
      data: { bookedSeats: { increment: booking.seats } }
    });
    
    return booking;
  });
}
```

## Environment Configuration

### Development (Fake Provider)
```env
NODE_ENV=development
# No Razorpay keys needed - uses FakePaymentProvider
```

### Testing (Fake Provider)
```env
NODE_ENV=test
# No Razorpay keys needed - uses FakePaymentProvider
```

### Production (Razorpay)
```env
NODE_ENV=production
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
CRON_TOKEN=xxxxx  # For cron endpoint security
```

## API Usage

### Start Booking
```typescript
const result = await trpc.booking.start.mutate({
  eventId: "evt_123",
  quantity: 2,
  userId: "usr_456"
});

// Returns:
// {
//   bookingId: "bkg_789",
//   ticketNumber: "TIX-ABC123-XYZ",
//   holdExpiresAt: "2025-11-01T13:45:00Z",
//   amountBreakdown: { subtotal, convenienceFee, platformFee, gst, finalAmount },
//   paymentProvider: { kind: "razorpay" | "fake", orderId, keyId? }
// }
```

### Poll Booking Status
```typescript
const booking = await trpc.booking.poll.query({
  bookingId: "bkg_789"
});

// Returns:
// {
//   bookingId, ticketNumber, status, paymentStatus,
//   holdExpiresAt, event: { title, date, venue, city }, finalAmount
// }
```

### Cancel Booking
```typescript
await trpc.booking.cancel.mutate({
  bookingId: "bkg_789"
});
```

## Webhook Setup

### Razorpay Dashboard Configuration
1. Go to Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events: `payment.captured`, `payment.failed`
4. Copy webhook secret to `RAZORPAY_KEY_SECRET` env var

### Webhook Payload Example
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxxxx",
        "order_id": "order_xxxxx",
        "amount": 51700,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

## Cron Setup

### GitHub Actions (Recommended)
```yaml
# .github/workflows/cron-holds.yml
name: Cleanup Expired Holds
on:
  schedule:
    - cron: "*/5 * * * *"  # Every 5 minutes

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_TOKEN }}" \
            https://yourdomain.com/api/cron/holds
```

### Vercel Cron (Alternative)
```json
{
  "crons": [{
    "path": "/api/cron/holds",
    "schedule": "*/5 * * * *"
  }]
}
```

## Testing

### Unit Tests
```bash
# Test pricing calculations
pnpm --filter @indietix/utils test

# Test booking logic
pnpm --filter @indietix/api test
```

### E2E Tests
```bash
# Test checkout flow with fake provider
NODE_ENV=test npx playwright test apps/web/e2e/booking.spec.ts
```

### Manual Testing with Fake Provider
1. Set `NODE_ENV=test` or remove Razorpay keys
2. Start booking flow
3. Navigate to checkout page
4. Click "Simulate Payment Success"
5. Verify booking status changes to CONFIRMED

## Idempotency Guarantees

### Webhook Processing
- Each webhook event has unique `eventId`
- `PaymentEvent` table enforces uniqueness constraint
- Duplicate webhook calls return early without side effects
- Booking confirmation checks current status before updating

### Seat Increment
- Only increments on first CONFIRMED transition
- Subsequent confirmations skip increment
- Atomic transaction ensures consistency

## Troubleshooting

### Booking fails with "Not enough seats"
- Check `Event.bookedSeats` vs `Event.totalSeats`
- Verify no race conditions in concurrent bookings
- Check for expired holds not yet cleaned up

### Webhook verification fails
- Verify `RAZORPAY_KEY_SECRET` matches Razorpay dashboard
- Check webhook signature header `x-razorpay-signature`
- Ensure raw body is used for HMAC verification

### Hold cleanup not running
- Verify `CRON_TOKEN` is set in environment
- Check GitHub Actions workflow is enabled
- Verify cron endpoint returns 200 status

### Tests fail with network errors
- Ensure `NODE_ENV=test` is set
- Verify fake provider is being used
- Check no real Razorpay keys in test environment

## Future Enhancements

- Add refund support for cancelled bookings
- Implement partial refunds for event cancellations
- Add booking modification (change quantity/seats)
- Support multiple payment providers (Paytm, PhonePe)
- Add booking history and receipt generation
- Implement waitlist for sold-out events
