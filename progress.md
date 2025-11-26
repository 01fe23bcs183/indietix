# PR #129 CI Fix Progress

## Progress Bar
```
[##################] 90% Complete - Pushing fixes
```

## Current Status
- Branch: `devin/1764146639-search-nl-filters-fts-trgm-embeddings`
- PR: https://github.com/01fe23bcs183/indietix/pull/129
- Fixing CI failures and pushing changes

## CI Check Status
| Check | Status |
|-------|--------|
| Lint & Type Check | PASS |
| Unit Tests | PASS |
| Code Coverage | PASS |
| SonarCloud Analysis | PASS |
| Secret Scanning | PASS |
| GitGuardian | PASS |
| Auto Label PR | PASS |
| lint-typecheck-test-build (E2E) | FIXING |
| android-e2e | FIXING |

## Completed Tasks
- [x] Analyze previous Devin session to understand what was tried
- [x] Clone repo and checkout PR branch
- [x] Review CI logs to identify exact failures
- [x] Create documentation files
- [x] Fix E2E test failures - update seed data with future-dated COMEDY events
- [x] Fix Android E2E failure - downgrade expo-calendar to SDK 50 compatible version (~12.0.0)
- [x] Run pnpm install to update lockfile
- [x] Run local build and unit tests - All passing

## In Progress
- [ ] Push changes to PR #129
- [ ] Wait for CI to complete

## Fixes Applied
### E2E Test Failures
- Updated COMEDY event dates in seed.ts to be in the future:
  - "Stand-Up Comedy Night with Zakir Khan": 2025-11-20 → 2026-01-20
  - "Biswa Kalyan Rath Live in Mumbai": 2025-05-20 → 2026-02-20
- Fixed category filter in search router:
  - Changed from `{ equals: filters.category, mode: "insensitive" }` to direct equality
  - `mode: "insensitive"` doesn't work with Prisma enums, only strings

### Android E2E Failure
- Downgraded expo-calendar from ^15.0.7 to ~12.0.0 (SDK 50 compatible)
- This resolves the expo-module-gradle-plugin not found error

## Notes
- Using PostgreSQL FTS with tsvector for full-text search
- Using pg_trgm for fuzzy matching
- Optional pgvector for 384-dimensional MiniLM embeddings
- Environment variable SEARCH_EMBEDDINGS_PROVIDER controls embedding mode
