# Refund Approval System Implementation Document

## Overview

This document tracks the implementation of a refund approval workflow that requires both organizer and admin approval before processing refunds. The current system automatically processes refunds without approval in the `requestCancellation` procedure.

## Tasks

### 1. Database Schema Updates (`packages/db/prisma/schema.prisma`)

**Status**: Pending

Changes to the `Refund` model:
- Add `requestedBy` field to track who initiated the refund
- Add `organizerApprovedAt` timestamp for organizer approval
- Add `adminApprovedAt` timestamp for admin approval
- Add `organizerId` field to link to the event organizer

Changes to the `RefundStatus` enum:
- Add `PENDING_APPROVAL` status

### 2. Booking Router Modifications (`packages/api/src/routers/booking.ts`)

**Status**: Pending

Changes to `requestCancellation` procedure:
- Create refunds with `PENDING_APPROVAL` status instead of automatically processing
- Remove automatic payment provider refund processing
- Keep existing refund calculation logic from `@indietix/utils`

### 3. New Refund Approvals Router (`packages/api/src/routers/refund-approvals.ts`)

**Status**: Pending

New procedures:
- `organizer.approve` - mutation for organizers to approve refunds for their events
- `admin.approve` - mutation for admins to approve refunds
- `list` - query for organizers/admins to view pending refunds

### 4. Refund Processing Logic

**Status**: Pending

New function `processApprovedRefund`:
- Handles actual payment provider refund
- Only triggered after BOTH organizer AND admin have approved
- Uses atomic transactions with `prisma.$transaction`
- Maintains existing waitlist offer logic

### 5. Admin UI Components (`apps/admin/src/components/refund-approvals/`)

**Status**: Pending

Components:
- Refund approval list page showing pending refunds
- Approve/reject buttons with confirmation dialogs
- Display refund details including booking and event information

### 6. Organizer UI Components (`apps/organizer/src/components/refund-approvals/`)

**Status**: Pending

Components:
- Similar UI to admin but filtered to show only refunds for the organizer's events
- Uses existing organizer authorization pattern

## Implementation Notes

### Authorization Patterns

Using existing patterns from `packages/api/src/routers/organizer/events.ts`:
- `requireAuth` - checks `ctx.session.user`
- `requireOrganizer` - verifies user has associated `Organizer` profile
- `checkEventOwnership` - ensures event belongs to organizer (ADMIN bypasses)

### Transaction Pattern

Using `prisma.$transaction` for atomic operations as seen in `booking.ts` lines 423-450.

### Refund Calculation

Using existing `computeRefund` and `canCancelBooking` from `@indietix/utils`.

## Progress Log

- Started implementation on branch `devin/1765533754-refund-approval-system`
