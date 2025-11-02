# Analytics System Documentation

## Overview

The IndieTix Analytics system provides comprehensive insights into event performance, revenue tracking, and user engagement for event organizers. The system tracks event views, bookings, and revenue across time periods with flexible filtering and export capabilities.

## Architecture

### Data Model

#### EventView

Tracks individual page views for events to measure engagement and calculate conversion funnels.

```prisma
model EventView {
  id        String   @id @default(cuid())
  eventId   String
  userId    String?  // Optional: tracks authenticated users
  createdAt DateTime @default(now())

  event     Event    @relation(fields: [eventId], references: [id])

  @@index([eventId, createdAt])  // Optimized for time-range queries
}
```

**Key Features:**

- Composite index on `(eventId, createdAt)` for efficient time-range queries
- Optional `userId` field tracks both authenticated and anonymous users
- Automatic timestamp tracking with `createdAt`

### API Endpoints

All analytics endpoints are available under `organizer.analytics.*` in the tRPC router.

#### 1. Summary Metrics

**Endpoint:** `organizer.analytics.summary`

**Input:**

```typescript
{
  from: string;        // ISO 8601 datetime
  to: string;          // ISO 8601 datetime
  organizerId?: string; // Optional: admins can query any organizer
}
```

**Output:**

```typescript
{
  revenue: number; // Total revenue in rupees
  bookings: number; // Total confirmed bookings
  avgTicket: number; // Average ticket price (rounded)
  seatsSold: number; // Total seats sold
  eventsLive: number; // Currently published events with future dates
}
```

**Business Logic:**

- Only counts CONFIRMED bookings
- Revenue calculated from `finalAmount` (includes all fees)
- Average ticket rounded to nearest rupee
- Events live counts PUBLISHED events with `date >= now()`

#### 2. Time-Series Data

**Endpoint:** `organizer.analytics.timeseries`

**Input:**

```typescript
{
  from: string;
  to: string;
  interval: "day" | "week";
}
```

**Output:**

```typescript
Array<{
  t: string; // ISO date string (YYYY-MM-DD)
  revenue: number; // Revenue for this bucket
  bookings: number; // Bookings count for this bucket
}>;
```

**Bucketing Logic:**

- **Day:** Groups by calendar date (YYYY-MM-DD)
- **Week:** Groups by week start (Sunday = day 0)
- Empty buckets filled with zero values for continuous charts
- Sorted chronologically

#### 3. Top Events

**Endpoint:** `organizer.analytics.topEvents`

**Input:**

```typescript
{
  from: string;
  to: string;
  by: "revenue" | "attendance";
  limit: number; // 1-50, default 10
}
```

**Output:**

```typescript
Array<{
  eventId: string;
  eventTitle: string;
  eventDate: string;
  city: string;
  category: string;
  revenue: number;
  attendance: number; // Total seats sold
  bookings: number; // Number of bookings
}>;
```

**Sorting:**

- `by: "revenue"` - Descending by total revenue
- `by: "attendance"` - Descending by total seats sold

#### 4. Conversion Funnel

**Endpoint:** `organizer.analytics.funnel`

**Input:**

```typescript
{
  from: string;
  to: string;
}
```

**Output:**

```typescript
{
  views: number; // Total EventView records
  detailViews: number; // Same as views (all views are detail views)
  addToCart: number; // Total bookings (all statuses)
  bookings: number; // Total bookings (all statuses)
}
```

**Conversion Stages:**

1. **Views:** User lands on event detail page
2. **Detail Views:** Same as views (simplified funnel)
3. **Add to Cart:** User initiates booking
4. **Bookings:** Booking created (any status)

**Note:** Currently `addToCart` and `bookings` are identical. Future enhancement could track cart abandonment separately.

#### 5. CSV Export

**Endpoint:** `organizer.analytics.exportCsv`

**Input:**

```typescript
{
  from: string;
  to: string;
}
```

**Output:** CSV string with:

- Daily time-series data (date, revenue, bookings, seats)
- Summary section (total revenue, bookings, seats, avg ticket)

**CSV Format:**

```csv
date,revenue,bookings,seats
2025-01-01,10000,5,12
2025-01-02,15000,8,20
...

Summary
Total Revenue,125000
Total Bookings,50
Total Seats Sold,120
Average Ticket,2500
```

### Event View Tracking

#### Web App Integration

Event views are tracked automatically when users visit event detail pages.

**Endpoint:** `POST /api/track/event-view`

**Request Body:**

```json
{
  "eventId": "clx123..."
}
```

**Response:**

```json
{
  "success": true,
  "tracked": true
}
```

**Implementation Details:**

- Triggered via `useEffect` hook on event detail page load
- Tracks authenticated user ID when available
- Skips tracking when `NODE_ENV=test` (CI-friendly)
- Fire-and-forget: errors logged but don't block page load
- No duplicate prevention (each page load = 1 view)

### Authorization

All analytics endpoints require:

1. **Authentication:** Valid session with authenticated user
2. **Organizer Role:** User must have an associated Organizer record
3. **Ownership:** Organizer can only access their own analytics
4. **Admin Override:** Users with ADMIN role can access any organizer's analytics

**Authorization Flow:**

```typescript
1. requireAuth(ctx) → validates session
2. requireOrganizer(userId) → validates organizer role
3. Check organizerId match (or ADMIN role)
```

## UI Dashboard

### Location

`/organizer/analytics` (requires organizer authentication)

### Components

#### Summary Cards (5)

- **Total Revenue:** Formatted as ₹X,XXX
- **Bookings:** Integer count
- **Avg Ticket Price:** Formatted as ₹X,XXX
- **Seats Sold:** Integer count
- **Events Live:** Integer count

#### Charts

**1. Revenue Over Time (Line Chart)**

- X-axis: Date
- Y-axis: Revenue (₹)
- Tooltip: Formatted currency
- Data: From timeseries endpoint

**2. Bookings Over Time (Line Chart)**

- X-axis: Date
- Y-axis: Bookings count
- Data: From timeseries endpoint

**3. Conversion Funnel (Bar Chart)**

- Stages: Views → Detail Views → Add to Cart → Bookings
- Shows conversion rate percentage
- Data: From funnel endpoint

**4. Top Events Table**

- Columns: Event, Revenue, Attendance
- Sorted by revenue (descending)
- Shows top 10 events
- Data: From topEvents endpoint

#### Filters

**Date Range Selector:**

- Last 7 days
- Last 30 days (default)
- Last 90 days
- Custom (shows date pickers)

**Custom Date Range:**

- From: Date picker
- To: Date picker
- Applied on selection

#### Export

**CSV Export Button:**

- Downloads CSV file with naming: `analytics-{from}-to-{to}.csv`
- Includes daily time-series + summary
- Automatic browser download

### Technology Stack

- **Charts:** Recharts 2.10.3
- **Styling:** Tailwind CSS
- **Data Fetching:** tRPC + React Query
- **Currency Formatting:** `formatINR` from `@indietix/utils`

## Data Definitions

### Revenue

Total amount paid by customers including:

- Base ticket price × quantity
- Convenience fee
- Platform fee
- GST on fees

**Source:** `Booking.finalAmount` where `status = CONFIRMED`

### Bookings

Count of booking records with `status = CONFIRMED`

**Note:** One booking can contain multiple seats.

### Average Ticket

`Math.round(totalRevenue / totalBookings)`

Returns 0 when no bookings exist.

### Seats Sold

Sum of `Booking.seats` where `status = CONFIRMED`

### Events Live

Count of events where:

- `status = PUBLISHED`
- `date >= now()`

### Views

Count of `EventView` records within date range.

**Tracking Method:** Client-side POST request on event detail page load.

## Caveats & Limitations

### View Tracking

**No Duplicate Prevention:**

- Each page load creates a new view record
- Browser refresh = new view
- Same user visiting multiple times = multiple views
- Bot traffic not filtered

**Recommendation:** For production, consider:

- Session-based deduplication (1 view per session per event)
- IP-based rate limiting
- User-agent filtering for bots

**Test Environment:**

- Views NOT tracked when `NODE_ENV=test`
- Prevents CI test pollution
- Seed data includes synthetic views for testing

### Time Zones

**All timestamps stored in UTC:**

- Database: UTC timestamps
- API: ISO 8601 strings
- UI: Browser local time for display

**Date Range Queries:**

- Inclusive of start date (>=)
- Inclusive of end date (<=)
- Bucketing uses UTC dates

### Performance

**Optimizations:**

- Composite index on `(eventId, createdAt)` for EventView
- Existing indexes on Booking for time-range queries
- Aggregations performed at database level

**Scaling Considerations:**

- Large date ranges (>90 days) may be slow with many events
- Consider pagination for top events with >1000 events
- EventView table grows unbounded (consider archival strategy)

### Data Accuracy

**Booking Status:**

- Only CONFIRMED bookings counted in revenue/seats
- PENDING/CANCELLED bookings excluded
- Refunded bookings still counted (status remains CONFIRMED)

**Future Enhancement:** Track refunds separately to show net revenue.

**Event Views:**

- Anonymous views tracked (userId = null)
- No session deduplication
- Includes organizer's own views

## Testing

### Unit Tests

Location: `packages/api/src/__tests__/analytics.spec.ts`

Tests cover:

- Time-series bucketing (day/week)
- Average ticket calculation
- Conversion rate calculation
- CSV cell escaping
- Date range generation
- Revenue/seats aggregation

### E2E Tests

Location: `apps/organizer/e2e/analytics.spec.ts`

Tests cover:

- Dashboard page load
- Summary cards display
- Charts rendering
- Date range filters
- Custom date inputs
- CSV export download
- Top events table

### Seed Data

Synthetic analytics data included in `packages/db/prisma/seed.ts`:

- 30 days of event views (10-60 per event per day)
- 30 days of bookings (0-5 per event per day)
- Data for both test organizers
- Realistic timestamp distribution

## Future Enhancements

### Planned Features

1. **City/Category Filters:** Filter analytics by event location or type
2. **Bookings by Category Chart:** Bar chart showing distribution
3. **Session-Based View Tracking:** Deduplicate views per session
4. **Net Revenue:** Subtract refunds from total revenue
5. **Comparison Periods:** Compare current vs previous period
6. **Real-Time Updates:** WebSocket updates for live events
7. **Event-Specific Analytics:** Drill-down to individual event performance
8. **Cohort Analysis:** Track user behavior over time
9. **Revenue Forecasting:** Predict future revenue based on trends
10. **Export Formats:** PDF reports, Excel files

### Database Optimizations

1. **Materialized Views:** Pre-aggregate daily/weekly stats
2. **Partitioning:** Partition EventView by date for faster queries
3. **Archival:** Move old EventView records to cold storage
4. **Caching:** Redis cache for frequently accessed date ranges

## Troubleshooting

### No Data Showing

1. Check date range includes booking dates
2. Verify organizer has events with confirmed bookings
3. Check browser console for API errors
4. Verify authentication (organizer role required)

### View Tracking Not Working

1. Check `NODE_ENV` is not set to "test"
2. Verify `/api/track/event-view` endpoint accessible
3. Check browser console for fetch errors
4. Verify EventView table exists in database

### CSV Export Fails

1. Check date range is valid
2. Verify organizer has data in range
3. Check browser allows downloads
4. Verify tRPC endpoint accessible

### Performance Issues

1. Reduce date range (try 30 days instead of 90)
2. Check database indexes exist
3. Monitor database query performance
4. Consider caching for frequently accessed ranges

## API Examples

### Fetch Summary (cURL)

```bash
curl -X POST https://indietix.com/api/trpc/organizer.analytics.summary \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "from": "2025-01-01T00:00:00Z",
    "to": "2025-01-31T23:59:59Z"
  }'
```

### Track Event View (JavaScript)

```javascript
fetch("/api/track/event-view", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ eventId: "clx123..." }),
});
```

## Support

For issues or questions:

- Check this documentation first
- Review test files for usage examples
- Check tRPC router implementation for business logic
- Contact platform support for production issues
