# Hybrid Recommendations v1 Progress

## Progress Bar
```
[####..............] 20% Complete - Setting up infrastructure
```

## Current Status
- Branch: `devin/1764169732-reco-hybrid-recommendations`
- PR: Not yet created
- Building low-cost recommendation system with rule-based + lightweight CF

## Task Overview
Building a hybrid recommendation system that:
1. Computes user profile vectors from views, bookings, categories, price band, city, time-of-day
2. Generates candidates via Jaccard/cosine similarity on user profiles
3. Scores candidates with configurable weights
4. Batch computes UserReco table nightly via cron
5. Falls back to popularity-by-segment for cold-start users
6. Optionally uses local matrix factorization behind a flag

## Completed Tasks
- [x] Checkout git branch for reco feature
- [x] Explore codebase structure - understand existing models, API patterns, and packages
- [x] Create RECO_HYBRID_RECOMMENDATIONS_DOCUMENT.md

## In Progress
- [ ] Create progress.md documentation
- [ ] Create Prisma schema for UserReco model

## Pending Tasks
- [ ] Create packages/reco package with engine.ts and config.ts
- [ ] Implement user profile vector computation
- [ ] Implement candidate generation (Jaccard/cosine similarity)
- [ ] Implement scoring function with configurable weights
- [ ] Implement batch compute for UserReco table
- [ ] Implement cold-start fallback (popularity-by-segment)
- [ ] Add optional local MF behind RECO_MF_PROVIDER flag
- [ ] Create tRPC reco.forUser endpoint
- [ ] Create cron API endpoint /api/cron/reco
- [ ] Create GitHub workflow for nightly cron
- [ ] Update Web/Mobile home to show "Recommended for you" row
- [ ] Write unit tests
- [ ] Write Playwright test
- [ ] Create docs/reco.md
- [ ] Run lint, typecheck, build, and tests
- [ ] Create PR and wait for CI

## Architecture

### User Profile Vector
```typescript
interface UserProfile {
  catFreq: Record<Category, number>;  // Category frequency
  priceP50: number;                    // Median price
  preferredAreas: string[];            // Top cities
  timeSlots: string[];                 // Preferred times
}
```

### Scoring Formula
```
score = w_cat*catSim + w_price*priceBandSim + w_area*areaMatch + w_recency*recencyBoost + w_pop*popularity
```

### Database Model
```prisma
model UserReco {
  userId    String
  eventId   String
  score     Float
  reason    Json
  createdAt DateTime @default(now())

  @@id([userId, eventId])
}
```

## Notes
- No external ML - all computation in Postgres SQL
- Nightly refresh via cron
- Top 50 recommendations per user
- RECO_MF_PROVIDER flag controls optional local MF
