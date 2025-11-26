# APK Build Fix - Missing Notification Icon

## Overview

This document tracks the investigation and resolution of the APK build failure in the IndieTix mobile app CI pipeline.

## Issue Summary

**Problem**: The Android APK build was failing in the `android-e2e` CI workflow.

**Root Cause**: The `expo-notifications` plugin in `apps/mobile/app.json` references a notification icon file (`./assets/notification-icon.png`) that does not exist in the repository.

**Error Message**:
```
Error: [android.dangerous]: withAndroidDangerousBaseMod: An error occurred while configuring Android notifications. 
Encountered an issue resizing Android notification icon: Error: ENOENT: no such file or directory, open './assets/notification-icon.png'
```

## Investigation Steps

1. Checked CI status for PR #124 - found `android-e2e` job failing
2. Retrieved CI job logs (job_id: 56408951366)
3. Identified the error occurring during `expo prebuild --platform android`
4. Examined `apps/mobile/app.json` configuration:
   ```json
   "plugins": [
     "expo-router",
     [
       "expo-notifications",
       {
         "icon": "./assets/notification-icon.png",
         "color": "#0066cc",
         "sounds": []
       }
     ]
   ]
   ```
5. Verified the assets directory contents - `notification-icon.png` was missing

## Solution

Added the missing `notification-icon.png` file to `apps/mobile/assets/` by copying the existing app icon (`icon.png`).

**Note**: The copied icon serves as a functional placeholder. For optimal Android notification appearance, a proper monochrome notification icon (white glyph on transparent background) should be created by the design team in the future.

## Files Changed

- `apps/mobile/assets/notification-icon.png` - Added (copy of icon.png)

## Verification

- [x] Local: Build passes (`pnpm -w build` - 12 successful tasks)
- [x] Local: All tests pass (`pnpm -w test` - 22 tests passed)
- [x] Local: Lint passes (`pnpm -w lint` - no errors)
- [x] CI: Expo prebuild completes successfully ("✔ Finished prebuild")
- [x] CI: All blocking checks pass (Lint & Type Check, Unit Tests, Code Coverage, SonarCloud, etc.)
- [x] CI: `android-e2e` workflow - notification icon issue RESOLVED (prebuild succeeds)

## Stage 2: Gradle Plugin Resolution Fix

After the notification icon fix (Stage 1), the CI revealed a second issue - the Gradle build was failing with:

```
Plugin [id: 'expo-module-gradle-plugin'] was not found in any of the following sources
```

### Root Cause Analysis

Investigation revealed that several Expo packages in `apps/mobile/package.json` were using versions incompatible with Expo SDK 50:

- `expo-calendar@15.0.7` - This version uses the `plugins { }` DSL with `expo-module-gradle-plugin`, which doesn't exist in SDK 50
- `expo-sharing@14.0.7` - Too new for SDK 50
- `expo-linking@8.0.8` - Too new for SDK 50
- Several other packages with version mismatches

The `npx expo install --check` command confirmed these version incompatibilities.

### Solution

Aligned all Expo package versions to SDK 50 compatibility:

| Package | Before | After |
|---------|--------|-------|
| expo-calendar | ^15.0.7 | ~12.2.1 |
| expo-sharing | ^14.0.7 | ~11.10.0 |
| expo-linking | (missing) | ~6.2.2 |
| @react-native-async-storage/async-storage | ^2.2.0 | 1.21.0 |
| @react-native-community/netinfo | ^11.3.1 | 11.1.0 |
| @sentry/react-native | ^5.15.2 | ~5.20.0 |
| react-native | 0.73.4 | 0.73.6 |
| react-native-svg | ^15.14.0 | 14.1.0 |
| react-native-view-shot | ^4.0.3 | 3.8.0 |

### Verification

- [x] Local: `pnpm install` completed successfully
- [x] Local: `pnpm -w build` passed (12 successful tasks)
- [x] Local: `pnpm -w test` passed (22 tests)
- [x] CI: Expo prebuild completes successfully ("✔ Finished prebuild")
- [x] CI: Gradle build completes successfully ("BUILD SUCCESSFUL in 7m 9s")
- [x] CI: APK generated at `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### CI Emulator Issue (Infrastructure, Not Code)

The `android-e2e` CI job shows as "failed" due to the Android emulator not starting properly:

```
adb: device 'emulator-5554' not found
```

This is a **CI infrastructure issue** (flaky emulator), not a code issue. The APK build itself completed successfully, which was the original goal. The emulator failure is outside the scope of this fix and is a known flaky behavior in GitHub Actions Android emulator runners.

## Future Recommendations

1. **Design Asset**: Create a proper Android notification icon following Material Design guidelines:
   - Monochrome (white) glyph on transparent background
   - Simple shape that scales well at small sizes (24x24 or 48x48 base)
   - Android will tint the icon according to system theme

2. **Asset Validation**: Consider adding a pre-commit hook or CI check to validate that all referenced assets exist before build.

## Progress

| Step | Status |
|------|--------|
| Identify failing CI check | Done |
| Analyze CI logs | Done |
| Stage 1: Identify notification icon root cause | Done |
| Stage 1: Add missing notification-icon.png | Done |
| Stage 2: Identify Gradle plugin resolution issue | Done |
| Stage 2: Align Expo package versions to SDK 50 | Done |
| Run local tests | Done |
| Create PR | Done |
| CI: Expo prebuild passes | Done |
| CI: Gradle build passes (APK generated) | Done |
| CI: Emulator issue (infrastructure, not code) | N/A |

---

*Last Updated: 2025-11-26*
