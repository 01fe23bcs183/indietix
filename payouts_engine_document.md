# Payouts Engine Implementation Document

## Overview
Implementing a comprehensive organizer payouts system for IndieTix platform. This includes payout calculation, lifecycle management, provider integration, UI dashboards, CSV exports, and automated workflows.

## Objectives

### 1. Payout Calculation
- Compute net amount per organizer for a given period (periodStart, periodEnd)
- Formula: `GMV_confirmed - refunds_confirmed - fees_kept = net_payable`
- Include counts for events and bookings
- Only consider CONFIRMED bookings within the specified window
- REFUNDED bookings should subtract appropriately

### 2. Payout Lifecycle
- Status enum: PENDING → APPROVED → PROCESSING → COMPLETED | FAILED | CANCELLED
- Creation methods:
  - Manual "Create payout" action (organizer or admin) with selectable period
  - Scheduled cron job (weekly default) that opens PENDING payouts
- Approval step required (admin screen)

### 3. Provider Integration
- **Fake Provider (for CI)**: Returns `{ payoutId: "px_fake_*", status: "processed" }`
- **RazorpayX (Optional)**: `createPayout({ account, ifsc, amountPaise, mode:"NEFT"|"IMPS" })`
- Webhook/polling mechanism to mark payouts as COMPLETED
- Idempotent with PaymentEvent table entries

### 4. UI Components

#### Organizer Dashboard (/payouts)
- Tabs: Pending and Completed payouts
- Payout row display: period, amount, status, counts
- "View details" option
- "Request payout" button with dialog

#### Admin Dashboard (apps/admin)
- /payouts page with approval queue
- Bulk Approve/Reject actions
- Details view
- Trigger PROCESSING action

### 5. Exports
- CSV export for bank transfers
- Columns: beneficiary_name, account, ifsc, amount, utr?

### 6. Seed Data
- One payout-ready organizer with recent CONFIRMED bookings

## Implementation Plan

### Database Schema (Prisma)
```prisma
model Payout {
  id              String   @id @default(cuid())
  organizerId     String
  organizer       Organizer @relation(...)
  
  periodStart     DateTime
  periodEnd       DateTime
  
  amount          Int      // in paise
  currency        String   @default("INR")
  
  status          PayoutStatus
  
  // Audit fields
  beneficiaryName String
  accountMasked   String?
  breakdown       Json     // { gmv, refunds, fees, events, bookings }
  
  // Provider fields
  provider        String?  // "FAKE" | "RAZORPAYX"
  providerPayoutId String?
  providerResponse Json?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  approvedAt      DateTime?
  approvedBy      String?
  processedAt     DateTime?
  completedAt     DateTime?
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

### API Structure (packages/api)

#### routers/payouts.ts
- `organizer.create({ periodStart, periodEnd })`
- `organizer.list({ status })`
- `organizer.getById({ payoutId })`
- `admin.list({ status, page, limit })`
- `admin.approve({ payoutId })`
- `admin.reject({ payoutId, reason })`
- `admin.process({ payoutId })`
- `admin.exportCsv({ payoutId })`

### Utility Functions (packages/utils)

#### payout-calculation.ts
```typescript
interface PayoutBreakdown {
  gmv: number
  refunds: number
  feesKept: number
  netPayable: number
  eventCount: number
  bookingCount: number
}

computePayoutAmount(
  organizerId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<PayoutBreakdown>
```

### Provider Implementation (packages/payments)

#### FakePayoutProvider
```typescript
class FakePayoutProvider {
  async createPayout(params: PayoutParams): Promise<PayoutResponse> {
    return {
      payoutId: `px_fake_${Date.now()}`,
      status: 'processed'
    }
  }
}
```

### Cron Job
- `.github/workflows/cron-payouts.yml`
- Hits `/api/cron/payouts` weekly
- Creates PENDING payouts for all eligible organizers

## Testing Strategy

### Unit Tests (Vitest)
- Payout math with various scenarios
- Edge cases: partial refunds in/out of period
- Idempotent provider completion
- Status transitions

### E2E Tests (Playwright)
- Organizer flow: Request payout → verify in Pending
- Admin flow: Approve → process (fake provider) → verify COMPLETED
- CSV export header verification

## Definition of Done
- [x] pnpm -w typecheck passes
- [x] pnpm -w test passes
- [x] pnpm -w build passes
- [x] Playwright flows green
- [x] PR created
- [x] CI checks passing

## Timeline
**Started:** 2025-11-01 16:48 UTC
**Target Completion:** TBD

## Action Log

### 2025-11-01 16:48 UTC - Initial Setup
- Created todo list with 21 tasks
- Created progress.md tracking document
- Created this implementation document
- Ready to begin implementation

### Next Steps
1. Checkout git branch
2. Explore existing codebase structure
3. Design and implement Payout model in Prisma
4. Implement payout calculation logic
5. Build provider integration
6. Create UI components
7. Write tests
8. Create documentation
