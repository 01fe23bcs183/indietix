# Hybrid Recommendations v1 (Rules + CF, Nightly Batches, Cost-Aware)

## Overview

This document tracks the implementation of a low-cost recommendation system for IndieTix that combines rule-based recommendations with lightweight collaborative filtering (CF) computed in Postgres, refreshed nightly.

## Goals

1. **Signals**: Build user profile vectors from views (EventView), bookings, categories, price band, city, and time-of-day preference
2. **Candidate Generation**: Similar users via Jaccard on attended categories + cosine on price band; item-based similarity by category/city/price band
3. **Scoring**: Configurable weighted scoring function
4. **Batch Compute**: Materialize UserReco table nightly via cron, store top 50 per user
5. **Cold-Start Fallback**: Popularity-by-segment for new users
6. **Optional Local MF**: Behind `RECO_MF_PROVIDER` flag, never in CI

## Architecture

### User Profile Vector
```typescript
interface UserProfile {
  catFreq: Record<Category, number>;  // Category frequency from bookings/views
  priceP50: number;                    // Median price of booked events
  preferredAreas: string[];            // Top cities from bookings
  timeSlots: string[];                 // Preferred time slots (morning/afternoon/evening)
}
```

### Scoring Formula
```
score = w_cat * catSim + w_price * priceBandSim + w_area * areaMatch + w_recency * recencyBoost + w_pop * popularity
```

### Database Models
- `UserReco { userId, eventId, score, reason Json, createdAt }` - PK (userId, eventId)

### Package Structure
```
packages/reco/
  src/
    config.ts      - Configurable weights
    engine.ts      - Scoring helpers, MF adapter
    profile.ts     - User profile computation
    candidates.ts  - Candidate generation
    batch.ts       - Batch computation logic
    index.ts       - Exports
  __tests__/
    engine.spec.ts - Unit tests
```

## Implementation Progress

### Phase 1: Database Schema
- [ ] Add UserReco model to Prisma schema
- [ ] Run migration

### Phase 2: Core Package
- [ ] Create packages/reco package structure
- [ ] Implement config.ts with weights
- [ ] Implement profile.ts for user profile computation
- [ ] Implement candidates.ts for candidate generation
- [ ] Implement engine.ts for scoring
- [ ] Implement batch.ts for batch computation

### Phase 3: API & Cron
- [ ] Create tRPC reco.forUser endpoint
- [ ] Create /api/cron/reco endpoint
- [ ] Create GitHub workflow for nightly cron

### Phase 4: UI Integration
- [ ] Update Web home page with "Recommended for you" row
- [ ] Update Mobile home page with recommendations
- [ ] Log clicks for future tuning

### Phase 5: Testing & Documentation
- [ ] Unit tests for score math
- [ ] Unit tests for candidate filters
- [ ] Unit tests for cold-start fallback
- [ ] Playwright test for comedy booking -> comedy recos
- [ ] Create docs/reco.md

## Technical Decisions

1. **No External ML**: All computation done in Postgres SQL for cost efficiency
2. **Nightly Refresh**: Batch compute via cron to avoid real-time overhead
3. **Top 50 Per User**: Balance between coverage and storage
4. **Cold-Start Fallback**: Popularity-by-segment ensures new users get recommendations
5. **Optional MF**: Local matrix factorization behind flag for experimentation

## Files Changed

(Will be updated as implementation progresses)

## Testing Strategy

1. **Unit Tests**: Score math, candidate filters, cold-start fallback
2. **E2E Tests**: User books comedy event -> recommendations bias towards comedy

## Notes

- Environment variable `RECO_MF_PROVIDER` controls MF mode: `none` (default) or `local`
- MF is never enabled in CI
- Weights are configurable in `packages/reco/config.ts`
