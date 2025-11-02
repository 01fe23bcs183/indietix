# Marketing Tooling Implementation Document

## Overview

Implementing first-class marketing tooling for IndieTix including:

1. Promo codes (organizer/admin scoped)
2. Price phases (early bird/last minute)
3. Email campaigns with segments
4. Tracking (open pixel, click redirect)
5. Reports (campaign metrics, promo code analytics)

## Implementation Log

### 2025-11-02 03:43:51 UTC - Project Initialization

**Action**: Created documentation files and todo list
**Details**:

- Pulled latest changes from main (now at commit 6ab2cc8)
- Created this document for detailed implementation notes
- Created comprehensive 24-item todo list covering all aspects of the feature
- Repository is clean and up to date with origin/main

**Next Steps**:

- Explore existing Prisma schema to understand current data models
- Review existing API router structure
- Understand current pricing logic in packages/utils/pricing.ts
- Check out a new git branch for the marketing feature

## Architecture Decisions

### Database Schema

**New Models to Add:**

1. **PromoCode**
   - `id`, `code`, `type` (PERCENT|FLAT), `value`, `startAt?`, `endAt?`
   - `usageLimit?`, `perUserLimit?`, `minPrice?`
   - `organizerId?` (null = admin-scoped)
   - `applicableEvents String[]?`, `applicableCategories String[]?`, `applicableCities String[]?`
   - `active Boolean` (admin override)
   - Timestamps: `createdAt`, `updatedAt`

2. **EventPricePhase**
   - `id`, `eventId`, `name`, `startsAt?`, `endsAt?`, `maxSeats?`, `price`
   - Relation: Event hasMany EventPricePhase

3. **Campaign**
   - `id`, `name`, `channel` (EMAIL|SMS), `status` (DRAFT|SCHEDULED|SENDING|SENT|FAILED)
   - `templateKey`, `scheduledAt?`, `createdBy` (userId)
   - `segmentId?` (optional, for targeting)
   - Timestamps: `createdAt`, `updatedAt`

4. **Segment**
   - `id`, `name`, `query Json` (DSL for filtering users)
   - `createdBy` (userId)
   - Timestamps: `createdAt`, `updatedAt`

5. **CampaignRecipient**
   - `id`, `campaignId`, `userId?`, `email`, `phone?`
   - `status` (PENDING|SENT|OPENED|CLICKED|BOUNCED)
   - `openedAt?`, `clickedAt?`
   - Timestamps: `createdAt`, `updatedAt`

**Booking Model Extensions:**

- Add `promoCodeId?` (optional relation to PromoCode)
- Add `campaignId?` (optional, for attribution via UTM)
- Add `discountAmount?` (amount saved via promo)

### API Design

**New Routers:**

1. **promosRouter** (organizer + admin)
   - `create`, `update`, `disable`, `list`, `get`
   - `validate({ code, eventId, qty })` - public endpoint for checkout

2. **pricingRouter** (public)
   - `effectivePrice({ eventId, now })` - returns active phase price or base price

3. **campaignsRouter** (organizer + admin)
   - `create`, `update`, `schedule`, `cancel`, `list`, `detail(id)`
   - `preview({ segmentId })` - preview recipient count

4. **segmentsRouter** (organizer + admin)
   - `create`, `update`, `list`, `get`, `testQuery({ query })`

**Integration Points:**

- Modify `booking.start` to accept optional `promoCode` parameter
- Integrate discount logic into `computeBookingAmounts`
- Add tracking pixel and click redirect routes

### UI/UX Approach

**Organizer App:**

- `/promos` - List/create/edit promo codes with event/category filters
- `/campaigns` - Campaign wizard (segment → template → schedule)
- `/campaigns/[id]` - Campaign detail with metrics (opens, clicks, conversions)

**Web App:**

- Event page: Show price phase badge ("Early bird ends in 2d 3h")
- Checkout: Promo code input with real-time validation and discount preview
- Attribution: Capture UTM parameters from campaign links

**Admin App:**

- Oversight for all promos/campaigns
- Ability to force-disable abusive codes
- System-wide campaign analytics

## Challenges & Solutions

(To be documented as issues arise)

## Testing Strategy

(To be documented during test implementation)
