# Recommendation System Documentation

This document describes the hybrid recommendation system for IndieTix, combining rule-based scoring with lightweight collaborative filtering computed in Postgres.

## Overview

The recommendation system generates personalized event suggestions for users based on their booking history, viewing patterns, and similarity to other users. It runs as a nightly batch job and stores pre-computed recommendations in the database for fast retrieval.

## Architecture

### Components

1. **User Profile Vector** (`packages/reco/src/profile.ts`)
   - `catFreq`: Category frequency from bookings and views
   - `priceP50`: Median price of booked events (in paise)
   - `preferredAreas`: Top cities from bookings
   - `timeSlots`: Preferred time slots (morning/afternoon/evening/night)

2. **Candidate Generation** (`packages/reco/src/candidates.ts`)
   - Similar users via Jaccard similarity on categories
   - Cosine similarity on price bands
   - Excludes already booked and expired events

3. **Scoring Engine** (`packages/reco/src/engine.ts`)
   - Configurable weighted scoring formula
   - Cold-start fallback for new users

4. **Batch Compute** (`packages/reco/src/batch.ts`)
   - Nightly materialization of UserReco table
   - Stores top 50 recommendations per user

### Data Flow

```
User Activity (bookings, views)
    ↓
User Profile Computation
    ↓
Similar User Finding (Jaccard + Cosine)
    ↓
Candidate Generation
    ↓
Scoring (weighted formula)
    ↓
UserReco Table (materialized)
    ↓
API Response (tRPC)
```

## Scoring Formula

```
score = w_cat * catSim 
      + w_price * priceBandSim 
      + w_area * areaMatch 
      + w_recency * recencyBoost 
      + w_pop * popularity
```

### Default Weights

| Weight | Value | Description |
|--------|-------|-------------|
| category | 0.35 | Category match importance |
| priceBand | 0.20 | Price band similarity |
| area | 0.20 | City/area match |
| recency | 0.15 | Event date proximity boost |
| popularity | 0.10 | Booking popularity |

Weights can be configured in `packages/reco/src/config.ts`.

## Price Bands

| Band | Price Range (INR) |
|------|-------------------|
| FREE | 0 |
| BUDGET | 1 - 499 |
| MID | 500 - 1,999 |
| PREMIUM | 2,000 - 4,999 |
| LUXURY | 5,000+ |

## Time Slots

| Slot | Hours |
|------|-------|
| MORNING | 6:00 - 11:59 |
| AFTERNOON | 12:00 - 16:59 |
| EVENING | 17:00 - 20:59 |
| NIGHT | 21:00 - 5:59 |

## Cold-Start Handling

For users with insufficient history (< 3 total category interactions), the system falls back to popularity-based recommendations segmented by:
- City (if available from user profile)
- Category (if any preference detected)

## API Endpoints

### tRPC Router (`packages/api/src/routers/reco.ts`)

#### `reco.forUser`
Returns personalized recommendations for the current user.

**Input:**
```typescript
{
  limit?: number;  // 1-50, default 20
  city?: string;   // Optional city filter
}
```

**Output:**
```typescript
{
  recommendations: Array<{
    event: Event;
    score: number;
    reason: {
      type: "category_match" | "similar_users" | "popular" | "mf";
      details: object;
    };
  }>;
  isPersonalized: boolean;
}
```

#### `reco.logClick`
Logs when a user clicks on a recommendation (for future tuning).

**Input:**
```typescript
{
  eventId: string;
  position: number;
  score: number;
}
```

#### `reco.refresh`
Force refresh recommendations for the current user.

### Cron Endpoint (`/api/cron/reco`)

Triggers nightly batch computation. Protected by `CRON_TOKEN` bearer authentication.

**GET**: Run batch compute with default config
**POST**: Run batch compute with custom config

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RECO_MF_PROVIDER` | Matrix factorization provider | `none` |
| `CRON_TOKEN` | Authentication token for cron endpoints | Required |

### MF Provider Options

- `none`: No matrix factorization (default, recommended for cost)
- `local`: Local SVD approximation (experimental, never in CI)

## Cost Strategy

The system is designed for low-cost operation:

1. **Postgres-native computation**: All similarity calculations run in Postgres, no external ML services required
2. **Batch materialization**: Recommendations are pre-computed nightly, not on-demand
3. **Configurable pool size**: Limit candidate events to reduce computation
4. **No external dependencies**: Optional MF is local-only, gated behind feature flag

### Estimated Costs

| Users | Events | Batch Time | Storage |
|-------|--------|------------|---------|
| 1,000 | 100 | ~30s | ~5MB |
| 10,000 | 500 | ~5min | ~50MB |
| 100,000 | 1,000 | ~30min | ~500MB |

## Tuning Guide

### Improving Recommendation Quality

1. **Adjust weights**: Modify `DEFAULT_WEIGHTS` in `config.ts` based on user feedback
2. **Increase candidate pool**: Raise `candidatePoolSize` for more diverse recommendations
3. **Lower cold-start threshold**: Reduce `coldStartThreshold` to personalize earlier

### Monitoring

Track these metrics:
- Click-through rate on recommendations
- Conversion rate (recommendation click → booking)
- Cold-start user percentage
- Batch compute duration

### Click Logging

The system logs recommendation clicks via `reco.logClick`. This data can be used for:
- A/B testing different weight configurations
- Training future ML models
- Analyzing user engagement patterns

## Database Schema

### UserReco

```prisma
model UserReco {
  userId    String
  eventId   String
  score     Float
  reason    Json
  createdAt DateTime @default(now())

  @@id([userId, eventId])
  @@index([userId, score(sort: Desc)])
}
```

### UserProfile

```prisma
model UserProfile {
  userId          String   @id
  catFreq         Json
  priceP50        Int
  preferredAreas  String[]
  timeSlots       String[]
  updatedAt       DateTime @updatedAt
}
```

## GitHub Workflow

The nightly batch job is triggered by `.github/workflows/cron-reco.yml`:

```yaml
on:
  schedule:
    - cron: "0 2 * * *"  # 2 AM UTC (7:30 AM IST)
  workflow_dispatch:     # Manual trigger
```

## Testing

### Unit Tests

Located in `packages/reco/src/__tests__/`:
- `engine.test.ts`: Score calculation tests
- `candidates.test.ts`: Candidate filtering tests
- `config.test.ts`: Configuration tests

### E2E Tests

Located in `apps/web/e2e/reco.spec.ts`:
- Homepage recommendations display
- API response validation
- Cold-start user handling
- Click logging

## Future Improvements

1. **Real-time signals**: Incorporate view events for faster personalization
2. **Contextual recommendations**: Time-of-day and day-of-week awareness
3. **Diversity injection**: Ensure category diversity in recommendations
4. **Explanation UI**: Show users why events are recommended
5. **A/B testing framework**: Built-in experimentation support
