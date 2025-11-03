# IndieTix Marketing Tooling - Progress Tracker

## Progress Bar
```
[███░░░░░░░░░░░░░░░░░] 15% Complete
```

## Current Status
**Phase:** Database Schema Design & Implementation
**Last Updated:** 2025-11-02 05:23 UTC

## Completed Tasks
- ✅ Created marketing_tooling_DOCUMENT.md documentation
- ✅ Pulled latest changes from main
- ✅ Created todo list with 27 tasks
- ✅ Created git branch devin/1762060997-marketing-tooling
- ✅ Explored existing codebase structure (Prisma schema, API routers, pricing utils)

## In Progress
- 🔄 Designing and implementing Prisma models (PromoCode, EventPricePhase, Campaign, Segment, CampaignRecipient)

## Pending Tasks
- ⏳ Extend Booking model with promoCodeId and campaignId fields
- ⏳ Create packages/utils/discounts.ts with promo code logic
- ⏳ Create packages/marketing/segments.ts with segment query engine
- ⏳ Implement promo code API endpoints (create/update/disable/validate)
- ⏳ Implement price phase API endpoints (effectivePrice)
- ⏳ Implement campaign API endpoints (create/schedule/cancel/list/detail)
- ⏳ Implement segment API endpoints (create/update/list)
- ⏳ Create tracking routes (/api/trk/open and /api/trk/c)
- ⏳ Build organizer promo management UI (/promos page)
- ⏳ Build organizer campaign wizard UI (/campaigns page)
- ⏳ Update web event detail page to show price phase badges
- ⏳ Update web checkout page to support promo code entry
- ⏳ Add admin oversight pages for promos and campaigns
- ⏳ Write unit tests for discounts, segments, and price phases
- ⏳ Write Playwright tests for promo code checkout flow
- ⏳ Write Playwright tests for campaign creation and tracking
- ⏳ Create docs/marketing.md documentation
- ⏳ Run pnpm install and generate Prisma client
- ⏳ Run pnpm -w build
- ⏳ Run pnpm -w test
- ⏳ Run npx playwright test
- ⏳ Create PR
- ⏳ Wait for CI checks to pass

## Key Milestones
1. [ ] Database schema and migrations complete (PromoCode, EventPricePhase, Campaign, Segment, CampaignRecipient)
2. [ ] Discount logic implemented with promo validation
3. [ ] Segment query engine functional
4. [ ] API endpoints complete (promos, price phases, campaigns, segments)
5. [ ] Tracking routes operational (/api/trk/open, /api/trk/c)
6. [ ] Organizer UI complete (promos, campaigns)
7. [ ] Web checkout with promo code support
8. [ ] All tests passing
9. [ ] PR created and CI passing

## Notes
- Promo codes: PERCENT/FLAT types with usage limits, date ranges, scope (organizer/admin)
- Price phases: Early bird/last minute pricing with time/seat constraints
- Campaigns: Email-based with segment targeting, open/click tracking
- Segment DSL: city, categories, attended_in_last_days, price_ceiling
- No promo stacking; discounts apply before fees
- CI-safe: No external dependencies required
