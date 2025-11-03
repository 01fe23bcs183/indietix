# Testing Documentation

## Overview

IndieTix uses a comprehensive testing strategy across the monorepo:

- **Vitest**: Unit and integration tests for web/admin apps and packages
- **Jest**: Unit tests for React Native mobile app
- **Playwright**: E2E tests for web application
- **Maestro**: E2E tests for Android mobile app (CI-only)

## Test Structure

### Unit/Integration Tests (Vitest)

**Scope**: `apps/web`, `apps/admin`, `apps/organizer`, `packages/*`

**Configuration**:

- Root config: `vitest.config.ts`
- Per-app config: `apps/*/vitest.config.ts`
- Setup file: `vitest.setup.ts` (imports `@testing-library/jest-dom`)

**Environment**: jsdom (for React component testing)

**Commands**:

```bash
# Run all Vitest tests
pnpm -w test

# Run tests for specific app
pnpm --filter @indietix/web test

# Run tests for specific package
pnpm --filter @indietix/utils test

# Watch mode (local development)
pnpm --filter @indietix/web test:watch
```

**Example test locations**:

- `apps/web/src/__tests__/home.spec.tsx`
- `packages/utils/src/__tests__/format.spec.ts`

### Mobile Unit Tests (Jest)

**Scope**: `apps/mobile`

**Configuration**:

- Config: `apps/mobile/jest.config.js`
- Setup: `apps/mobile/jest.setup.js`
- Preset: `jest-expo`

**Environment**: React Native testing environment

**Commands**:

```bash
# Run mobile tests
pnpm --filter @indietix/mobile test

# Watch mode
pnpm --filter @indietix/mobile test -- --watch
```

**Example test locations**:

- `apps/mobile/src/__tests__/App.test.tsx`

### Web E2E Tests (Playwright)

**Scope**: `apps/web`

**Configuration**: `apps/web/playwright.config.ts`

**Commands**:

```bash
# Install Playwright browsers (first time only)
cd apps/web
pnpm exec playwright install --with-deps

# Run E2E tests
pnpm test:e2e

# Run with UI mode (local development)
pnpm exec playwright test --ui

# Run specific test
pnpm exec playwright test home.spec.ts
```

**Test location**: `apps/web/e2e/`

**Notes**:

- Playwright builds the Next.js app and runs `next start` before tests
- Tests run against `http://localhost:3000`
- CI runs tests in headless mode with retries

### Mobile E2E Tests (Maestro)

**Scope**: `apps/mobile` (Android only)

**Configuration**: `.maestro/smoke.yml`

**Environment**: CI-only (requires Android emulator)

**Commands** (CI only):

```bash
# Build Android APK
bash scripts/android-build.sh

# Run Maestro tests (requires emulator)
maestro test .maestro/smoke.yml -a apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Notes**:

- Mobile E2E tests run only in CI on Android emulator
- Tests are marked as `continue-on-error: true` to prevent blocking PRs
- APK is built using Expo prebuild + Gradle

## CI Workflows

### Main CI Pipeline (`.github/workflows/ci.yml`)

Runs on every PR and push to `main`:

1. **Install**: `pnpm install --frozen-lockfile`
2. **Setup Prisma**: Generate Prisma client
3. **Lint**: `pnpm -w lint`
4. **Typecheck**: `pnpm -w typecheck`
5. **Unit Tests**: `pnpm -w test` (Vitest + Jest)
6. **Build Packages**: Build all packages
7. **Build Apps**: Build web, organizer, admin apps
8. **E2E Tests**: Install Playwright and run web E2E tests

### Mobile E2E Pipeline (`.github/workflows/mobile-e2e.yml`)

Runs on every PR and push to `main` (optional):

1. **Install**: Dependencies and Android SDK
2. **Build APK**: Run `scripts/android-build.sh`
3. **Install Maestro**: Install Maestro CLI
4. **Run Tests**: Start Android emulator and run Maestro tests
5. **Upload APK**: Save APK as artifact

**Note**: This workflow is marked as `continue-on-error: true` to prevent blocking PRs if the emulator fails.

## Local Development

### Running All Tests

```bash
# Install dependencies
pnpm install

# Run all unit tests (Vitest + Jest)
pnpm -w test

# Run typecheck
pnpm -w typecheck

# Run lint
pnpm -w lint

# Build all packages and apps
pnpm -w build
```

### Running E2E Tests Locally

**Web (Playwright)**:

```bash
cd apps/web

# Install browsers (first time)
pnpm exec playwright install --with-deps

# Run tests
pnpm test:e2e

# Debug mode
pnpm exec playwright test --debug
```

**Mobile (Maestro)**: Not recommended locally. Use CI workflow instead.

## Writing Tests

### Vitest (Web/Packages)

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Jest (Mobile)

```typescript
import { render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<View><Text>Hello</Text></View>);
    expect(screen.getByText("Hello")).toBeTruthy();
  });
});
```

### Playwright (Web E2E)

```typescript
import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Welcome")).toBeVisible();
});
```

### Maestro (Mobile E2E)

```yaml
appId: com.indietix.mobile
---
- launchApp
- assertVisible: "Welcome"
- tapOn: "Get Started"
- assertVisible: "Home"
```

## Troubleshooting

### Vitest tests failing

- Ensure `jsdom` is installed: `pnpm add -D jsdom`
- Check that `vitest.setup.ts` imports `@testing-library/jest-dom`
- Verify environment is set to `jsdom` in config

### Jest tests failing

- Ensure `jest-expo` preset is configured
- Check that React Native modules are in `transformIgnorePatterns`
- Verify setup file is loaded in `setupFilesAfterEnv`

### Playwright tests failing

- Ensure browsers are installed: `pnpm exec playwright install --with-deps`
- Check that the app builds successfully: `pnpm run build`
- Verify port 3000 is not in use

### Mobile E2E tests failing

- Check that APK builds successfully: `bash scripts/android-build.sh`
- Verify Android SDK and Java 17 are installed
- Ensure emulator has enough resources (CI only)

## Best Practices

1. **Keep tests fast**: Unit tests should run in milliseconds
2. **Use data-testid**: For reliable element selection in E2E tests
3. **Mock external dependencies**: Don't hit real APIs in tests
4. **Test user behavior**: Focus on what users do, not implementation
5. **Run tests before PR**: Ensure all tests pass locally before pushing

## Coverage

To generate coverage reports:

```bash
# Vitest coverage
pnpm --filter @indietix/web test -- --coverage

# Jest coverage
pnpm --filter @indietix/mobile test -- --coverage
```

Coverage reports are generated in `coverage/` directories.
