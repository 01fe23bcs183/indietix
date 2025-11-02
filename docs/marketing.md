# IndieTix Marketing Tooling Documentation

## Overview

The IndieTix marketing tooling provides comprehensive features for promotional campaigns, dynamic pricing, and customer segmentation. This system enables organizers and administrators to create targeted marketing campaigns, offer promotional discounts, implement early bird pricing, and track campaign performance.

## Features

### 1. Promo Codes

Promo codes allow organizers and administrators to offer discounts to customers. Codes can be scoped to specific events, categories, cities, or organizers.

#### Promo Code Types

- **PERCENT**: Percentage-based discount (e.g., 20% off)
- **FLAT**: Fixed amount discount (e.g., ₹50 off)

#### Constraints

- **Time-based**: `startAt` and `endAt` dates define validity period
- **Usage limits**: 
  - `usageLimit`: Total number of times code can be used across all users
  - `perUserLimit`: Maximum uses per individual user
- **Minimum price**: `minPrice` sets minimum ticket price for code applicability
- **Scope filters**:
  - `organizerId`: Restrict to specific organizer's events
  - `applicableEvents`: Array of event IDs
  - `applicableCategories`: Array of category names (MUSIC, COMEDY, etc.)
  - `applicableCities`: Array of city names

#### Redemption Rules

1. **No stacking**: Only one promo code can be applied per booking
2. **Discount before fees**: Discounts apply to the ticket subtotal before platform fees and GST are calculated
3. **Fee calculation**: Fees are computed on the discounted subtotal
4. **Admin override**: Administrators can invalidate any promo code by setting `active: false`

#### API Endpoints

- `promos.create`: Create a new promo code (ADMIN/ORGANIZER only)
- `promos.update`: Update promo code constraints
- `promos.disable`: Deactivate a promo code
- `promos.validate`: Validate if a code can be applied to a booking
- `promos.list`: List all promo codes (filtered by role)
- `promos.get`: Get details of a specific promo code

#### Example Usage

```typescript
// Create a 20% off promo code for comedy events in Bengaluru
const promoCode = await trpc.promos.create.mutate({
  code: "LAUGH20",
  type: "PERCENT",
  value: 20,
  startAt: new Date("2025-11-01"),
  endAt: new Date("2025-11-30"),
  usageLimit: 100,
  perUserLimit: 1,
  minPrice: 30000, // ₹300 minimum
  applicableCategories: ["COMEDY"],
  applicableCities: ["Bengaluru"],
});

// Validate promo code for a booking
const validation = await trpc.promos.validate.query({
  code: "LAUGH20",
  eventId: "event123",
  quantity: 2,
  userId: "user456",
});
```

### 2. Price Phases (Early Bird / Last Minute)

Price phases enable dynamic pricing based on time or seat availability. Common use cases include early bird discounts and last-minute pricing.

#### Model: EventPricePhase

- `eventId`: Associated event
- `name`: Phase name (e.g., "Early Bird", "Last Minute")
- `startsAt`: Optional start time
- `endsAt`: Optional end time
- `maxSeats`: Optional seat limit (phase ends when this many seats are booked)
- `price`: Phase price in paise

#### Effective Price Logic

The system determines the effective price by evaluating all price phases for an event:

1. Check time constraints: Current time must be between `startsAt` and `endsAt` (if set)
2. Check seat constraints: Current `bookedSeats` must be less than `maxSeats` (if set)
3. Return the first matching phase price, or fall back to base `event.price`

#### API Endpoints

- `pricing.effectivePrice`: Get current effective price for an event
- `pricing.createPhase`: Create a new price phase (ORGANIZER/ADMIN only)
- `pricing.listPhases`: List all phases for an event
- `pricing.deletePhase`: Remove a price phase

#### Example Usage

```typescript
// Create early bird pricing
const earlyBird = await trpc.pricing.createPhase.mutate({
  eventId: "event123",
  name: "Early Bird",
  endsAt: new Date("2025-11-15"),
  maxSeats: 50,
  price: 40000, // ₹400 (vs base price of ₹500)
});

// Get effective price
const pricing = await trpc.pricing.effectivePrice.query({
  eventId: "event123",
  now: new Date(),
});
// Returns: { basePrice: 50000, effectivePrice: 40000, activePhase: {...} }
```

#### UI Display

When an active price phase is in effect:
- Show strikethrough base price: ~~₹500~~
- Display effective price prominently: **₹400**
- Show countdown message: "Early bird ends in 2d 3h"

### 3. Email Campaigns with Segments

The campaign system enables targeted email marketing to user segments with open/click tracking.

#### Campaign Model

- `name`: Campaign name
- `channel`: EMAIL or SMS (SMS optional)
- `status`: DRAFT, SCHEDULED, SENDING, SENT, FAILED
- `templateKey`: Template identifier for rendering
- `scheduledAt`: When to send the campaign
- `createdBy`: User ID of campaign creator

#### Segment Query DSL

Segments use a JSON-based query language to define user groups:

```typescript
// Users in Bengaluru
{ city: "Bengaluru" }

// Users who attended comedy or music events
{ categories: ["COMEDY", "MUSIC"] }

// Users who attended events in the last 180 days
{ attended_in_last_days: 180 }

// Users who booked events with price ≤ ₹600
{ price_ceiling: 60000 }
```

#### Campaign Flow

1. **Create Campaign**: Select segment, template, and schedule
2. **Materialize Recipients**: System creates `CampaignRecipient` rows from segment query
3. **Schedule Notifications**: System creates `Notification` rows for each recipient
4. **Send**: Email provider sends messages with tracking pixels and click tracking links
5. **Track**: Open pixel (`/api/trk/open`) and click redirect (`/api/trk/c`) update recipient status

#### Tracking

**Open Tracking**: Embed 1x1 transparent pixel in email:
```html
<img src="https://indietix.com/api/trk/open?rid={recipientId}" width="1" height="1" />
```

**Click Tracking**: Wrap links with tracking redirect:
```html
<a href="https://indietix.com/api/trk/c?rid={recipientId}&url={targetUrl}">Click here</a>
```

**UTM Parameters**: Add UTM tags to track conversions:
```
?utm_source=indietix&utm_medium=email&utm_campaign={campaignId}
```

#### API Endpoints

- `campaigns.create`: Create campaign and materialize recipients
- `campaigns.schedule`: Schedule campaign for sending
- `campaigns.cancel`: Cancel scheduled campaign
- `campaigns.list`: List all campaigns
- `campaigns.detail`: Get campaign with metrics (opens, clicks, conversions)

- `segments.create`: Create a new segment
- `segments.update`: Update segment query
- `segments.list`: List all segments
- `segments.get`: Get segment details
- `segments.estimate`: Estimate segment size

#### Example Usage

```typescript
// Create segment for engaged users
const segment = await trpc.segments.create.mutate({
  name: "Engaged Comedy Fans",
  query: {
    categories: ["COMEDY"],
    attended_in_last_days: 90,
    city: "Bengaluru",
  },
});

// Estimate segment size
const estimate = await trpc.segments.estimate.query({
  query: segment.query,
});
// Returns: { size: 1234 }

// Create campaign
const campaign = await trpc.campaigns.create.mutate({
  name: "Comedy Weekend Special",
  channel: "EMAIL",
  templateKey: "event_promotion",
  segmentId: segment.id,
  scheduledAt: new Date("2025-11-10T10:00:00Z"),
});

// Get campaign metrics
const details = await trpc.campaigns.detail.query({ id: campaign.id });
// Returns: { metrics: { sent: 1234, opened: 456, clicked: 89, openRate: 36.9, clickRate: 7.2, conversions: 12 } }
```

### 4. Reports

#### Promo Code Report

Track promo code performance:
- **Redemptions**: Total number of times code was used
- **GMV Driven**: Gross merchandise value from bookings using the code
- **Discount Amount**: Total discount given
- **Breakage Rate**: Percentage of codes created but not used

Access via `promos.get` endpoint with booking count.

#### Campaign Report

Track campaign performance:
- **Delivered**: Number of successfully sent messages
- **Opens**: Number of recipients who opened the email
- **Open Rate**: Percentage of delivered emails that were opened
- **Clicks**: Number of recipients who clicked a link
- **Click-Through Rate (CTR)**: Percentage of delivered emails with clicks
- **Conversions**: Number of bookings attributed to campaign (via UTM tracking)

Access via `campaigns.detail` endpoint.

## Database Schema

### PromoCode
```prisma
model PromoCode {
  id                    String         @id @default(cuid())
  code                  String         @unique
  type                  PromoCodeType  // PERCENT | FLAT
  value                 Int            // Percentage or amount in paise
  startAt               DateTime?
  endAt                 DateTime?
  usageLimit            Int?
  perUserLimit          Int?
  minPrice              Int?
  organizerId           String?
  applicableEvents      String[]       @default([])
  applicableCategories  String[]       @default([])
  applicableCities      String[]       @default([])
  active                Boolean        @default(true)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  bookings              Booking[]
}
```

### EventPricePhase
```prisma
model EventPricePhase {
  id        String    @id @default(cuid())
  eventId   String
  name      String
  startsAt  DateTime?
  endsAt    DateTime?
  maxSeats  Int?
  price     Int
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  event     Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
}
```

### Campaign
```prisma
model Campaign {
  id           String          @id @default(cuid())
  name         String
  channel      CampaignChannel // EMAIL | SMS
  status       CampaignStatus  // DRAFT | SCHEDULED | SENDING | SENT | FAILED
  templateKey  String
  scheduledAt  DateTime?
  createdBy    String
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  recipients   CampaignRecipient[]
  bookings     Booking[]
}
```

### Segment
```prisma
model Segment {
  id        String   @id @default(cuid())
  name      String
  query     Json     // Segment query DSL
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### CampaignRecipient
```prisma
model CampaignRecipient {
  id         String                  @id @default(cuid())
  campaignId String
  userId     String?
  email      String
  phone      String?
  status     CampaignRecipientStatus // PENDING | SENT | OPENED | CLICKED | BOUNCED
  sentAt     DateTime?
  openedAt   DateTime?
  clickedAt  DateTime?
  createdAt  DateTime                @default(now())
  updatedAt  DateTime                @updatedAt
  campaign   Campaign                @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}
```

### Booking Extensions
```prisma
model Booking {
  // ... existing fields
  promoCodeId  String?
  campaignId   String?
  promoCode    PromoCode?  @relation(fields: [promoCodeId], references: [id], onDelete: SetNull)
  campaign     Campaign?   @relation(fields: [campaignId], references: [id], onDelete: SetNull)
}
```

## Testing

### Unit Tests

- **Discount Logic**: `packages/utils/src/__tests__/discounts.spec.ts`
  - Validates promo code constraints
  - Tests percentage and flat discounts
  - Verifies discount application before fees

- **Segment Engine**: `packages/marketing/src/__tests__/segments.spec.ts`
  - Tests segment query DSL validation
  - Verifies Prisma where clause generation
  - Tests all segment filter types

- **Pricing with Discounts**: `packages/utils/src/__tests__/pricing-discounts.spec.ts`
  - Tests booking amount calculation with discounts
  - Verifies fees are calculated on discounted subtotal

### E2E Tests

- **Promo Code Checkout**: Test applying valid/invalid codes, viewing discount preview, completing booking
- **Campaign Creation**: Test segment selection, recipient materialization, scheduling
- **Tracking**: Test open pixel and click tracking updates

## CI/CD Considerations

- **Offline Operation**: All tests run without external dependencies
- **Fake Providers**: Email/SMS use fake providers in test environment
- **No External APIs**: Tracking routes work with in-memory database

## Security

- **Authorization**: Only ADMIN and ORGANIZER roles can create promos/campaigns
- **Scope Enforcement**: Organizers can only manage their own promo codes
- **Admin Override**: Admins can disable any promo code or campaign
- **Input Validation**: All segment queries and promo constraints are validated

## Performance

- **Segment Materialization**: Recipients are snapshot at campaign creation time
- **Tracking**: Open/click tracking uses updateMany for efficiency
- **Indexes**: All foreign keys and frequently queried fields are indexed

## Future Enhancements

- SMS campaigns (infrastructure in place, templates needed)
- A/B testing for campaigns
- Automated promo code generation
- Dynamic segment refresh
- Advanced reporting dashboard
- Promo code stacking (currently forbidden)
