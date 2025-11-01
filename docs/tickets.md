# Ticket System Documentation

## Overview

The IndieTix ticket system provides secure QR code-based tickets for confirmed bookings with offline support for customers and a PWA-based check-in scanner for organizers.

## Architecture

### Security Model

The ticket system uses HMAC-SHA256 signatures to ensure ticket authenticity and prevent fraud.

**Payload Structure:**
```typescript
{
  bookingId: string;
  userId: string;
  eventId: string;
  ts: number; // timestamp
}
```

**Signature Generation:**
```
signature = HMAC_SHA256(JSON.stringify(payload), TICKET_SECRET)
```

**Storage:**
- `Booking.qrCode`: Encoded JSON string containing `{ payload, signature }`
- `Booking.ticketPayloadHash`: Hash of the payload for integrity verification
- `Booking.attendedAt`: Timestamp when ticket was scanned (null if not attended)

### Database Schema

**Booking Model Extensions:**
```prisma
model Booking {
  // ... existing fields
  attendedAt         DateTime?
  qrCode             String?
  ticketPayloadHash  String?
  scanLogs           ScanLog[]
}
```

**ScanLog Model:**
```prisma
model ScanLog {
  id          String   @id @default(cuid())
  bookingId   String
  organizerId String
  status      String   // "OK" or "REJECTED"
  reason      String?  // Rejection reason
  deviceInfo  String?  // Scanner device information
  createdAt   DateTime @default(now())
  
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId, createdAt])
  @@index([organizerId])
}
```

## API Endpoints

### GET /api/tickets/[bookingId]

Returns ticket data for authorized users.

**Authorization:**
- User must be the booking owner OR have ADMIN role

**Response:**
```json
{
  "payload": {
    "bookingId": "...",
    "userId": "...",
    "eventId": "...",
    "ts": 1234567890
  },
  "signature": "...",
  "event": {
    "title": "...",
    "date": "...",
    "venue": "...",
    "city": "..."
  },
  "ticketNumber": "TIX-...",
  "seats": 2
}
```

**Error Responses:**
- 401: Unauthorized (no session)
- 403: Forbidden (not booking owner)
- 404: Booking not found
- 400: Booking not confirmed or ticket not generated

### POST /api/checkin/scan

Verifies and marks tickets as attended.

**Authorization:**
- User must have ORGANIZER or ADMIN role
- Organizer must own the event (unless ADMIN)

**Request Body:**
```json
{
  "payload": {
    "bookingId": "...",
    "userId": "...",
    "eventId": "...",
    "ts": 1234567890
  },
  "signature": "...",
  "deviceInfo": "..." // Optional
}
```

**Success Response:**
```json
{
  "ok": true,
  "name": "John Doe",
  "email": "john@example.com",
  "seats": 2,
  "ticketNumber": "TIX-...",
  "eventTitle": "..."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Error message",
  "attendedAt": "..." // If already attended
}
```

**Validation Rules:**
1. Signature must be valid (HMAC verification)
2. Booking must exist
3. Booking status must be CONFIRMED
4. Booking must not be already attended (attendedAt is null)
5. Event must belong to the organizer (or user is ADMIN)

**Idempotency:**
All scan attempts are logged in the ScanLog table with status "OK" or "REJECTED" and optional reason.

## Customer Features

### Web Ticket View

**Route:** `/bookings/[id]`

**Features:**
- Displays QR code for scanning at venue
- Shows event details (title, date, venue, seats)
- "Add to Calendar" button (Google Calendar integration)
- Offline support via localStorage caching
- "Works offline" banner when network is unavailable

**Offline Behavior:**
- On first load, ticket data is fetched from API and cached in localStorage
- If network fails, cached data is used automatically
- QR code renders from cached data without network access

### Mobile Ticket View

**Utility:** `apps/mobile/utils/TicketCache.ts`

**Features:**
- AsyncStorage-based persistence for offline access
- Cached ticket includes payload, signature, and metadata
- Multiple tickets can be cached simultaneously
- Tickets persist across app restarts

**API:**
```typescript
// Cache a ticket
await cacheTicket(bookingId, {
  payload: { bookingId, userId, eventId, ts },
  signature: "...",
  meta: {
    eventTitle: "...",
    eventDate: "...",
    venue: "...",
    city: "...",
    ticketNumber: "...",
    seats: 2,
    cachedAt: Date.now()
  }
});

// Retrieve cached ticket
const ticket = await getCachedTicket(bookingId);

// Remove cached ticket
await removeCachedTicket(bookingId);

// Get all cached tickets
const allTickets = await getAllCachedTickets();
```

## Organizer Check-in Scanner

### Scanner Page

**Route:** `/scanner` (organizer dashboard)

**Features:**
- Camera-based QR code scanning (html5-qrcode library)
- Real-time ticket verification via API
- Success/fail feedback with visual, audio, and haptic cues
- Manual search fallback (by booking ID or ticket number)
- Device info tracking for audit logs

**Scanner Flow:**
1. Organizer clicks "Start Camera Scanner"
2. Camera permission is requested
3. QR code is detected and decoded
4. Ticket payload and signature are sent to `/api/checkin/scan`
5. Server verifies signature and booking status
6. Success or error is displayed with feedback
7. Scan log is created for audit trail

**Feedback Mechanisms:**
- **Success:** Green screen, checkmark icon, high-pitched beep, double vibration
- **Error:** Red screen, X icon, low-pitched buzz, single vibration
- **Display:** Shows attendee name, email, seats, ticket number

**Manual Search:**
- Input field for booking ID or ticket number
- Fetches ticket data from `/api/tickets/[bookingId]`
- Processes as if scanned via camera

## Anti-Fraud Measures

### Signature Verification

All tickets are signed with HMAC-SHA256 using a server-side secret (`TICKET_SECRET`). The signature cannot be forged without access to the secret.

### Reuse Prevention

Once a ticket is scanned and marked as attended (`attendedAt` is set), subsequent scans are rejected with "Ticket already used" error.

### Audit Logging

Every scan attempt is logged in the `ScanLog` table with:
- Booking ID
- Organizer ID
- Status (OK or REJECTED)
- Reason (if rejected)
- Device info (optional)
- Timestamp

This provides a complete audit trail for security and dispute resolution.

### Ownership Verification

Organizers can only scan tickets for their own events (unless they have ADMIN role). The API verifies event ownership before allowing check-in.

## Ticket Generation Flow

1. Customer completes payment for a booking
2. `confirmBookingAndIncrementSeats()` is called
3. Ticket payload is generated with booking ID, user ID, event ID, and timestamp
4. Payload is signed with HMAC-SHA256
5. Signed ticket is encoded as JSON string
6. `qrCode` and `ticketPayloadHash` are stored on the Booking record
7. Booking status is set to CONFIRMED

## Testing

### Unit Tests

**Signature Verification:**
- Valid signature passes verification
- Invalid signature fails verification
- Tampered payload fails verification

**Ticket Cache:**
- Encode/decode roundtrip preserves data
- Cached tickets can be retrieved
- Multiple tickets can be cached

### Integration Tests

**API Routes:**
- `/api/tickets/[bookingId]` returns ticket for authorized user
- `/api/tickets/[bookingId]` rejects unauthorized access
- `/api/checkin/scan` accepts valid tickets
- `/api/checkin/scan` rejects invalid signatures
- `/api/checkin/scan` rejects already-attended tickets
- `/api/checkin/scan` rejects tickets for other organizers' events

### E2E Tests (Playwright)

**Web Ticket View:**
- Confirmed booking displays QR code
- Event details are shown correctly
- "Add to Calendar" button works
- Offline mode uses cached data

**Organizer Scanner:**
- Scanner page loads successfully
- Manual search finds valid bookings
- Success/error states display correctly

## Environment Variables

**Required:**
- `TICKET_SECRET`: Secret key for HMAC signing (must be consistent across all environments)

**Example:**
```env
TICKET_SECRET="indietix-ticket-hmac-secret-2024"
```

## Security Best Practices

1. **Never expose TICKET_SECRET** in client-side code or logs
2. **Rotate TICKET_SECRET** periodically (requires regenerating all tickets)
3. **Monitor ScanLog** for suspicious patterns (e.g., many rejected scans)
4. **Use HTTPS** for all API requests to prevent man-in-the-middle attacks
5. **Validate timestamps** to prevent replay attacks (optional enhancement)

## Future Enhancements

- Timestamp validation (reject tickets older than X hours)
- Batch check-in for multiple tickets
- Offline scanner mode with sync-on-reconnect
- Push notifications for check-in confirmations
- Analytics dashboard for scan patterns
- Export scan logs as CSV for reporting
