# IndieTix Marketing Tooling - Progress Tracker

## Progress Bar
```
[████░░░░░░░░░░░░░░░░] 20% Complete
```

## Current Status
**Phase:** Core Utilities Implementation
**Last Updated:** 2025-11-02 03:46:42 UTC

## Completed Tasks
- ✅ Created marketing_tooling_DOCUMENT.md documentation
- ✅ Pulled latest changes from main (commit 6ab2cc8)
- ✅ Created todo list with 24 tasks
- ✅ Checked out git branch devin/1762055077-marketing-tooling
- ✅ Explored existing codebase structure
- ✅ Designed and implemented Prisma schema changes (5 new models + 3 new enums)

## In Progress
- 🔄 Creating packages/utils/discounts.ts for promo code logic

## Pending Tasks
- ⏳ Design and implement Prisma schema changes (PromoCode, EventPricePhase, Campaign, Segment, CampaignRecipient)
- ⏳ Create packages/utils/discounts.ts for promo code logic
- ⏳ Create packages/marketing/segments.ts for segment query engine
- ⏳ Implement promo code API endpoints
- ⏳ Implement price phase API endpoints
- ⏳ Implement campaign API endpoints
- ⏳ Implement segment API endpoints
- ⏳ Create tracking routes (/api/trk/open and /api/trk/c)
- ⏳ Build organizer app promo management UI
- ⏳ Build organizer app campaign wizard UI
- ⏳ Update web app event page to show price phases
- ⏳ Update web app checkout to support promo codes
- ⏳ Add admin app promo/campaign oversight features
- ⏳ Write unit tests
- ⏳ Write Playwright E2E tests
- ⏳ Create docs/marketing.md documentation
- ⏳ Run pnpm install and generate Prisma client
- ⏳ Run pnpm -w build
- ⏳ Run pnpm -w test
- ⏳ Run Playwright tests
- ⏳ Create PR
- ⏳ Wait for CI checks to pass

## Key Milestones
1. [ ] Database schema complete (5 new models)
2. [ ] Discount & segment logic implemented
3. [ ] API endpoints functional
4. [ ] Tracking routes operational
5. [ ] Organizer UI complete
6. [ ] Web app integration complete
7. [ ] Admin oversight features complete
8. [ ] All tests passing
9. [ ] PR created and CI passing

## Notes
- No promo stacking allowed
- Discounts apply before fees (fees computed on discounted subtotal)
- Price phases: time-based and seat-based conditions
- Campaign tracking: open pixel + click redirect
- CI must pass offline (no external email/SMS providers required)
