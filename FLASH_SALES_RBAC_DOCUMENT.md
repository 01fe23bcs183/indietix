# Flash Sales Engine + Organizer Team RBAC - Implementation Document

## Overview

This document tracks the implementation of two major platform features:
1. **Flash Sales Engine** - Rule-driven detection of underperforming events with time-bound discounts and geofenced notifications
2. **Multi-User Organizer Teams with RBAC** - Role-based permissions for organizer teams with audit logging

## Part 1: Flash Sales Engine

### Goals
- Detection rules for underperforming events (sell-through, timeToStart, velocity)
- Time-bound discounts (20-40% off) with capped inventory
- Geofenced notifications (5km radius from venue)
- Admin/Organizer controls for managing flash sales
- Cron scheduler for automatic evaluation and notification

### Data Model
```prisma
enum FlashSaleStatus {
  PENDING
  ACTIVE
  ENDED
  CANCELLED
}

model FlashSale {
  id              String          @id @default(cuid())
  eventId         String
  discountPercent Int             // 20-40%
  startsAt        DateTime
  endsAt          DateTime
  maxSeats        Int             // Cap: <=50% of remaining seats
  soldSeats       Int             @default(0)
  status          FlashSaleStatus @default(PENDING)
  minFlashPrice   Int?            // Guard against too-low prices
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  event           Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@index([eventId, startsAt])
  @@index([status])
}
```

### Detection Rules (Default)
- `timeToStart <= 6h` AND `sell-through < 50%` triggers flash sale
- Discount: 20-40% off based on urgency
- Cap: <=50% of remaining seats
- City radius: 5km from venue (geofence)

### Safety & Fairness
- One flash sale per event per 24h
- Min price guard (`minFlashPrice`)
- Respect waitlist (trigger after serving waitlist if policy requires)

## Part 2: Multi-User Organizer Teams with RBAC

### Goals
- Role-based permissions (OWNER, MANAGER, STAFF, SCANNER)
- Invite flow with email verification
- Scanner quick-pass for limited scope access
- Audit logging for all actions

### Data Model
```prisma
enum OrgRole {
  OWNER
  MANAGER
  STAFF
  SCANNER
}

enum OrgInviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
}

model OrgMember {
  id          String   @id @default(cuid())
  organizerId String
  userId      String
  role        OrgRole
  invitedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  organizer   Organizer @relation(fields: [organizerId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([organizerId, userId])
  @@index([organizerId])
  @@index([userId])
}

model OrgInvite {
  id          String          @id @default(cuid())
  organizerId String
  email       String
  role        OrgRole
  token       String          @unique
  status      OrgInviteStatus @default(PENDING)
  expiresAt   DateTime
  createdAt   DateTime        @default(now())
  
  organizer   Organizer       @relation(fields: [organizerId], references: [id], onDelete: Cascade)
  
  @@index([organizerId])
  @@index([email])
  @@index([token])
}

model OrgAction {
  id          String   @id @default(cuid())
  organizerId String
  actorUserId String
  action      String
  entityType  String
  entityId    String?
  prev        Json?
  next        Json?
  ts          DateTime @default(now())
  
  organizer   Organizer @relation(fields: [organizerId], references: [id], onDelete: Cascade)
  
  @@index([organizerId])
  @@index([actorUserId])
  @@index([ts])
}
```

### Permissions Matrix
| Permission | OWNER | MANAGER | STAFF | SCANNER |
|------------|-------|---------|-------|---------|
| All organizer actions | Yes | - | - | - |
| Create/edit events | Yes | Yes | - | - |
| View payouts | Yes | Yes | - | - |
| Approve refunds | Yes | Yes | - | - |
| Access attendees | Yes | Yes | Yes | - |
| View events | Yes | Yes | Yes | - |
| Export CSV | Yes | Yes | Yes | - |
| Edit pricing/payouts | Yes | - | - | - |
| Scanner page only | Yes | Yes | Yes | Yes |

## Implementation Progress

### Phase 1: Database Schema
- [ ] Add FlashSale model to Prisma schema
- [ ] Add OrgMember, OrgInvite, OrgAction models
- [ ] Add relations to existing models
- [ ] Generate migration

### Phase 2: Core Packages
- [ ] Create packages/flash with rules engine
- [ ] Create packages/auth/perm.ts with RBAC logic

### Phase 3: API Layer
- [ ] Flash Sales tRPC routers
- [ ] RBAC tRPC routers
- [ ] Update pricing router for flash sale precedence

### Phase 4: UI Components
- [ ] Organizer flash sales tab
- [ ] Admin flash sales dashboard
- [ ] Web event detail flash banner
- [ ] Organizer team settings page
- [ ] Invite acceptance page

### Phase 5: Testing
- [ ] Unit tests for flash rules
- [ ] Unit tests for RBAC permissions
- [ ] Playwright E2E tests

### Phase 6: Documentation
- [ ] docs/flash.md
- [ ] docs/org-team.md

## Changelog

### 2025-11-26
- Initial document created
- Explored codebase structure
- Created feature branch: devin/1764180959-flash-sales-rbac
