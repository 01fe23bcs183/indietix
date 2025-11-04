# Mobile App v0 Development Document

## PR Information
- **PR Number:** #105
- **Branch:** devin/1762240276-mobile-app-v0
- **PR URL:** https://github.com/01fe23bcs183/indietix/pull/105
- **Devin Session:** https://app.devin.ai/sessions/9b10ae6adf844d96a30ca5722295794d
- **Started:** 2025-11-04 08:33 UTC

## Objective
Continue development of IndieTix customer mobile app (PR #105) to bring it to production-ready status matching the web app's maturity level.

## Current State Analysis

### What's Already Implemented (v0)
1. **Authentication Flow**
   - Sign in/sign up screens (mock implementation)
   - AsyncStorage for token persistence
   - Auth context provider
   - ⚠️ **Critical:** Uses mock auth, not real tRPC endpoints

2. **Bookings Management**
   - Bookings list with pull-to-refresh
   - Offline support with cached tickets
   - Ticket detail screen with QR codes
   - Merge logic for API + cached data

3. **Technical Foundation**
   - tRPC client with auth header injection
   - React Query integration
   - Tab navigation (Bookings, Profile)
   - Expo Router setup
   - QR code generation (react-native-qrcode-svg)

4. **CI/CD**
   - 8/9 checks passing
   - ❌ android-e2e failing (Gradle plugin resolution)

### What Needs to Be Built

#### Phase 1: Fix CI (Priority)
The android-e2e check is failing due to Gradle plugin resolution in pnpm monorepo:
- **Problem:** expo-modules-core is in `.pnpm/` store, not at `node_modules/expo-modules-core`
- **Current Approach:** scripts/android-build.sh patches settings.gradle
- **Issue:** Patch uses wrong paths for pnpm workspace structure
- **Solution Needed:** Find correct pnpm path and update settings.gradle patch

#### Phase 2: Feature Parity with Web App

**Event Discovery** (Reference: apps/web/src/app/)
- Home screen with featured events (like web /)
- Events listing with search/filters (/events)
- Event detail page with full info (/events/[slug])
- Category and city filters
- Event favoriting/bookmarking

**Booking Flow** (Reference: apps/web/src/app/checkout/)
- Complete booking initiation from event detail
- Razorpay payment integration (use web checkout as reference)
- Checkout screen with countdown timer (/checkout/[bookingId])
- Payment confirmation and ticket generation
- Promo code application

**Waitlist** (Reference: packages/api/src/routers/waitlist.ts)
- Join waitlist for sold-out events
- Waitlist offer notifications
- Claim waitlist offers

**User Profile** (Reference: apps/web/src/app/profile/)
- Profile management screen
- Notification preferences (email/SMS/push toggles) - reference: apps/web/src/app/profile/notifications
- Booking history with filters (CONFIRMED, CANCELLED, ATTENDED)
- Account settings

**Enhanced Ticket Features**
- Ticket sharing (share QR code image)
- Add to calendar integration
- Offline ticket access with sync indicator
- Ticket transfer functionality

**Technical Improvements**
- Replace mock authentication with real tRPC auth
- Implement push notifications via Expo
- Add React Query persistence for offline-first
- Deep linking for tickets/events (indietix://bookings/[id])
- Error boundaries and loading states
- Pull-to-refresh on all list screens

**Testing**
- Add Jest unit tests for components
- Test offline functionality thoroughly
- Verify on both iOS and Android

## Development Log

### 2025-11-04 08:33 UTC - Session Start
**Action:** Checked out PR branch and analyzed current state
**Findings:**
- PR #105 has 5 commits already
- 8/9 CI checks passing
- android-e2e is the only failing check
- Mock authentication is documented as critical review point
- No physical device testing has been done yet

**Next Steps:**
1. Create progress tracking documentation ✅
2. Create PR-specific document ✅
3. Analyze android-e2e CI failure logs
4. Fix Gradle plugin resolution issue

### 2025-11-04 08:34 UTC - Documentation Created
**Action:** Created progress.md and mobile-app-v0_DOCUMENT.md
**Status:** Ready to begin Phase 1 - Fix android-e2e CI

### 2025-11-04 08:35 UTC - Analyzed CI Failure
**Action:** Downloaded and analyzed android-e2e CI failure logs (job 54442313316)
**Findings:**
- Error: `Included build '/home/runner/work/indietix/indietix/apps/mobile/node_modules/expo-modules-core' does not exist.`
- Root Cause: Script patches settings.gradle with hardcoded paths:
  - `includeBuild("../node_modules/expo-modules-core")`
  - `includeBuild("../../node_modules/expo-modules-core")`
- These paths don't exist in pnpm monorepos where dependencies are in `.pnpm/` store
- Original Expo-generated settings.gradle uses dynamic Node.js resolution which works correctly

### 2025-11-04 08:36 UTC - Implemented Fix (Attempt 1 - Failed)
**Action:** Fixed scripts/android-build.sh to use dynamic Node.js resolution
**Changes:**
- Replaced hardcoded paths with: `new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim()).getParentFile()`
- This matches the pattern Expo uses for other includeBuild directives (e.g., @react-native/gradle-plugin)
- Added logger.quiet() to show resolved path for debugging

**Result:** FAILED - `require.resolve('expo-modules-core/package.json')` returned null because expo-modules-core is a transitive dependency and can't be resolved from android directory context.

### 2025-11-04 08:46 UTC - Implemented Fix (Attempt 2 - Failed)
**Action:** Remove settings.gradle patching entirely
**Rationale:**
- Expo's `useExpoModules()` already handles module linking
- Expo's autolinking.gradle should handle plugin resolution

**Result:** FAILED - Build failed with 2 errors:
1. Plugin [id: 'expo-module-gradle-plugin'] was not found
2. Could not get unknown property 'release' for SoftwareComponent

**Root Cause Identified:** The expo-module-gradle-plugin DOES need to be in pluginManagement's includeBuild. Expo's autolinking doesn't handle this automatically in pnpm monorepos.

### 2025-11-04 08:55 UTC - Implemented Fix (Attempt 3 - Partial Success)
**Action:** Add expo-modules-core to pluginManagement with proper pnpm resolution
**Rationale:**
- The error "Plugin [id: 'expo-module-gradle-plugin'] was not found" confirms we need expo-modules-core in pluginManagement
- In pnpm monorepos, expo-modules-core is at: `node_modules/.pnpm/expo-modules-core@VERSION/node_modules/expo-modules-core`
- Use `require.resolve('expo-modules-core/package.json', { paths: [require.resolve('expo/package.json')] })` to resolve from expo's context

**Result:** PARTIAL SUCCESS - expo-modules-core resolved correctly but new error:
- "Included build ... has name 'expo-modules-core' which is the same as a project of the main build"
- This means expo-modules-core is already included elsewhere (by Expo's autolinking)
- Need to use dependencySubstitution to avoid naming conflict

### 2025-11-04 09:03 UTC - Implemented Fix (Attempt 4 - Failed)
**Action:** Add dependencySubstitution to avoid naming conflict
**Rationale:**
- expo-modules-core is already included as a project by Expo's autolinking
- Using includeBuild without dependencySubstitution causes naming conflict

**Result:** FAILED - Same naming conflict error. dependencySubstitution didn't work.
- Error: "has name 'expo-modules-core' which is the same as a project of the main build"
- Root cause: includeBuild approach is fundamentally wrong - we shouldn't include expo-modules-core as a build

### 2025-11-04 09:09 UTC - Implemented Fix (Attempt 5 - Failed)
**Action:** Add expo-modules-core maven repository instead of includeBuild
**Rationale:**
- The plugin needs to be available in pluginManagement's repositories, not as an includeBuild
- expo-modules-core has an android/maven directory that contains the plugin

**Result:** FAILED - The android/maven directory doesn't exist in expo-modules-core
- Error: Back to "Plugin [id: 'expo-module-gradle-plugin'] was not found"
- Root cause: The maven directory check failed, so no repository was added
- The plugin is part of expo-modules-core itself, not in a separate maven repo

### 2025-11-04 09:17 UTC - Analysis After 6 Failed Attempts
**Summary of Attempts:**
1. Hardcoded paths → Don't exist in pnpm monorepo
2. No patching → Plugin not found
3. Dynamic resolution with includeBuild → Naming conflict
4. includeBuild with dependencySubstitution → Still naming conflict
5. Maven repository approach → Directory doesn't exist

**Root Cause Analysis:**
- The expo-module-gradle-plugin is a Gradle plugin defined in expo-modules-core
- It needs to be available via includeBuild in pluginManagement
- Expo's autolinking already includes expo-modules-core as a project (not a build)
- This creates a naming conflict when we try to include it as a build in pluginManagement
- The fundamental issue: Can't have the same module as both a project and an included build

**Next Approach (Attempt 6):**
Instead of trying to include expo-modules-core in pluginManagement, let me check if we need to modify the generated settings.gradle AFTER Expo prebuild to remove the duplicate expo-modules-core project inclusion, or use a different build name for the pluginManagement includeBuild.

### 2025-11-04 09:21 UTC - Implemented Fix (Attempt 6)
**Action:** Use resolutionStrategy in pluginManagement instead of includeBuild
**Rationale:**
- Analyzed the BEFORE PATCH settings.gradle - it has NO pluginManagement block
- Expo's autolinking.gradle includes expo-modules-core as a project (not in settings.gradle)
- The conflict happens because we're trying to includeBuild something that's already a project
- Solution: Use resolutionStrategy.eachPlugin to resolve the expo-module-gradle-plugin
- This tells Gradle how to find the plugin without creating a duplicate inclusion

**Changes:**
- Removed all includeBuild and maven repository approaches
- Added pluginManagement with resolutionStrategy.eachPlugin
- When requested.id.id == 'expo-module-gradle-plugin', use useModule() to resolve it
- Still dynamically resolve expo-modules-core path for logging/debugging

**File Modified:** scripts/android-build.sh (lines 15-52)

**Next Steps:**
1. Commit and push the fix
2. Wait for CI to run
3. Verify android-e2e check passes

---

## Reference Files

### Web App Routes (for feature parity)
- `apps/web/src/app/` - Homepage and layout
- `apps/web/src/app/events/` - Event discovery
- `apps/web/src/app/events/[slug]/` - Event detail
- `apps/web/src/app/checkout/[bookingId]/` - Checkout flow
- `apps/web/src/app/bookings/` - Bookings list
- `apps/web/src/app/bookings/[bookingId]/` - Ticket detail
- `apps/web/src/app/profile/` - User profile
- `apps/web/src/app/profile/notifications/` - Notification preferences

### API Routers (for tRPC integration)
- `packages/api/src/routers/booking.ts` - Booking operations
- `packages/api/src/routers/events.ts` - Event discovery
- `packages/api/src/routers/waitlist.ts` - Waitlist management
- `packages/api/src/routers/promos.ts` - Promo code validation
- `packages/api/src/routers/auth.ts` - Authentication

### Current Mobile App
- `apps/mobile/app/` - All mobile screens
- `apps/mobile/lib/trpc.ts` - tRPC client setup
- `apps/mobile/contexts/AuthContext.tsx` - Auth state management

### Build Scripts
- `scripts/android-build.sh` - Android APK build script (needs fixing)
- `.github/workflows/mobile-e2e.yml` - Mobile E2E CI workflow

---

## Notes & Decisions

### Mock Authentication
The current implementation uses hardcoded mock values:
- Mock user ID: "mock-user-id"
- Mock token: "mock-token"
- Passwords are accepted but not validated

**Decision:** This will be replaced with real tRPC auth in Phase 2 after CI is fixed.

### QR Code Format
Currently uses `JSON.stringify(cachedTicket)` format. Need to verify this matches backend's expected QR code validation format.

### Offline Data Merging
Bookings list merges API data with cached tickets by filtering out cached tickets that exist in API response. Falls back to cache-only if API fails.

### ESLint Workaround
Added `/* eslint-disable no-unused-vars */` around AuthContextType interface due to ESLint flagging method parameter names as unused in TypeScript interface method signatures.

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All 9 CI checks passing (including android-e2e)
- [ ] Android APK builds successfully in CI
- [ ] Gradle plugin resolution issue resolved

### Phase 2 Complete When:
- [ ] All web app features implemented in mobile app
- [ ] Real authentication working (no mock)
- [ ] Payment flow integrated with Razorpay
- [ ] Push notifications configured
- [ ] Deep linking working
- [ ] Offline functionality tested
- [ ] Jest unit tests added

### Ready for Production When:
- [ ] All CI checks passing
- [ ] All features match web app maturity
- [ ] Tested on physical iOS and Android devices
- [ ] Security review complete
- [ ] Performance validated
- [ ] User acceptance testing complete
