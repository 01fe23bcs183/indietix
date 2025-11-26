# Fix Mobile App TypeScript Errors

## Overview
This PR fixes TypeScript errors in the mobile app that prevent it from loading. The errors stem from API mismatches, outdated type definitions, and SDK version changes.

## Root Causes Identified

### 1. tRPC API Call Mismatches
The mobile app calls tRPC procedures that don't exist in the backend:
- `trpc.booking.list` - No `list` procedure in booking router
- `trpc.booking.get` - No `get` procedure in booking router  
- `trpc.events.get` - Should be `trpc.events.getBySlug`

**Solution**: Update mobile app to use existing procedures or stub out functionality for offline-first experience.

### 2. FEES Constant Structure Mismatch
The mobile app uses percentage-based fee fields that don't exist:
```typescript
// Mobile app expects:
FEES.CONVENIENCE_FEE_PERCENT
FEES.PLATFORM_FEE_PERCENT

// Actual FEES object:
FEES = {
  paymentGateway: 2,
  serverMaintenance: 2,
  platformSupport: 10,
}
```

**Solution**: Use `computeBookingAmounts()` helper from `@indietix/utils` instead of manual calculation.

### 3. TicketPayload Type Mismatch
The actual `TicketPayload` type uses `ts` field, but code uses `timestamp`:
```typescript
// Actual type:
interface TicketPayload {
  bookingId: string;
  userId: string;
  eventId: string;
  ts: number;  // NOT timestamp
}
```

**Solution**: Update all references from `timestamp` to `ts`.

### 4. Sentry SDK API Changes
The `@sentry/react-native@~5.20.0` version doesn't support:
- `enableInExpoDevelopment` option
- `Sentry.SeverityLevel` type export

**Solution**: Remove unsupported options and use string literal types.

### 5. AuthContext Type Errors
The auth router returns a user object that needs proper typing.

**Solution**: Cast the result to match the User interface.

## Files Modified
- `apps/mobile/app/events/[slug].tsx` - Fix FEES usage
- `apps/mobile/app/(tabs)/bookings.tsx` - Fix booking.list call
- `apps/mobile/app/bookings/[id].tsx` - Fix booking.get call, timestamp -> ts
- `apps/mobile/app/waitlist/[eventId].tsx` - Fix events.get call
- `apps/mobile/lib/sentry.ts` - Fix Sentry SDK options
- `apps/mobile/contexts/AuthContext.tsx` - Fix type errors
- `apps/mobile/__tests__/ticketCache.test.ts` - Fix timestamp -> ts

## Testing
- Run `npx tsc --noEmit` to verify TypeScript errors are fixed
- Run `pnpm --filter apps/mobile test` to verify tests pass
- Run `pnpm -w build` and `pnpm -w test` before creating PR
