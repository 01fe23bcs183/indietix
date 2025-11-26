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

## Pre-existing Gradle Issue (Separate from this fix)

After the notification icon fix, the CI logs show that expo prebuild now completes successfully. However, the subsequent Gradle build fails with a **pre-existing plugin resolution error**:

```
Plugin [id: 'expo-module-gradle-plugin'] was not found in any of the following sources
```

This is a **known, pre-existing issue** documented in the repo:
- The `android-e2e` workflow is configured with `continue-on-error: true` (non-blocking)
- The repo index notes: "Android E2E tests (marked non-blocking due to gradle plugin resolution issue)"

This Gradle issue is unrelated to the notification icon fix and requires a separate investigation into the Expo modules + pnpm monorepo + Gradle 8.3 integration.

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
| Identify root cause | Done |
| Implement fix | Done |
| Run local tests | Done |
| Create PR | Done |
| CI passes (blocking checks) | Done |
| Notification icon issue resolved | Done |

---

*Last Updated: 2025-11-26*
