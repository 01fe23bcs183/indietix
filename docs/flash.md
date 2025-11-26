# Flash Sales Engine

The Flash Sales Engine is a rule-driven system that detects underperforming events and triggers time-bound discounts with geofenced notifications.

## Overview

Flash sales are time-limited discounts that help fill seats for events that are not selling well. The system automatically detects events that may benefit from a flash sale and suggests appropriate discounts based on configurable rules.

## Detection Rules

The flash sales engine evaluates events based on three key metrics:

### Inputs

- **Sell-through rate**: `bookedSeats / totalSeats` (percentage of seats sold)
- **Time to start**: Hours until the event begins
- **Velocity**: Number of bookings in the last 6 hours

### Default Trigger Conditions

A flash sale is suggested when:
- `timeToStart <= 6 hours` AND
- `sell-through < 50%`

### Discount Calculation

The discount percentage (20-40%) is calculated based on:
- **Time urgency**: Closer to event = higher discount
- **Sell-through urgency**: Lower sell-through = higher discount

## Safety Guards

### Cooldown Period
- Only one flash sale per event per 24 hours
- Prevents flash sale fatigue and maintains pricing integrity

### Minimum Price Guard
- `minFlashPrice` field ensures prices don't drop below a threshold
- Protects organizer revenue

### Inventory Cap
- Flash sale seats are capped at 50% of remaining seats
- Prevents entire inventory from being sold at discount

### Geofencing
- Default 5km radius from venue
- Targets users most likely to attend

## Price Precedence

Flash sales take precedence over price phases:

1. **Active Flash Sale** (highest priority)
2. **Price Phase** (early bird, etc.)
3. **Base Price** (default)

When a flash sale is active, the discounted price is shown to users within the geofence radius.

## API Endpoints

### tRPC Routes

```typescript
// Get flash sale suggestions for events
flash.suggestions({ windowHours: 6 })

// Create a flash sale
flash.create({
  eventId: string,
  discountPercent: number,
  durationHours: number,
  maxSeats?: number,
  minFlashPrice?: number,
  cityRadius?: number
})

// Update an active flash sale
flash.update({
  id: string,
  discountPercent?: number,
  maxSeats?: number,
  endsAt?: Date
})

// Cancel a flash sale
flash.cancel({ id: string })

// Get active flash sale for an event
flash.getActiveForEvent({ eventId: string })

// List flash sales for an event
flash.listForEvent({ eventId: string, status?: string })

// Admin: List all flash sales with filters
flash.adminList({ status?: string, city?: string, page: number, limit: number })

// Admin: Stop a flash sale
flash.adminStop({ id: string })
```

### Cron Endpoint

`GET /api/cron/flash` - Runs every 10 minutes

Actions:
1. End expired flash sales (status: ACTIVE -> ENDED)
2. Activate pending flash sales (status: PENDING -> ACTIVE)
3. Evaluate rules for eligible events and generate suggestions

## UI Components

### Organizer Dashboard

**Location**: `/events/[id]/sales`

Features:
- View current event metrics (sell-through, remaining seats)
- See flash sale suggestions with recommended discount
- Create flash sale with customizable parameters
- View active flash sale with live countdown
- Cancel active flash sale
- View flash sale history

### Admin Dashboard

**Location**: `/sales`

Features:
- List all flash sales across platform
- Filter by status (PENDING, ACTIVE, ENDED, CANCELLED)
- Filter by city
- Stop/pause active flash sales
- View organizer and event details

### Customer Event Page

**Location**: `/events/[slug]`

Features:
- Flash sale banner with countdown timer
- Discounted price display with original price crossed out
- Remaining seats at flash price
- Visual indicator (lightning bolt icon)

## Data Model

```prisma
model FlashSale {
  id              String          @id @default(cuid())
  eventId         String
  discountPercent Int             // 20-40%
  startsAt        DateTime
  endsAt          DateTime
  maxSeats        Int             // Cap: <=50% of remaining seats
  soldSeats       Int             @default(0)
  status          FlashSaleStatus @default(PENDING)
  minFlashPrice   Int?            // Guard against too-low prices
  cityRadius      Int             @default(5) // Geofence radius in km
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  event           Event           @relation(...)

  @@index([eventId, startsAt])
  @@index([status])
  @@index([endsAt])
}

enum FlashSaleStatus {
  PENDING
  ACTIVE
  ENDED
  CANCELLED
}
```

## Configuration

The flash rules engine supports tunable thresholds via `FlashRuleConfig`:

```typescript
interface FlashRuleConfig {
  maxTimeToStart: number;      // Default: 6 hours
  minTimeToStart: number;      // Default: 1 hour
  sellThroughThreshold: number; // Default: 50%
  minDiscount: number;         // Default: 20%
  maxDiscount: number;         // Default: 40%
  maxInventoryCap: number;     // Default: 50%
  cityRadius: number;          // Default: 5km
  cooldownHours: number;       // Default: 24 hours
  flashDurationHours: number;  // Default: 2 hours
}
```

## Integration with Notifications

When a flash sale is created, the system can:
1. Create a campaign targeting users within the geofence radius
2. Filter by interested category and price fit
3. Send push notifications and emails instantly

## Testing

### Unit Tests

Located at `packages/flash/src/__tests__/rules.spec.ts`:
- Rule evaluation logic
- Discount calculation
- Cooldown period checks
- Sell-through calculations

### E2E Tests

- Start flash sale -> banner appears on event page
- Checkout shows discounted totals
- After expiry, price resets to normal
