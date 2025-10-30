# [setup] Turborepo foundation + CI - Implementation Document

## Overview

This document tracks the implementation of a production-grade Turborepo monorepo for the IndieTix all-India ticketing platform.

## Objective

Initialize a complete TypeScript monorepo with:

- 4 apps (web, organizer, admin, mobile)
- 5 packages (ui, api, db, utils, config)
- Full CI/CD pipeline with GitHub Actions
- Development tooling (ESLint, Prettier, Husky, lint-staged)
- All checks passing (typecheck, lint, test, build)

## Architecture Decisions

### Monorepo Structure

- **Tool**: Turborepo for build orchestration
- **Package Manager**: pnpm with workspaces
- **TypeScript**: Strict mode enabled across all packages

### Apps

1. **apps/web**: Next.js 14 App Router for customer-facing platform
2. **apps/organizer**: Next.js PWA for event organizers
3. **apps/admin**: Next.js admin panel
4. **apps/mobile**: Expo React Native for iOS/Android

### Packages

1. **packages/ui**: shadcn/ui components with Tailwind CSS
2. **packages/api**: tRPC routers for type-safe APIs
3. **packages/db**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
4. **packages/utils**: Shared utility functions
5. **packages/config**: Shared ESLint, Prettier, TypeScript configs

## Implementation Log

### Phase 1: Repository Setup ✅

- Created git branch: `devin/1761845621-turborepo-foundation`
- Initialized root package.json with pnpm workspaces
- Created pnpm-workspace.yaml for workspace configuration
- Set up turbo.json with build pipeline configuration
- Created tsconfig.base.json with strict TypeScript settings

### Phase 2: Shared Packages ✅

- **packages/config**: Created shared ESLint, Prettier, and TypeScript configurations
- **packages/utils**: Implemented utility functions (formatCurrency, slugify, truncate) with unit tests
- **packages/db**: Set up Prisma with SQLite and placeholder HealthCheck model
- **packages/api**: Created tRPC router with example health.ping endpoint
- **packages/ui**: Built shadcn/ui Button component with Tailwind CSS

### Phase 3: Applications ✅

- **apps/web**:
  - Next.js 14 App Router setup
  - Health API route at `/api/health`
  - tRPC integration with React Query
  - Playwright e2e tests
  - Homepage with "IndieTix Web OK"
- **apps/organizer**:
  - Next.js with PWA support (next-pwa)
  - PWA manifest.json configured
  - Homepage with "Organizer OK"
  - Runs on port 3001
- **apps/admin**:
  - Next.js admin panel
  - Homepage with "Admin OK"
  - Runs on port 3002
- **apps/mobile**:
  - Expo React Native with TypeScript
  - Expo Router for navigation
  - Basic homepage component

### Phase 4: Development Tooling ✅

- **Husky**: Pre-commit hooks configured
- **lint-staged**: Runs ESLint and Prettier on staged files
- **Prettier**: Code formatting with consistent style
- **.prettierrc**: Configured with project standards
- **.prettierignore**: Excludes build artifacts

### Phase 5: CI/CD Pipeline ✅

- Created `.github/workflows/ci.yml`
- CI runs on all PRs to main branch
- Steps: install → lint → typecheck → test → build → e2e
- Playwright tests run only for apps/web
- Mobile app build skipped in CI (as specified)

### Phase 6: Documentation ✅

- Updated README.md with complete project structure
- Added getting started instructions
- Documented all apps and packages
- Included development commands
- Added CI/CD workflow description

### Phase 7: Dependency Installation & Setup ✅

- Ran `pnpm install` - 1467 packages installed
- Set up Prisma: generated client successfully
- Configured DATABASE_URL in packages/db/.env

### Phase 8: TypeScript Configuration Fixes ✅

**Issue**: Packages weren't generating dist output files
**Root Cause**: Base tsconfig.json had `noEmit: true`
**Solution**: Added `noEmit: false` to all package tsconfig.json files

Fixed files:

- packages/ui/tsconfig.json
- packages/utils/tsconfig.json
- packages/db/tsconfig.json
- packages/api/tsconfig.json

**Result**: All packages now build successfully with dist/ output

### Phase 9: TypeScript Type Checking ✅

**Issue**: Mobile app test file had Jest type errors
**Solution**: Added `@types/jest` to mobile app devDependencies and configured tsconfig.json

**Result**: `pnpm -w typecheck` passes for all 8 packages ✅

### Phase 10: ESLint Configuration (In Progress) 🔄

**Issue**: Packages missing ESLint configuration files
**Current Status**: Created .eslintrc.json files but encountering flat config format error

**Problem**: ESLint 8 doesn't support the flat config format (eslint.config.js) when referenced from .eslintrc.json

**Next Steps**:

1. Convert packages/config/eslint.config.js to legacy .eslintrc.js format
2. Update package .eslintrc.json files to extend the legacy config
3. Re-run `pnpm -w lint` to verify all packages pass

## Technical Challenges & Solutions

### Challenge 1: pnpm Workspaces Configuration

- **Issue**: pnpm warned about workspaces field in package.json
- **Solution**: Created pnpm-workspace.yaml file

### Challenge 2: TypeScript Build Output

- **Issue**: Packages weren't generating dist/ directories
- **Solution**: Override `noEmit: false` in package tsconfig files

### Challenge 3: Module Resolution

- **Issue**: Apps couldn't find @indietix/ui module
- **Solution**: Build packages first, add proper exports in package.json

### Challenge 4: Jest Types in Mobile App

- **Issue**: TypeScript couldn't find Jest global types
- **Solution**: Add @types/jest and configure types in tsconfig.json

### Challenge 5: ESLint Configuration Format (Current)

- **Issue**: ESLint 8 flat config not compatible with .eslintrc.json extends
- **Solution**: Converting to legacy .eslintrc.js format

## Files Created

### Root Configuration

- package.json
- pnpm-workspace.yaml
- turbo.json
- tsconfig.base.json
- .prettierrc
- .prettierignore
- .lintstagedrc.js
- .env.example
- .husky/pre-commit

### Packages (5 total)

- packages/config/\* (eslint, prettier, tsconfig)
- packages/utils/\* (utilities + tests)
- packages/db/\* (Prisma schema + client)
- packages/api/\* (tRPC routers + tests)
- packages/ui/\* (React components + Tailwind)

### Apps (4 total)

- apps/web/\* (Next.js customer app + Playwright tests)
- apps/organizer/\* (Next.js PWA)
- apps/admin/\* (Next.js admin panel)
- apps/mobile/\* (Expo React Native)

### CI/CD

- .github/workflows/ci.yml

### Documentation

- README.md (updated)
- progress.md (this session)
- setup_Turborepo_foundation_CI_DOCUMENT.md (this file)

## Verification Status

| Check             | Status         | Notes                         |
| ----------------- | -------------- | ----------------------------- |
| pnpm install      | ✅ PASS        | 1467 packages installed       |
| Prisma generate   | ✅ PASS        | Client generated successfully |
| pnpm -w typecheck | ✅ PASS        | All 8 packages pass           |
| pnpm -w lint      | 🔄 IN PROGRESS | Fixing ESLint config          |
| pnpm -w test      | ⏳ PENDING     | After lint passes             |
| pnpm -w build     | ⏳ PENDING     | After tests pass              |
| Playwright e2e    | ⏳ PENDING     | After build passes            |

## Next Steps

1. Fix ESLint configuration for all packages
2. Run and verify lint passes
3. Run and verify all tests pass
4. Build all apps and verify success
5. Commit all changes
6. Create PR: "[setup] Turborepo foundation + CI"
7. Wait for CI checks to pass
8. Report completion to user

## Timeline

- **Started**: 2025-10-30 17:30 UTC
- **Current Time**: 2025-10-30 17:48 UTC
- **Estimated Completion**: 2025-10-30 18:00 UTC

---

Last updated: 2025-10-30 17:48 UTC

## Phase 11: ESLint Configuration Complete ✅

**Issue**: ESLint configuration format incompatibility
**Solution**:

- Created packages/config/.eslintrc.js in legacy format
- Updated all package .eslintrc.json files to extend legacy config
- Added root .eslintrc.json for lint-staged
- Added .eslintignore to exclude generated files

**Result**: `pnpm -w lint` passes for all packages ✅

## Phase 12: All Local Checks Passing ✅

All verification checks passed successfully:

| Check      | Status  | Details                                             |
| ---------- | ------- | --------------------------------------------------- |
| TypeScript | ✅ PASS | All packages compile without errors                 |
| Linting    | ✅ PASS | All packages pass ESLint checks                     |
| Unit Tests | ✅ PASS | 7 test suites, 7 tests passing                      |
| Build      | ✅ PASS | All apps build successfully (web, organizer, admin) |

## Phase 13: PR Creation and CI Fix 🔄

### PR Created

- **PR #1:** [setup] Turborepo foundation + CI
- **URL:** https://github.com/01fe23bcs183/indietix/pull/1
- **Branch:** devin/1761845621-turborepo-foundation → main
- **Commit:** 5fcf839

### CI Issue Identified

Initial CI run failed due to deprecated GitHub Actions:

- **Error:** `actions/upload-artifact@v3` is deprecated (GitHub enforced deprecation)
- **Error:** `actions/cache@v3` should be upgraded to v4

### Fix Applied

Updated `.github/workflows/ci.yml`:

- Line 35: Upgraded `actions/cache@v3` → `actions/cache@v4`
- Line 79: Upgraded `actions/upload-artifact@v3` → `actions/upload-artifact@v4`

### Next Steps

- Commit the workflow fix along with progress tracking files
- Push to PR branch
- Wait for CI checks to pass

---

**Document Status:** In Progress - Fixing CI
**Last Updated:** 2025-10-30 18:04 UTC
