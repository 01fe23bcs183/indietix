# Marketing Tooling Implementation Document

## Overview
Implementing first-class marketing tooling for IndieTix including:
1. Promo codes (organizer/admin scoped)
2. Price phases (early bird/last minute)
3. Email campaigns with segments
4. Tracking (open pixel, click redirect)
5. Reports (campaign metrics, promo redemptions)

## Implementation Log

### 2025-11-02 05:21:47 UTC - Session Start
**Action**: Created documentation files and todo list
**Status**: Planning phase initiated
**Notes**: 
- Created progress.md with visual progress bar
- Created this document for detailed tracking
- Generated 26-task todo list covering all requirements

### 2025-11-02 05:22:50 UTC - Codebase Exploration Complete
**Action**: Explored existing codebase structure
**Status**: Understanding complete
**Findings**:
- Prisma schema has comprehensive models including User, Event, Booking, Notification system
- Existing pricing utils in packages/utils/src/pricing.ts with computeBookingAmounts function
- API router structure uses tRPC with nested routers (organizer, admin)
- Notification system already implemented with Email/SMS/Push providers
- Need to extend Booking model with promoCodeId and campaignId
- Need to create new models: PromoCode, EventPricePhase, Campaign, Segment, CampaignRecipient

### 2025-11-02 05:30:00 UTC - Prisma Schema & Migration Complete
**Action**: Generated Prisma migration and client
**Status**: Database schema complete
**Details**:
- Created migration file: 20251102052659_add_marketing_tooling_models
- Added enums: PromoCodeType, CampaignChannel, CampaignStatus, CampaignRecipientStatus
- Added models: PromoCode, EventPricePhase, Campaign, Segment, CampaignRecipient
- Extended Booking model with promoCodeId and campaignId
- Generated Prisma client successfully

### Next Steps
1. Create discount utility functions (packages/utils/discounts.ts)
2. Update pricing.ts to integrate discount logic
3. Create segment query engine (packages/marketing/segments.ts)
4. Implement API endpoints for promos, price phases, campaigns, segments
5. Create tracking routes and UI components

## Technical Decisions

### Database Schema
(To be documented as decisions are made)

### API Design
(To be documented as endpoints are implemented)

### UI/UX Considerations
(To be documented as components are built)

## Challenges & Solutions
(To be documented as issues arise)

## Testing Strategy
- Unit tests for discount logic, segment queries, price phase calculations
- Playwright E2E tests for promo checkout flow and campaign creation
- CI-safe fake providers for email/SMS (no external dependencies)

## CI Requirements
- All tests must pass offline
- No external API credentials required
- Fake notification providers for testing
