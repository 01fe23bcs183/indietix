# Refunds & Cancellations

## Overview

IndieTix implements a policy-driven refund system that allows customers to cancel confirmed bookings and receive refunds based on configurable rules. The system is designed to be idempotent, transparent, and safe for both customers and organizers.

## Refund Policy

### Default Policy

- **Cancellation Fee**: ₹50 (flat fee, configurable per event)
- **Refundable Amount**: Base ticket price minus cancellation fee
- **Non-Refundable**: Platform support (₹10), payment gateway (₹2), server maintenance (₹2), and GST on fees

### Per-Event Configuration

Event organizers can customize the following fields:

- `allowCancellation` (boolean, default: true) - Whether cancellations are allowed
- `cancellationDeadlineHours` (integer, default: 24) - Hours before event start when cancellations are no longer allowed
- `cancellationFeeFlat` (integer, default: 50) - Flat cancellation fee in paise

## Refund Calculation Examples

### Example 1: ₹199 Ticket (1 seat)

**Original Booking:**
- Ticket Price: ₹199.00
- Payment Gateway: ₹2.00
- Server Maintenance: ₹2.00
- Platform Support: ₹10.00
- GST (18% on fees): ₹3.00
- **Total Paid**: ₹216.00

**Refund (before deadline):**
- Refundable: ₹199.00 - ₹0.50 = ₹198.50
- Non-Refundable: ₹2.00 + ₹2.00 + ₹10.00 + ₹3.00 + ₹0.50 = ₹17.50

### Example 2: ₹500 Ticket (3 seats)

**Original Booking:**
- Ticket Price: ₹1,500.00 (₹500 × 3)
- Payment Gateway: ₹6.00 (₹2 × 3)
- Server Maintenance: ₹6.00 (₹2 × 3)
- Platform Support: ₹30.00 (₹10 × 3)
- GST (18% on fees): ₹8.00
- **Total Paid**: ₹1,550.00

**Refund (before deadline):**
- Refundable: ₹1,500.00 - ₹0.50 = ₹1,499.50
- Non-Refundable: ₹6.00 + ₹6.00 + ₹30.00 + ₹8.00 + ₹0.50 = ₹50.50

### Example 3: ₹999 Ticket (1 seat, custom ₹100 cancellation fee)

**Original Booking:**
- Ticket Price: ₹999.00
- Fees + GST: ₹17.00
- **Total Paid**: ₹1,016.00

**Refund (before deadline):**
- Refundable: ₹999.00 - ₹1.00 = ₹998.00
- Non-Refundable: ₹17.00 + ₹1.00 = ₹18.00

## Cancellation Flow

### Customer-Initiated Cancellation

1. Customer navigates to their booking page
2. System checks if cancellation is allowed:
   - Event must have `allowCancellation = true`
   - Current time must be before `cancellationDeadlineHours` before event start
   - Booking must be in `CONFIRMED` status with `COMPLETED` payment
3. Customer sees refund preview with exact breakdown
4. Customer confirms cancellation
5. System creates `Refund` record with status `APPROVED`
6. System transitions to `PROCESSING` and calls payment provider
7. On success:
   - Refund status → `SUCCEEDED`
   - Booking status → `CANCELLED`
   - Payment status → `REFUNDED`
   - Event `bookedSeats` decremented
   - Waitlist offers issued (if any)
8. On failure:
   - Refund status → `FAILED`
   - Error message stored in `failureReason`

### Organizer Refund Queue

Organizers can view all refund requests for their events:

- **Pending**: Awaiting approval (if manual approval is required)
- **Approved**: Approved and ready for processing
- **Processing**: Payment provider is processing the refund
- **Succeeded**: Refund completed successfully
- **Failed**: Refund failed (with reason)
- **Rejected**: Organizer rejected the refund request

## Idempotency

The refund system is designed to be idempotent:

1. **Duplicate Prevention**: System checks for existing refunds before creating new ones
2. **Status Guards**: All state transitions check current status before updating
3. **Transaction Safety**: Database transactions ensure atomic updates
4. **Event Tracking**: All payment provider events are logged in `PaymentEvent` table

## Database Schema

### Refund Model

```prisma
model Refund {
  id                String       @id @default(cuid())
  bookingId         String
  amount            Int          // Amount in paise
  currency          String       @default("INR")
  status            RefundStatus @default(PENDING)
  reason            String?      // Customer-provided reason
  provider          String       // "fake" or "razorpay"
  providerRefundId  String?      // Provider's refund ID
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  processedAt       DateTime?
  failedAt          DateTime?
  failureReason     String?
  
  booking           Booking      @relation(fields: [bookingId], references: [id])
  paymentEvents     PaymentEvent[]
}

enum RefundStatus {
  PENDING
  APPROVED
  PROCESSING
  SUCCEEDED
  FAILED
  REJECTED
}
```

## API Endpoints

### Get Refund Preview

```typescript
trpc.booking.getRefundPreview.useQuery({ bookingId: string })
```

Returns:
- `canCancel`: boolean
- `reason`: string (if cannot cancel)
- `refundableAmount`: number (in paise)
- `nonRefundableBreakdown`: object
- `message`: string

### Request Cancellation

```typescript
trpc.booking.requestCancellation.useMutation({
  bookingId: string,
  reason?: string
})
```

Returns:
- `success`: boolean
- `refundId`: string
- `refundAmount`: number (in paise)
- `message`: string

## Testing

### Unit Tests

Located in `packages/utils/src/__tests__/refund.spec.ts`:

- Refund calculation for various ticket prices (₹199, ₹500, ₹999)
- Multiple quantity handling
- Deadline enforcement
- Custom cancellation fees
- Late refund percentage (if configured)
- Edge cases (negative amounts, zero refunds)

### E2E Tests

Located in `apps/web/e2e/cancellation.spec.ts`:

- Cancel booking before deadline
- Verify refund amount displayed
- Confirm cancellation completes
- Verify booking status updated
- Verify seats freed

## Payment Provider Integration

### FakePaymentProvider (Tests)

```typescript
async createRefund(params: {
  paymentId: string;
  amountPaise: number;
  speed?: "normal" | "optimum";
}): Promise<RefundResult>
```

Returns immediately with `status: "processed"` for testing.

### RazorpayProvider (Production)

```typescript
async createRefund(params: {
  paymentId: string;
  amountPaise: number;
  speed?: "normal" | "optimum";
}): Promise<RefundResult>
```

Calls Razorpay Refunds API:
- `POST /payments/{paymentId}/refund`
- Returns refund ID and status
- Webhook events tracked in `PaymentEvent` table

## Webhook Handling

Razorpay sends webhook events for refund status updates:

- `refund.created`
- `refund.processed`
- `refund.failed`

These are handled in `apps/web/app/api/webhooks/razorpay/route.ts` and stored in the `PaymentEvent` table with `providerEventType` and `refundId` fields.

## Edge Cases

1. **Event Already Started**: No refund allowed
2. **Past Deadline**: No refund allowed (unless `allowLateRefundPercent` is set)
3. **Already Cancelled**: Error returned
4. **Pending Booking**: Use simple cancel (no refund)
5. **Duplicate Refund Request**: Error returned
6. **Provider Failure**: Refund marked as `FAILED` with reason
7. **Negative Refund Amount**: Clamped to zero

## Configuration

Environment variables:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Per-event configuration in Event model:

```typescript
{
  allowCancellation: true,
  cancellationDeadlineHours: 24,
  cancellationFeeFlat: 50, // in paise
}
```

## Monitoring

Key metrics to monitor:

- Refund success rate
- Average refund processing time
- Failed refunds (by reason)
- Cancellation rate by event
- Revenue impact of cancellations
