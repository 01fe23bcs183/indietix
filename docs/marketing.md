# IndieTix Marketing Tooling Documentation

## Overview

IndieTix's marketing tooling provides first-class support for promotional campaigns, dynamic pricing, and customer segmentation. This system enables organizers and admins to drive ticket sales through targeted promotions and time-sensitive pricing strategies.

## Features

### 1. Promo Codes

Promo codes allow organizers and admins to offer discounts to customers.

**Types:**

- **PERCENT**: Percentage discount (e.g., 20% off)
- **FLAT**: Fixed amount discount (e.g., ₹50 off)

**Constraints:**

- Time-based: `startAt` and `endAt` dates
- Usage limits: Total usage limit and per-user limit
- Minimum purchase: `minPrice` requirement
- Scope: Applicable to specific events, categories, or cities
- Ownership: Organizer-scoped or admin-scoped (global)

**Rules:**

- No promo stacking allowed (one promo per booking)
- Discounts apply to subtotal BEFORE fees
- Fees are computed on the discounted subtotal
- Admins can force-disable any promo code

**API Endpoints:**

- `promos.create` - Create a new promo code
- `promos.update` - Update promo code constraints
- `promos.disable` - Deactivate a promo code
- `promos.list` - List all promo codes (filtered by ownership)
- `promos.get` - Get promo code details with usage stats
- `promos.validate` - Validate promo code for a booking (public)

**Example Usage:**

```typescript
// Create a promo code
const promo = await trpc.promos.create.mutate({
  code: "LAUGH20",
  type: "PERCENT",
  value: 20,
  startAt: "2025-11-01T00:00:00Z",
  endAt: "2025-11-30T23:59:59Z",
  usageLimit: 100,
  perUserLimit: 1,
  minPrice: 50000, // ₹500 in paise
  applicableCategories: ["COMEDY"],
});

// Validate promo code at checkout
const validation = await trpc.promos.validate.query({
  code: "LAUGH20",
  eventId: "event123",
  qty: 2,
  userId: "user456",
});
```

### 2. Price Phases (Early Bird / Last Minute)

Price phases enable dynamic pricing based on time and seat availability.

**Model:**

- `EventPricePhase` with fields: `name`, `startsAt`, `endsAt`, `maxSeats`, `price`
- Multiple phases can be defined per event
- Phases are evaluated in priority order (time-based first, then seat-based)

**Effective Price Logic:**

1. Check all price phases for the event
2. Find the first active phase (time and seat constraints met)
3. Return phase price if active, otherwise return base event price
4. Generate user-friendly message (e.g., "Early bird ends in 2d 3h")

**API Endpoints:**

- `pricing.effectivePrice` - Get current effective price for an event

**Example Usage:**

```typescript
// Get effective price
const pricing = await trpc.pricing.effectivePrice.query({
  eventId: "event123",
  now: new Date().toISOString(),
});

// Result:
// {
//   basePrice: 100000,
//   effectivePrice: 75000,
//   activePhase: { id: "...", name: "Early Bird", price: 75000 },
//   message: "Early bird ends in 2d 3h"
// }
```

**UI Integration:**

- Event pages show strikethrough base price with active phase price
- Display countdown message for time-based phases
- Show "X seats left" for seat-based phases

### 3. Campaigns (Email / SMS)

Campaigns enable targeted communication with customers.

**Entities:**

- **Campaign**: Main campaign entity with status tracking
- **Segment**: User targeting criteria (JSON DSL)
- **CampaignRecipient**: Individual recipient with tracking status

**Campaign Statuses:**

- `DRAFT` - Being created/edited
- `SCHEDULED` - Scheduled for future send
- `SENDING` - Currently being sent
- `SENT` - Completed
- `FAILED` - Send failed

**Recipient Statuses:**

- `PENDING` - Not yet sent
- `SENT` - Successfully sent
- `OPENED` - Email opened (tracked via pixel)
- `CLICKED` - Link clicked (tracked via redirect)
- `BOUNCED` - Delivery failed

**Workflow:**

1. Create campaign with name, channel, and template
2. Select segment (or all users)
3. Preview recipient count
4. Schedule campaign for future send
5. System materializes recipients snapshot
6. Notifications are sent at scheduled time
7. Track opens/clicks via tracking routes

**API Endpoints:**

- `campaigns.create` - Create new campaign
- `campaigns.update` - Update draft campaign
- `campaigns.schedule` - Schedule campaign and materialize recipients
- `campaigns.cancel` - Cancel scheduled campaign
- `campaigns.list` - List all campaigns
- `campaigns.detail` - Get campaign with metrics
- `campaigns.preview` - Preview recipient count for segment

**Example Usage:**

```typescript
// Create campaign
const campaign = await trpc.campaigns.create.mutate({
  name: "Comedy Lovers Special",
  channel: "EMAIL",
  templateKey: "promo_announcement",
  segmentId: "segment123",
});

// Schedule campaign
const result = await trpc.campaigns.schedule.mutate({
  id: campaign.id,
  scheduledAt: "2025-11-05T10:00:00Z",
});
// Result: { campaign, recipientCount: 1234 }

// Get campaign metrics
const detail = await trpc.campaigns.detail.query({
  id: campaign.id,
});
// Result includes: totalRecipients, sent, opened, clicked, conversions,
//                  openRate, clickRate, conversionRate
```

### 4. Segments

Segments define user targeting criteria using a JSON DSL.

**Query DSL:**

```typescript
interface SegmentQuery {
  city?: string; // Users who booked in this city
  categories?: string[]; // Users who booked these categories
  attended_in_last_days?: number; // Users who attended in last N days
  price_ceiling?: number; // Users who booked events under this price
  has_booked?: boolean; // Users who have/haven't booked
  min_bookings?: number; // Users with at least N bookings
}
```

**Examples:**

```json
// Comedy fans in Bengaluru
{
  "city": "Bengaluru",
  "categories": ["COMEDY"]
}

// Active users (attended in last 6 months)
{
  "attended_in_last_days": 180
}

// Budget-conscious users
{
  "price_ceiling": 600
}

// Power users
{
  "min_bookings": 5
}
```

**API Endpoints:**

- `segments.create` - Create new segment
- `segments.update` - Update segment query
- `segments.list` - List all segments
- `segments.get` - Get segment details
- `segments.testQuery` - Test query and get count

**Example Usage:**

```typescript
// Create segment
const segment = await trpc.segments.create.mutate({
  name: "Comedy Fans in Bengaluru",
  query: {
    city: "Bengaluru",
    categories: ["COMEDY"],
  },
});

// Test query
const test = await trpc.segments.testQuery.query({
  query: {
    city: "Bengaluru",
    categories: ["COMEDY"],
  },
});
// Result: { count: 1234, valid: true }
```

### 5. Tracking

Campaign tracking enables measurement of email engagement and attribution.

**Open Tracking:**

- Endpoint: `/api/trk/open?rid={recipientId}`
- Returns 1x1 transparent GIF
- Updates recipient status to `OPENED`
- Records `openedAt` timestamp

**Click Tracking:**

- Endpoint: `/api/trk/c?rid={recipientId}&url={encodedUrl}`
- Updates recipient status to `CLICKED`
- Records `clickedAt` timestamp
- Redirects to target URL

**UTM Attribution:**

- Campaign links include UTM parameters
- Bookings capture `campaignId` from UTM
- Enables conversion tracking and ROI calculation

**Example Email Template:**

```html
<html>
  <body>
    <h1>Special Offer!</h1>
    <p>Get 20% off comedy shows this month.</p>
    <a
      href="/api/trk/c?rid={{recipientId}}&url={{eventUrl}}?utm_campaign={{campaignId}}"
    >
      View Events
    </a>
    <img src="/api/trk/open?rid={{recipientId}}" width="1" height="1" />
  </body>
</html>
```

### 6. Reports

Campaign and promo code reports provide insights into marketing effectiveness.

**Campaign Metrics:**

- Total recipients
- Sent count
- Open rate (%)
- Click-through rate (%)
- Conversions (bookings attributed via UTM)
- Conversion rate (%)

**Promo Code Metrics:**

- Total redemptions
- GMV driven (gross merchandise value)
- Breakage rate (unused codes)
- Usage by event/category/city

**Access:**

- Organizers see their own campaigns/promos
- Admins see all campaigns/promos system-wide

## Database Schema

### PromoCode

```prisma
model PromoCode {
  id                    String         @id @default(cuid())
  code                  String         @unique
  type                  PromoCodeType  // PERCENT | FLAT
  value                 Int
  startAt               DateTime?
  endAt                 DateTime?
  usageLimit            Int?
  usageCount            Int            @default(0)
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
  event     Event     @relation(fields: [eventId], references: [id])
}
```

### Campaign

```prisma
model Campaign {
  id          String              @id @default(cuid())
  name        String
  channel     NotificationChannel // EMAIL | SMS
  status      CampaignStatus
  templateKey String
  scheduledAt DateTime?
  sentAt      DateTime?
  createdBy   String
  segmentId   String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  segment     Segment?
  recipients  CampaignRecipient[]
  bookings    Booking[]
}
```

### Segment

```prisma
model Segment {
  id        String     @id @default(cuid())
  name      String
  query     Json
  createdBy String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  campaigns Campaign[]
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
  status     CampaignRecipientStatus
  openedAt   DateTime?
  clickedAt  DateTime?
  createdAt  DateTime                @default(now())
  updatedAt  DateTime                @updatedAt
  campaign   Campaign
}
```

### Booking Extensions

```prisma
model Booking {
  // ... existing fields ...
  promoCodeId    String?
  campaignId     String?
  discountAmount Int?
  promoCode      PromoCode?
  campaign       Campaign?
}
```

## CI/CD Considerations

The marketing system is designed to work offline in CI environments:

- No external email/SMS providers required for tests
- Fake providers used in test environment
- Tracking routes work with in-memory database
- All tests can run without network access

## Security

- Promo codes are validated server-side
- Organizers can only manage their own promos/campaigns
- Admins have override access to all resources
- Tracking routes validate recipient IDs
- No sensitive data exposed in tracking URLs

## Performance

- Promo validation is optimized with database indexes
- Segment queries use efficient Prisma operations
- Campaign recipient materialization is batched
- Tracking routes use minimal database operations

## Future Enhancements

- A/B testing for campaigns
- Dynamic promo code generation
- Advanced segment operators (AND/OR/NOT)
- SMS campaign support
- Push notification campaigns
- Automated campaign scheduling based on events
- Promo code usage analytics dashboard
- Campaign ROI calculator
