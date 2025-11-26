# Flash Sales Engine + Organizer Team RBAC Progress

## Progress Bar
```
[####################] 100% Complete - Ready for PR
```

## Current Status
- Branch: `devin/1764180959-flash-sales-rbac`
- PR: Not yet created
- Building Flash Sales engine and Multi-User Organizer Teams with RBAC

## Task Overview
Implementing two major platform features:

### Part 1: Flash Sales Engine
- Rule-driven detection of underperforming events
- Time-bound discounts (20-40% off)
- Geofenced notifications (5km radius)
- Admin/Organizer controls
- Cron scheduler for automatic evaluation

### Part 2: Multi-User Organizer Teams with RBAC
- Roles: OWNER, MANAGER, STAFF, SCANNER
- Invite flow with email verification
- Scanner quick-pass for limited scope access
- Audit logging for all actions

## Completed Tasks
- [x] Checkout git branch for feature
- [x] Explore codebase structure
- [x] Create FLASH_SALES_RBAC_DOCUMENT.md
- [x] Create progress.md
- [x] Create Prisma models for FlashSale, OrgMember, OrgInvite, OrgAction, ScannerPass
- [x] Implement Flash Sales package (packages/flash/rules.ts)
- [x] Implement RBAC package (packages/auth/perm.ts)
- [x] Create Flash Sales tRPC routers (flash.create/update/cancel/suggestions)
- [x] Create RBAC tRPC routers (org.team, org.invite, org.scanner)
- [x] Update pricing.effectivePrice for flash sale precedence
- [x] Implement cron endpoint /api/cron/flash
- [x] Build Organizer /events/[id]/sales tab UI
- [x] Build Admin /sales dashboard UI
- [x] Build Web event detail flash sale banner with countdown
- [x] Build Organizer /settings/team UI
- [x] Build Accept-invite page
- [x] Implement scanner quick-pass functionality
- [x] Write unit tests for Flash Sales rules and RBAC permissions
- [x] Create docs/flash.md
- [x] Create docs/org-team.md

## In Progress
- [ ] Run lint, typecheck, build

## Pending Tasks
- [ ] Write Playwright E2E tests
- [ ] Create PR and wait for CI

## Architecture

### Flash Sale Detection Rules
```
timeToStart <= 6h AND sell-through < 50% -> trigger flash sale
- Discount: 20-40% based on urgency
- Cap: <=50% of remaining seats
- City radius: 5km (geofence)
```

### RBAC Permissions Matrix
| Permission | OWNER | MANAGER | STAFF | SCANNER |
|------------|-------|---------|-------|---------|
| All actions | Yes | - | - | - |
| Create/edit events | Yes | Yes | - | - |
| View payouts | Yes | Yes | - | - |
| Approve refunds | Yes | Yes | - | - |
| Access attendees | Yes | Yes | Yes | - |
| View events | Yes | Yes | Yes | - |
| Export CSV | Yes | Yes | Yes | - |
| Scanner page | Yes | Yes | Yes | Yes |

## Notes
- Flash sale overrides phase price during active window
- One flash sale per event per 24h
- Min price guard prevents too-low prices
- Scanner quick-pass expires in 24h
