# IndieTix Karma/Loyalty System Implementation

## Overview

This document tracks the implementation of the IndieTix Karma/Loyalty system - an auditable, reversible, and abuse-resistant loyalty program for the platform.

## Objectives

### 1. Data Model
- Extend User model with `karma Int @default(0)`
- Create KarmaTransaction model (id, userId, delta, type, reason, meta, createdAt)
- Create Badge model (id, key, name, description, icon, threshold, category)
- Create UserBadge model (id, userId, badgeKey, earnedAt)
- Create LeaderboardEntry model (id, city, month, userId, score)
- Create RewardGrant model (id, userId, rewardKey, status, meta)
- Create UserPerks model (userId, flags)

### 2. Earning Rules (packages/loyalty/rules.ts)
| Rule | Karma | Condition |
|------|-------|-----------|
| BOOK | +10 | Per booking |
| ATTEND | +50 | Check-in verified |
| REFERRAL | +100 | Friend's first booking |
| REVIEW | +20 | Post-attendance review |
| EARLY_BIRD | +30 | 7+ days before event |
| PROFILE | +50 | Profile completed |
| SHARE | +10 | Social share (one per event) |
| STREAK | +200 | 5 shows in a month |
| LOW_SALES_HELP | +40 | Booking shows <50% capacity 24h before |

### 3. Rewards Catalog
| Cost | Reward |
|------|--------|
| 500 | Rs.200 off next booking |
| 1000 | Early access flag |
| 2000 | Waitlist priority bump |
| 3000 | Free show (<=Rs.500) |
| 5000 | VIP perks |
| 10000 | Gold status (permanent) |

### 4. Anti-Abuse Measures
- Rate limit referral earnings per referrer per month
- Require attendance verification for review karma
- Integrate with fraud detection system (held flag on transactions)
- Idempotent dedup via composite key (userId+rule+refId)

### 5. API (tRPC)
- `loyalty.earn(ruleKey, refId?)` - Server-only
- `loyalty.redeem(rewardKey)` - User-facing
- `loyalty.history({ cursor? })` - Transaction history
- `loyalty.badges.list()` - Badge catalog
- `loyalty.leaderboard({ city, month })` - City leaderboard

### 6. UI Components
- Profile "Karma & Rewards" section
- Karma score display
- Transaction history (last 20)
- Progress bars to next reward
- Badge grid (locked/unlocked)
- Redeem panel
- Leaderboard page with city selector

### 7. Server Hooks
- On booking CONFIRMED -> BOOK (+ EARLY_BIRD if applicable)
- On check-in -> ATTEND (+ streak algorithm)
- On referral recorded -> REFERRAL
- On review posted (attended) -> REVIEW
- On low-sales booking -> LOW_SALES_HELP

## Implementation Progress

### Phase 1: Data Model - COMPLETED
- [x] Add karma field to User model
- [x] Create KarmaTransaction model with idempotent composite key
- [x] Create Badge model
- [x] Create UserBadge model
- [x] Create LeaderboardEntry model
- [x] Create RewardGrant model with promo code linking
- [x] Create UserPerks model
- [x] Create Referral model
- [x] Create Review model

### Phase 2: Core Logic - COMPLETED
- [x] Create packages/loyalty package
- [x] Implement earning rules configuration (rules.ts)
- [x] Implement idempotent earn function (earn.ts)
- [x] Implement spend/redeem function (spend.ts)
- [x] Implement streak calculation
- [x] Implement rewards catalog (rewards.ts)
- [x] Implement badge definitions (badges.ts)
- [x] Implement leaderboard functions (leaderboard.ts)

### Phase 3: API Layer - COMPLETED
- [x] Create loyalty tRPC router
- [x] Implement earn procedures (book, attend, referral, review, share, profile, lowSalesHelp)
- [x] Implement redeem procedure
- [x] Implement history procedure
- [x] Implement badges.list procedure
- [x] Implement leaderboard procedures (get, userRank, cities, months)
- [x] Implement rewards.catalog and rewards.grants procedures
- [x] Implement perks procedure

### Phase 4: Server Hooks - COMPLETED
- [x] Wire booking confirmation hook (BOOK + EARLY_BIRD + LOW_SALES_HELP)
- [x] Check-in hook ready via earn.attend procedure
- [x] Referral hook ready via earn.referral procedure
- [x] Review hook ready via earn.review procedure

### Phase 5: UI - IN PROGRESS
- [ ] Create Karma & Rewards profile section
- [ ] Create leaderboard page
- [ ] Create badge display components

### Phase 6: Testing - PARTIAL
- [x] Unit tests for rules (rules.spec.ts)
- [x] Unit tests for rewards (rewards.spec.ts)
- [x] Unit tests for badges (badges.spec.ts)
- [ ] Unit tests for earn/spend logic
- [ ] Playwright E2E tests

### Phase 7: Documentation - PENDING
- [ ] Create docs/loyalty.md

## Technical Notes

- All karma transactions are immutable for audit trail
- Negative balance prevention enforced at database level
- Leaderboard recomputed nightly via cron job
- Fraud integration: high-risk users have earnings held for review
