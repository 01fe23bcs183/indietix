# CI Fix Documentation for PR #129

## Overview
This document tracks the work done to fix CI failures for PR #129, which implements NL search with FTS/trgm and optional embeddings re-ranking.

## Problem Statement
PR #129 has 2 failing CI checks:
1. **lint-typecheck-test-build** - Playwright E2E tests timing out
2. **android-e2e** - Gradle plugin resolution error

## Root Cause Analysis

### E2E Test Failures
The E2E tests are failing because:
1. The search functionality with NL parsing extracts category filters (e.g., "MUSIC", "COMEDY")
2. When no events match the extracted category, no results are displayed
3. The tests expect to see event cards or result counts, but get empty results

**Affected Tests:**
- `events.spec.ts:49` - "should filter events by category" expects event cards after filtering
- `search.spec.ts:31` - "should show results when searching" expects "X events found" text
- `search.spec.ts:114` - "should show empty state when no results" expects "no events found" message

### Android E2E Failure
The Android build fails because:
- `expo-calendar@15.0.7` requires `expo-module-gradle-plugin`
- The plugin is not registered by expo-modules-autolinking in pnpm monorepo
- This is a version compatibility issue with `expo-modules-core@1.11.14`

## Solution Approach

### E2E Tests Fix
Option 1: Update the events page to show a proper "0 events found" or "No events found" message when search returns empty results
Option 2: Update E2E tests to search for terms that match existing seeded data
Option 3: Update the search router to return all events when category filter doesn't match

### Android E2E Fix
Option 1: Remove expo-calendar dependency if not needed
Option 2: Update expo-calendar to a compatible version
Option 3: Configure the workflow to skip this check (continue-on-error)

## Implementation Details
(To be updated as fixes are implemented)

## Testing
(To be updated with test results)

## References
- Previous Devin session: https://app.devin.ai/sessions/1f8ae94fdae54846b8f50cc81db3f40a
- PR: https://github.com/01fe23bcs183/indietix/pull/129
