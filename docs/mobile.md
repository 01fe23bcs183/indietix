# IndieTix Mobile App Documentation

## Overview

The IndieTix mobile application is a React Native app built with Expo that provides customers with a seamless event booking and ticket management experience. The app supports offline ticket viewing, push notifications, and comprehensive accessibility features.

## Architecture

### Technology Stack

- **Framework**: Expo 50 with React Native 0.73
- **Navigation**: Expo Router (file-based routing)
- **State Management**: TanStack Query (React Query) + tRPC
- **Storage**: AsyncStorage for offline data
- **Notifications**: expo-notifications
- **Analytics**: PostHog
- **Crash Reporting**: Sentry
- **Testing**: Jest + React Native Testing Library + Maestro

### Key Features

1. **Offline Tickets** - View tickets without network connectivity
2. **Push Notifications** - Event reminders and waitlist offers with deep linking
3. **Haptic Feedback** - Tactile feedback for major user actions
4. **Accessibility** - Full VoiceOver/TalkBack support with ARIA labels
5. **Error Boundaries** - Graceful error handling with retry patterns
6. **Network Detection** - Offline banner when connectivity is lost

## Offline Tickets System

### Architecture

The offline tickets system allows users to view their tickets without an internet connection by caching ticket data locally using AsyncStorage.

### Components

#### TicketCache Module (`apps/mobile/utils/TicketCache.ts`)

**Functions:**
- `cacheTicket(bookingId, ticket)` - Saves ticket to local storage
- `getCachedTicket(bookingId)` - Retrieves cached ticket
- `getAllCachedTickets()` - Lists all cached tickets
- `removeCachedTicket(bookingId)` - Removes a cached ticket
- `encodeTicketForQR(ticket)` - Encodes ticket for QR display
- `decodeTicketFromCache(cached)` - Decodes cached ticket

**Data Structure:**
```typescript
interface CachedTicket {
  payload: {
    bookingId: string;
    userId: string;
    eventId: string;
    timestamp: number;
  };
  signature: string;
  meta: {
    eventTitle: string;
    eventDate: string;
    venue: string;
    city: string;
    ticketNumber: string;
    seats: number;
    cachedAt: number;
  };
}
```

### Ticket Caching Flow

1. **Automatic Caching**: When a booking is confirmed (status: `CONFIRMED`), the ticket is automatically cached to AsyncStorage
2. **Offline Rendering**: The ticket screen attempts to fetch from the API, falling back to cached data if offline
3. **Timestamp Display**: Shows "Updated X minutes ago" based on `cachedAt` timestamp
4. **Auto-Refresh**: When device comes back online, fresh data is fetched and cache is updated

### Implementation Example

```typescript
// Automatic caching on booking confirmation
onSuccess: async (data) => {
  if (data.status === "CONFIRMED" && data.qrCode) {
    const ticketToCache: CachedTicket = {
      payload: {
        bookingId: data.id,
        userId: data.userId,
        eventId: data.eventId,
        timestamp: Date.now(),
      },
      signature: data.ticketPayloadHash || "",
      meta: {
        eventTitle: data.event.title,
        eventDate: new Date(data.event.startTime).toLocaleDateString(),
        venue: data.event.venue,
        city: data.event.city,
        ticketNumber: data.id.slice(0, 8).toUpperCase(),
        seats: data.seats,
        cachedAt: Date.now(),
      },
    };
    await cacheTicket(data.id, ticketToCache);
  }
}
```

## Push Notifications

### Setup

Push notifications are implemented using `expo-notifications` with support for deep linking and local notification inbox.

### Registration Flow

1. **App Launch**: Push token is registered on app open
2. **Permission Request**: User is prompted for notification permissions
3. **Token Registration**: Token is sent to backend via `POST /api/push/register`
4. **Backend Storage**: Backend stores token associated with user ID

### Notification Types

| Type | Description | Deep Link |
|------|-------------|-----------|
| `event_reminder` | Reminder 24h or 2h before event | `indietix://event/{slug}` |
| `waitlist_offer` | Seat available from waitlist | `indietix://waitlist/claim/{offerId}` |
| `booking_confirmed` | Booking confirmation | `indietix://bookings/{bookingId}` |
| `general` | Platform announcements | None |

### Deep Linking

Deep links follow the format: `indietix://path/to/resource`

**Supported Routes:**
- `indietix://event/{slug}` - Event detail page
- `indietix://bookings/{bookingId}` - Ticket detail page
- `indietix://waitlist/claim/{offerId}` - Waitlist offer claim page

### Notification Inbox

The app maintains a local inbox of the last 20 notifications using AsyncStorage.

**NotificationCache Module** (`apps/mobile/lib/notificationCache.ts`):
- `saveNotification(notification)` - Saves notification to inbox
- `getNotifications()` - Retrieves all notifications
- `markNotificationAsRead(id)` - Marks notification as read
- `getUnreadCount()` - Returns count of unread notifications
- `clearAllNotifications()` - Clears all notifications

## App Polish Features

### Haptic Feedback

Haptic feedback is implemented using `expo-haptics` for major user actions:

**Impact Feedback:**
- Medium impact: Share ticket, add to calendar
- Heavy impact: Cancel booking

**Notification Feedback:**
- Success: Successful share, calendar add
- Error: Failed operations

### Accessibility

All interactive elements include accessibility labels and hints:

```typescript
<TouchableOpacity
  accessibilityLabel="Add event to calendar"
  accessibilityHint="Adds this event to your device calendar with reminders"
  accessibilityRole="button"
>
  <Text>📅 Add to Calendar</Text>
</TouchableOpacity>
```

**Accessibility Features:**
- VoiceOver/TalkBack support
- Semantic roles for all interactive elements
- Descriptive labels and hints
- Dynamic type support (respects system font size)

### Network Offline Banner

The `OfflineBanner` component displays a persistent banner when the device loses connectivity:

```typescript
import { OfflineBanner } from "../components/OfflineBanner";

// In app layout
<OfflineBanner />
```

Uses `@react-native-community/netinfo` to detect network state changes.

### Error Boundaries

The app includes error boundaries for graceful error handling:

```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Features:**
- Catches React component errors
- Displays user-friendly error screen
- Provides "Try Again" button to reset state
- Logs errors to console (and Sentry in production)

## Analytics & Monitoring

### PostHog Analytics

PostHog is integrated for user behavior tracking.

**Tracked Events:**
- `view_event` - User views event detail
- `add_to_cart` - User initiates booking
- `booking_confirmed` - Booking completed
- `open_ticket` - User views ticket
- `push_opened` - User taps push notification
- `join_waitlist` - User joins event waitlist
- `claim_waitlist_offer` - User claims waitlist offer

**Usage:**
```typescript
import { Analytics } from "../lib/analytics";

Analytics.viewEvent(eventId, eventSlug);
Analytics.bookingConfirmed(bookingId, eventId, amount);
```

### Sentry Crash Reporting

Sentry is integrated for crash reporting and error tracking.

**Configuration:**
- DSN from environment variable: `EXPO_PUBLIC_SENTRY_DSN`
- Automatically captures unhandled errors
- Manual error capture: `captureException(error, context)`

**Usage:**
```typescript
import { captureException } from "../lib/sentry";

try {
  // risky operation
} catch (error) {
  captureException(error, { context: "additional info" });
}
```

## EAS Build & Deployment

### Build Profiles

The app is configured with three EAS build profiles:

**Development** (`eas.json`):
- Development client enabled
- Internal distribution
- iOS simulator builds
- Android APK builds
- Channel: `development`

**Preview** (`eas.json`):
- Internal distribution for testing
- Real device builds
- Android APK builds
- Channel: `preview`

**Production** (`eas.json`):
- App Store / Play Store distribution
- Android App Bundle
- Channel: `production`

### OTA Updates Strategy

The app uses `expo-updates` for over-the-air updates:

**Channels:**
- `preview` - Internal testers receive updates immediately
- `production` - Production users receive updates after store release

**Update Flow:**
1. Code changes pushed to repository
2. EAS build triggered (manual or automated)
3. Update published to channel
4. App checks for updates on launch
5. Update downloaded and applied on next restart

### GitHub Actions Integration

**Manual EAS Build** (`.github/workflows/eas-preview.yml`):
- Workflow dispatch trigger
- Platform selection (Android/iOS/All)
- Requires `EXPO_TOKEN` secret
- Builds preview profile for internal testing

**Usage:**
1. Go to Actions tab in GitHub
2. Select "EAS Preview Build" workflow
3. Click "Run workflow"
4. Select platform
5. Monitor build in EAS dashboard

## Testing

### Unit Tests

**Test Files:**
- `apps/mobile/__tests__/ticketCache.test.ts` - TicketCache module tests
- `apps/mobile/__tests__/notificationCache.test.ts` - NotificationCache module tests

**Run Tests:**
```bash
cd apps/mobile
pnpm test
```

### E2E Tests (Maestro)

**Smoke Test** (`.maestro/smoke.yml`):
1. Launch app
2. Navigate to Bookings tab
3. Open first ticket
4. Verify QR code is visible
5. Verify ticket details are displayed
6. Navigate back to Home

**Run Maestro Tests:**
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run smoke test
maestro test .maestro/smoke.yml
```

**CI Integration:**
- Runs on every PR via `.github/workflows/mobile-e2e.yml`
- Non-blocking (continue-on-error: true)
- Builds Android APK and runs on emulator

## QA Device Matrix

### Android Testing Targets

| OS Version | Screen Size | Resolution | Device Example |
|------------|-------------|------------|----------------|
| Android 10 | Small | 360x640 | Pixel 3a |
| Android 10 | Medium | 411x891 | Pixel 4 |
| Android 10 | Large | 480x960 | Pixel 4 XL |
| Android 12 | Small | 360x640 | Pixel 5a |
| Android 12 | Medium | 411x891 | Pixel 6 |
| Android 12 | Large | 480x960 | Pixel 6 Pro |
| Android 14 | Small | 360x640 | Pixel 7a |
| Android 14 | Medium | 411x891 | Pixel 7 |
| Android 14 | Large | 480x960 | Pixel 7 Pro |

### iOS Testing Targets

| OS Version | Device | Screen Size |
|------------|--------|-------------|
| iOS 16 | iPhone SE (3rd gen) | 4.7" |
| iOS 16 | iPhone 14 | 6.1" |
| iOS 16 | iPhone 14 Plus | 6.7" |
| iOS 17 | iPhone SE (3rd gen) | 4.7" |
| iOS 17 | iPhone 15 | 6.1" |
| iOS 17 | iPhone 15 Plus | 6.7" |
| iOS 18 | iPhone SE (3rd gen) | 4.7" |
| iOS 18 | iPhone 15 | 6.1" |
| iOS 18 | iPhone 15 Plus | 6.7" |

### Testing Checklist

- [ ] App launches successfully
- [ ] User can sign in/sign up
- [ ] Events load and display correctly
- [ ] Booking flow completes successfully
- [ ] Tickets display with QR codes
- [ ] Offline mode works (airplane mode)
- [ ] Push notifications received and tappable
- [ ] Deep links navigate correctly
- [ ] Haptic feedback works on supported devices
- [ ] VoiceOver/TalkBack navigation works
- [ ] Dynamic type scales correctly
- [ ] Error boundaries catch and display errors
- [ ] Network offline banner appears when offline

## Environment Variables

The app uses the following environment variables:

```bash
# PostHog Analytics
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_api_key
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry Crash Reporting
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn

# API Endpoint
EXPO_PUBLIC_API_URL=https://api.indietix.com
```

**CI/Development:**
- Mock values used when environment variables not set
- Analytics and Sentry gracefully degrade without credentials

## Troubleshooting

### Common Issues

**Issue: Push notifications not working**
- Verify `expo-notifications` plugin is configured in `app.json`
- Check notification permissions are granted
- Ensure `EXPO_TOKEN` is set for EAS builds
- Test on physical device (not simulator)

**Issue: Offline tickets not displaying**
- Check AsyncStorage permissions
- Verify ticket was cached (check console logs)
- Clear app data and re-cache ticket

**Issue: Deep links not working**
- Verify URL scheme is configured in `app.json`
- Check deep link format matches expected pattern
- Test with `npx uri-scheme open indietix://event/test-event --ios`

**Issue: Maestro tests failing**
- Ensure mock data is loaded in app
- Check element labels match test assertions
- Run tests on correct API level (34 for Android)

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start Expo dev server
cd apps/mobile
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Building for Production

```bash
# Build preview APK
eas build --profile preview --platform android

# Build production bundle
eas build --profile production --platform all

# Submit to stores
eas submit --platform all
```

## Future Enhancements

- [ ] Biometric authentication for ticket access
- [ ] Wallet integration (Apple Wallet, Google Pay)
- [ ] Social sharing with event invites
- [ ] In-app chat with event organizers
- [ ] Augmented reality venue navigation
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Ticket transfer functionality
- [ ] Refund request flow
- [ ] Event check-in QR scanner (organizer app)
