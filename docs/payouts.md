# Payouts System Documentation

## Overview

The IndieTix payouts system enables automated calculation, approval, and processing of payments to event organizers. The system tracks revenue from confirmed bookings, subtracts refunds and platform fees, and manages the complete payout lifecycle from creation through completion.

## Payout Formula

```
Net Payable = GMV (Confirmed) - Refunds (Confirmed) - Platform Fees Kept
```

Where:

- **GMV (Gross Merchandise Value)**: Total ticket revenue from CONFIRMED bookings within the period
- **Refunds**: Total amount refunded to customers for CANCELLED bookings within the period
- **Platform Fees Kept**: Sum of convenience fees and platform fees collected (₹14 per ticket)

### Example Calculation

```
Period: Jan 1-31, 2024
- 50 tickets sold at ₹1000 each = ₹50,000 GMV
- 5 tickets refunded at ₹950 each = ₹4,750 refunds
- 50 tickets × ₹14 fees = ₹700 platform fees
- Net Payable = ₹50,000 - ₹4,750 - ₹700 = ₹44,550
```

## Payout Lifecycle

### Status Flow

```
PENDING → APPROVED → PROCESSING → COMPLETED
                  ↓
              CANCELLED
                  ↓
                FAILED
```

### Status Definitions

1. **PENDING**: Payout created, awaiting admin approval
2. **APPROVED**: Admin has approved, ready for processing
3. **PROCESSING**: Payment is being sent via provider
4. **COMPLETED**: Payment successfully transferred
5. **FAILED**: Payment processing failed
6. **CANCELLED**: Payout rejected by admin

## Creating Payouts

### Manual Creation (Organizer)

Organizers can request payouts through the `/payouts` page:

1. Click "Request Payout" button
2. Select period start and end dates
3. System calculates breakdown automatically
4. Payout created with PENDING status

**Validation Rules**:

- Period start must be before period end
- No existing PENDING/APPROVED/PROCESSING payout for same period
- Net payable amount must be positive

### Automated Creation (Cron)

Weekly cron job (`cron-payouts.yml`) automatically creates payouts:

- **Schedule**: Every Monday at 9:00 AM UTC
- **Period**: Previous 7 days
- **Endpoint**: `POST /api/cron/payouts`
- **Authentication**: Bearer token via `CRON_TOKEN` env var

```bash
# Manual trigger via curl
curl -X POST "https://yourdomain.com/api/cron/payouts" \
  -H "Authorization: Bearer ${CRON_TOKEN}" \
  -H "Content-Type: application/json"
```

## Admin Approval Workflow

### Approval Queue

Admins access pending payouts at `/payouts` (admin app):

1. View payout details including:
   - Organizer information
   - Period and breakdown
   - GMV, refunds, fees breakdown
   - Event and booking counts

2. Actions available:
   - **Approve**: Moves to APPROVED status
   - **Reject**: Moves to CANCELLED status
   - **View Details**: See full breakdown

### Bulk Actions

Admins can approve/reject multiple payouts simultaneously (future enhancement).

## Processing Payouts

### Provider Integration

The system supports multiple payout providers:

#### Fake Provider (Testing/CI)

Used automatically when:

- `NODE_ENV=test`
- Razorpay credentials not configured

Returns mock response:

```json
{
  "payoutId": "px_fake_1234567890abcdef",
  "status": "processed",
  "amount": 50000,
  "currency": "INR"
}
```

#### RazorpayX (Production - Optional)

Integration with RazorpayX for actual bank transfers:

```typescript
await paymentProvider.createPayout({
  account: "1234567890",
  ifsc: "HDFC0001234",
  amountPaise: 50000,
  mode: "NEFT", // or "IMPS"
});
```

**Configuration**:

```bash
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
```

### Processing Flow

1. Admin clicks "Process Payout" on APPROVED payout
2. Status updates to PROCESSING
3. System calls payment provider API
4. Provider response stored in `providerResponse` field
5. Status updates to COMPLETED or FAILED
6. `PaymentEvent` created for idempotency

### Idempotency

Duplicate webhook/processing prevented via `PaymentEvent` table:

- Unique constraint on `eventId` (provider's payout ID)
- Prevents double-processing of same payout

## CSV Export

### Export Format

Admins can export payout details as CSV for bank transfers:

```csv
beneficiary_name,account,ifsc,amount,utr
Sample Organizer,XXXX1234,N/A,500.00,px_fake_123
```

**Column Definitions**:

- `beneficiary_name`: Organizer business name
- `account`: Masked account number (if available)
- `ifsc`: Bank IFSC code (to be filled manually)
- `amount`: Payout amount in rupees (converted from paise)
- `utr`: UTR/transaction reference from provider

### Usage

1. Navigate to completed payout
2. Click "Export CSV" button
3. Download generated CSV file
4. Import to banking system for bulk transfers

## Database Schema

### Payout Model

```prisma
model Payout {
  id                String       @id @default(cuid())
  organizerId       String

  periodStart       DateTime
  periodEnd         DateTime

  amount            Int          // in paise
  currency          String       @default("INR")

  status            PayoutStatus @default(PENDING)

  // Audit fields
  beneficiaryName   String
  accountMasked     String?
  breakdown         Json         // { gmv, refunds, fees, netPayable, eventCount, bookingCount }

  // Provider fields
  provider          String?      // "FAKE" | "RAZORPAYX"
  providerPayoutId  String?
  providerResponse  Json?

  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  approvedAt        DateTime?
  approvedBy        String?
  processedAt       DateTime?
  completedAt       DateTime?

  organizer         Organizer    @relation(fields: [organizerId])
  paymentEvents     PaymentEvent[]
}

enum PayoutStatus {
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

### Breakdown JSON Structure

```typescript
interface PayoutBreakdown {
  gmv: number; // Total ticket revenue
  refunds: number; // Total refunds issued
  feesKept: number; // Platform fees retained
  netPayable: number; // Final amount to pay
  eventCount: number; // Number of events
  bookingCount: number; // Number of bookings
  refundCount: number; // Number of refunds
}
```

## API Reference

### Organizer Endpoints

#### Create Payout

```typescript
trpc.payouts.organizer.create.useMutation({
  periodStart: Date,
  periodEnd: Date,
});
```

**Returns**: `{ payout, breakdown }`

#### List Payouts

```typescript
trpc.payouts.organizer.list.useQuery({
  status?: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED",
  page: number
})
```

**Returns**: `{ payouts, total, page, totalPages }`

#### Get Payout Details

```typescript
trpc.payouts.organizer.getById.useQuery({
  payoutId: string,
});
```

**Returns**: Payout with organizer details

### Admin Endpoints

#### List All Payouts

```typescript
trpc.payouts.admin.list.useQuery({
  status?: PayoutStatus,
  page: number
})
```

**Returns**: `{ payouts, total, page, totalPages }` with organizer info

#### Approve Payout

```typescript
trpc.payouts.admin.approve.useMutation({
  payoutId: string,
});
```

**Returns**: Updated payout

#### Reject Payout

```typescript
trpc.payouts.admin.reject.useMutation({
  payoutId: string,
  reason?: string
})
```

**Returns**: Updated payout

#### Process Payout

```typescript
trpc.payouts.admin.process.useMutation({
  payoutId: string,
});
```

**Returns**: Updated payout with provider response

#### Export CSV

```typescript
trpc.payouts.admin.exportCsv.useQuery({
  payoutId: string,
});
```

**Returns**: `{ csv: string, filename: string }`

## Testing

### Unit Tests

Located in `packages/utils/src/__tests__/payout.spec.ts`:

```bash
pnpm --filter @indietix/utils test
```

**Test Coverage**:

- Payout calculation with confirmed bookings
- Refund handling
- Multiple refunds per booking
- Zero payout scenarios
- CSV formatting

### E2E Tests

#### Organizer Flow

Located in `apps/organizer/e2e/payouts.spec.ts`:

```bash
cd apps/organizer
pnpm test:e2e
```

**Scenarios**:

- Display payouts page with tabs
- Open request payout dialog
- Switch between pending/completed tabs
- Request new payout

#### Admin Flow

Located in `apps/admin/e2e/payouts.spec.ts`:

```bash
cd apps/admin
pnpm test:e2e
```

**Scenarios**:

- Display payouts management page
- View payout breakdown details
- Approve/reject actions
- Tab switching

## Security Considerations

### Authorization

- **Organizers**: Can only view/create their own payouts
- **Admins**: Can view/manage all payouts
- **Cron Jobs**: Require `CRON_TOKEN` authentication

### Data Protection

- Account numbers stored as masked (e.g., `XXXX1234`)
- Provider responses logged for audit trail
- All payout operations logged with timestamps

### Idempotency

- Duplicate webhook processing prevented via `PaymentEvent.eventId` unique constraint
- Payout status transitions validated (e.g., can't approve COMPLETED payout)

## Troubleshooting

### Common Issues

#### "No payable amount for this period"

**Cause**: GMV - Refunds - Fees ≤ 0

**Solution**:

- Check if bookings exist in period
- Verify bookings are CONFIRMED
- Ensure refunds haven't exceeded revenue

#### "A payout already exists for this period"

**Cause**: Duplicate payout request for same period

**Solution**:

- Check existing payouts in list
- Use different period dates
- Cancel existing payout if needed

#### Cron job not creating payouts

**Cause**: Authentication failure or missing env vars

**Solution**:

- Verify `CRON_TOKEN` is set correctly
- Check GitHub Actions secrets
- Review cron job logs

### Debug Queries

```sql
-- Check pending payouts
SELECT * FROM "Payout" WHERE status = 'PENDING';

-- View payout breakdown
SELECT
  id,
  "organizerId",
  amount,
  status,
  breakdown
FROM "Payout"
WHERE id = 'payout_id';

-- Check payment events for payout
SELECT * FROM "PaymentEvent" WHERE "payoutId" = 'payout_id';
```

## Future Enhancements

1. **Bulk Approval**: Select multiple payouts for batch approval
2. **Bank Account Management**: Store organizer bank details securely
3. **Automatic Processing**: Auto-process approved payouts
4. **Email Notifications**: Notify organizers of payout status changes
5. **Payout History**: Detailed audit trail with state transitions
6. **Scheduled Payouts**: Configure custom payout schedules per organizer
7. **Tax Documents**: Generate Form 16A/TDS certificates
8. **Multi-currency**: Support international organizers

## Support

For issues or questions:

- Check logs in `PaymentEvent` table
- Review payout `breakdown` JSON for calculation details
- Contact platform admin for manual intervention
