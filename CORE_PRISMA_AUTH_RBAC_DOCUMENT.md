# [core] Prisma schema + NextAuth v5 + RBAC + seed + public tRPC (events, auth)

## Implementation Document

### Overview

This document tracks the implementation of the core data model and authentication system for IndieTix, including:

- Prisma schema with PostgreSQL (dev) and SQLite (test)
- NextAuth v5 with Credentials provider
- Role-based access control (RBAC)
- tRPC routers for auth and public events API
- Database seeding with demo data
- Comprehensive test coverage

### Database Configuration

**Supabase PostgreSQL (Development):**

- Host: db.kzthzbncfftjggfvuage.supabase.co
- Port: 5432
- Database: postgres
- User: postgres
- Password: Available via $Supa_pass environment variable

**SQLite (Testing):**

- Path: file:./tmp/test.db
- Used by Vitest and Playwright tests

### Implementation Log

#### 2025-11-01 10:42:51 UTC

- Created progress.md and PR documentation files
- Viewed database credentials from attachment
- Starting repository structure examination

---

## Tasks Breakdown

### 1. Prisma Schema (packages/db)

- [ ] Create schema.prisma with models: User, Session, Organizer, Event, Booking, Payout
- [ ] Define enums: Role, Category, EventStatus, PaymentStatus, BookingStatus
- [ ] Add indexes to models
- [ ] Add database scripts to root package.json
- [ ] Configure for PostgreSQL (dev) and SQLite (test)

### 2. NextAuth v5 (packages/api)

- [ ] Implement auth module with Credentials provider
- [ ] Use bcrypt with 10 rounds for password hashing
- [ ] Configure JWT session strategy
- [ ] Add callbacks to attach role to session
- [ ] Wire web app routes: /auth/signin, /auth/signup, /api/auth/\*

### 3. tRPC Procedures

- [ ] auth.signup(input) -> userId
- [ ] auth.signin(input) -> { ok: true }
- [ ] auth.me() -> { id, email, role }
- [ ] events.list with filters
- [ ] events.getBySlug(slug)

### 4. RBAC Middleware

- [ ] Implement middleware.ts for web/organizer/admin
- [ ] Enforce role-based access
- [ ] Redirect to /auth/signin (HTTP 302) if unauthorized

### 5. Database Seeding

- [ ] Create seed.ts with 1 ADMIN, 2 ORGANIZER users
- [ ] Create ~8 events across Bengaluru, Mumbai, Delhi
- [ ] Create 5 sample COMPLETED bookings
- [ ] Add db:seed script

### 6. Tests

- [ ] Unit tests for bcrypt hash/verify
- [ ] Unit tests for RBAC helper
- [ ] E2E test for auth flow (signup, signin, me)
- [ ] Test setup file for SQLite

### 7. Documentation

- [ ] Update README.md with database instructions
- [ ] Create docs/auth.md with flow diagrams and RBAC table

### 8. Local Checks

- [ ] pnpm install
- [ ] pnpm -w build
- [ ] pnpm -w test
- [ ] npx playwright test
- [ ] Test seed script

### 9. PR Creation

- [ ] Create git branch
- [ ] Commit and push changes
- [ ] Open PR
- [ ] Wait for CI checks

---

## Notes

- Using strict TypeScript (no `any`)
- Minimal UI (functional forms and guards only)
- No real network or Supabase in CI tests (SQLite only)
- All tests must pass locally before PR creation
