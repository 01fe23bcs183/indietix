# Fraud Rules Engine + Risk Scoring + Blacklists + Review Queue - Implementation Document

## Overview
This document tracks the implementation of a comprehensive fraud/risk layer for IndieTix, including a declarative rules engine, risk scoring system, blacklists/allowlists, and manual review queue.

## Objectives
1. **Capture booking attempts & signals** - Track all booking attempts with relevant fraud signals (IP, user agent, email domain, phone prefix, etc.)
2. **Rules engine (declarative)** - Database-driven rules with conditions for velocity checks, blacklists, thresholds
3. **Blacklists & allowlists** - Manage EMAIL/PHONE/IP entries with admin UI and CSV import
4. **Actions & state** - REJECT, REVIEW, FLAG actions based on risk scoring
5. **Admin UI** - Dashboard, rules management, blacklist management, review queue
6. **Provider signals** - Extend Razorpay webhook to track failed payment attempts

## Implementation Log

### 2025-11-03 09:45 UTC - Project Initialization
- Pulled latest codebase from origin/main (commit: 0f0503e)
- Created progress.md and this documentation file
- Preparing to create comprehensive todo list

### Database Schema Design
**Models to Create:**
- `BookingAttempt` - Tracks all booking attempts with signals
- `FraudRule` - Stores declarative fraud detection rules
- `FraudList` - Blacklists/allowlists for EMAIL/PHONE/IP
- `FraudCase` - Manual review queue entries
- Extend `Booking` model with `riskScore` and `riskTags`

### Fraud Engine Package
**Location:** `packages/fraud/`
**Core Function:** `evaluate(bookingAttempt, context)` returns risk score, matched rules, and action

### API Integration Points
1. `booking.start` - Create BookingAttempt, run fraud engine, handle REJECT/REVIEW/FLAG
2. Razorpay webhook - Track failed payment attempts for velocity rules
3. Admin endpoints - CRUD for rules, lists, and case resolution

### Admin UI Routes
- `/admin/fraud` - Dashboard with risk distribution, top IPs, rules statistics
- `/admin/fraud/rules` - Rules management table
- `/admin/fraud/blacklists` - Blacklist/allowlist management with CSV import
- `/admin/fraud/review` - Review queue for OPEN cases

## Technical Decisions
- Rules stored in database for runtime editability
- JSON definition format for flexible rule conditions
- Idempotent engine design (safe to re-run)
- No reliance on card PAN (metadata-based detection)
- Weighted risk scoring (0-100 scale)

## Testing Strategy
- Unit tests for rules evaluation, velocity checks, blacklist matching
- Unit tests for risk scoring weights and idempotency
- Playwright tests for admin UI flows (toggle rule, simulate REJECT, review case approval)

## Documentation
- `docs/fraud.md` - Comprehensive guide covering scope, engine, examples, tuning weights, safe defaults

## Local DoD Checklist
- [ ] `pnpm -w typecheck` passes
- [ ] `pnpm -w test` passes
- [ ] `pnpm -w build` passes
- [ ] `npx playwright test` passes (admin flows green)

## Next Steps
1. Create comprehensive todo list
2. Examine existing Prisma schema
3. Design fraud models
4. Implement fraud engine package
5. Integrate with booking flow
6. Build admin UI
7. Write tests
8. Create documentation
9. Run local checks
10. Create PR
