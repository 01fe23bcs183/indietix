# IndieTix Karma/Loyalty System

The Karma/Loyalty system is an auditable, reversible, and abuse-resistant loyalty program for the IndieTix platform. Users earn karma points through various activities and can redeem them for rewards.

## Overview

The system consists of several components:

1. **Earning Rules** - Configuration for how users earn karma
2. **Rewards Catalog** - Available rewards and their costs
3. **Badge System** - Achievement badges users can earn
4. **Leaderboards** - City-wise monthly rankings
5. **Anti-Abuse Measures** - Rate limiting and fraud integration

## Earning Rules

Users can earn karma through the following activities:

| Rule | Karma | Description | Constraints |
|------|-------|-------------|-------------|
| BOOK | +10 | Booking a ticket | One per booking |
| ATTEND | +50 | Check-in at event | One per booking, requires check-in |
| REFERRAL | +100 | Friend's first booking | Max 5 per month per referrer |
| REVIEW | +20 | Post-event review | Requires attendance verification |
| EARLY_BIRD | +30 | Booking 7+ days before event | One per booking |
| PROFILE | +50 | Complete profile | One per user |
| SHARE | +10 | Social share | One per event |
| STREAK | +200 | 5 shows in 30 days | Monthly bonus |
| LOW_SALES_HELP | +40 | Help low-sales events | <50% capacity, 24h before |

## Rewards Catalog

Users can redeem karma for the following rewards:

| Cost | Reward | Type | Description |
|------|--------|------|-------------|
| 500 | Rs.200 Off | PROMO_CODE | Flat discount on next booking |
| 1000 | Early Access | PERK | Access to tickets before general sale |
| 2000 | Priority Waitlist | PERK | Higher priority in waitlist queue |
| 3000 | Free Show | PROMO_CODE | 100% discount up to Rs.500 |
| 5000 | VIP Status | PERK | VIP perks at events |
| 10000 | Gold Member | STATUS | Permanent gold status with all perks |

## Badge System

Users earn badges based on their activity:

### Booking Badges
- First Timer (1 booking)
- Regular (5 bookings)
- Enthusiast (10 bookings)
- Super Fan (25 bookings)
- Legend (50 bookings)

### Attendance Badges
- First Show (1 attendance)
- Show Goer (5 attendances)
- Dedicated (10 attendances)
- Veteran (25 attendances)

### Karma Badges
- Rising Star (100 karma)
- Contributor (500 karma)
- Champion (1000 karma)
- Elite (5000 karma)
- Legendary (10000 karma)

### Special Badges
- Streak Master (5 shows in a month)
- Referrer (successful referral)
- Reviewer (posted a review)
- Early Bird (early booking)
- Helper (supported low-sales event)

## API Reference

### tRPC Routes

```typescript
// Get user's karma balance
loyalty.getKarma({ userId: string })

// Get transaction history with pagination
loyalty.history({ userId: string, cursor?: string, limit?: number })

// Redeem a reward
loyalty.redeem({ userId: string, rewardKey: string })

// Get rewards catalog with progress
loyalty.rewards.catalog({ userId: string })

// Get user's reward grants
loyalty.rewards.grants({ userId: string, status?: string })

// Get all badge definitions
loyalty.badges.list()

// Get user's earned badges
loyalty.badges.userBadges({ userId: string })

// Check and award new badges
loyalty.badges.check({ userId: string })

// Get city leaderboard
loyalty.leaderboard.get({ city: string, month?: string, limit?: number })

// Get user's rank in leaderboard
loyalty.leaderboard.userRank({ userId: string, city: string, month?: string })

// Get available cities
loyalty.leaderboard.cities()

// Get available months
loyalty.leaderboard.months()

// Get user's perk flags
loyalty.perks({ userId: string })

// Get earning rules info
loyalty.rules()
```

### Earning Endpoints (Server-side)

```typescript
// Award karma for booking
loyalty.earn.book({ userId, bookingId, eventDate })

// Award karma for attendance
loyalty.earn.attend({ userId, bookingId })

// Award karma for referral
loyalty.earn.referral({ referrerId, refereeId, bookingId })

// Award karma for review
loyalty.earn.review({ userId, bookingId, eventId, rating, comment? })

// Award karma for social share
loyalty.earn.share({ userId, eventId })

// Award karma for profile completion
loyalty.earn.profile({ userId })

// Award karma for low-sales help
loyalty.earn.lowSalesHelp({ userId, bookingId, eventId })
```

## Anti-Abuse Measures

### Idempotent Deduplication
All karma earnings are deduplicated using a composite key of (userId, reason, refId). This prevents duplicate earnings for the same action.

### Rate Limiting
- Referral earnings are limited to 5 per referrer per month
- Share earnings are limited to one per event per user

### Attendance Verification
- Review karma requires the user to have attended the event (booking status = ATTENDED)
- Streak bonus requires verified attendance

### Fraud Integration
- Users with open fraud cases have their earnings held for review
- Held transactions have `held: true` flag
- Admin can release or cancel held karma

## Database Schema

### KarmaTransaction
Immutable transaction log for audit trail:
- `id` - Unique identifier
- `userId` - User who earned/spent karma
- `delta` - Amount of karma (+/-)
- `type` - EARN, SPEND, or ADJUST
- `reason` - Reason code (BOOK, ATTEND, etc.)
- `refId` - Reference ID for deduplication
- `meta` - Additional metadata (JSON)
- `held` - Whether transaction is held for review
- `createdAt` - Timestamp

### RewardGrant
Tracks reward redemptions:
- `id` - Unique identifier
- `userId` - User who redeemed
- `rewardKey` - Reward type
- `status` - PENDING, ACTIVE, USED, EXPIRED, CANCELLED
- `promoCodeId` - Link to generated promo code
- `meta` - Additional metadata

### UserPerks
Stores user perk flags:
- `userId` - User ID
- `flags` - Array of perk flags (EARLY_ACCESS, VIP, GOLD_STATUS, WAITLIST_PRIORITY)

### LeaderboardEntry
City-month leaderboard entries:
- `city` - City name
- `month` - Month (YYYY-MM format)
- `userId` - User ID
- `score` - Total karma earned in that city/month

## Cron Jobs

### Leaderboard Recomputation
- Endpoint: `/api/cron/leaderboard`
- Schedule: Nightly
- Authorization: Bearer token (CRON_TOKEN env var)
- Function: Recomputes all city leaderboards for the current month

## UI Components

### Profile Karma Page (`/profile/karma`)
- Current karma score display
- Transaction history (last 20)
- Rewards catalog with progress bars
- Badge grid with locked/unlocked states
- Redeem panel

### Leaderboard Page (`/leaderboard`)
- City selector dropdown
- Month selector dropdown
- User's rank display
- Top 50 leaderboard entries

## Server Hooks

The following events automatically trigger karma earning:

1. **Booking Confirmation** - Awards BOOK karma, checks for EARLY_BIRD and LOW_SALES_HELP
2. **Check-in** - Awards ATTEND karma, checks for STREAK bonus
3. **Referral** - Awards REFERRAL karma when friend makes first booking
4. **Review** - Awards REVIEW karma after attendance verification

## Configuration

### Environment Variables
- `CRON_TOKEN` - Authorization token for cron job endpoints

### Constants
- `STREAK_THRESHOLD` = 5 (shows in a month for streak bonus)
- `STREAK_WINDOW_DAYS` = 30 (window for streak calculation)
- `EARLY_BIRD_DAYS_BEFORE` = 7 (days before event for early bird)
- `REFERRAL_MAX_PER_MONTH` = 5 (max referral earnings per month)
- `LOW_SALES_THRESHOLD_PERCENT` = 50 (capacity threshold for low-sales)
- `LOW_SALES_WINDOW_HOURS` = 24 (hours before event for low-sales)
