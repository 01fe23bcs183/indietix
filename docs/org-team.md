# Organizer Team Management with RBAC

Multi-user organizer teams with role-based access control (RBAC) and audit logging.

## Overview

Organizers can invite team members with different roles to help manage their events. Each role has specific permissions that control what actions the team member can perform.

## Roles and Permissions

### Role Hierarchy

1. **OWNER** - Full access to all organizer features
2. **MANAGER** - Create/edit events, view payouts, approve refunds, access attendees
3. **STAFF** - View events and attendees, export data
4. **SCANNER** - Check-in attendees only

### Permission Matrix

| Permission | OWNER | MANAGER | STAFF | SCANNER |
|------------|-------|---------|-------|---------|
| Manage team | Yes | No | No | No |
| Create events | Yes | Yes | No | No |
| Edit events | Yes | Yes | No | No |
| Delete events | Yes | No | No | No |
| View events | Yes | Yes | Yes | No |
| View attendees | Yes | Yes | Yes | No |
| Export data | Yes | Yes | Yes | No |
| Check-in attendees | Yes | Yes | Yes | Yes |
| View payouts | Yes | Yes | No | No |
| Request payouts | Yes | No | No | No |
| Approve refunds | Yes | Yes | No | No |
| View analytics | Yes | Yes | Yes | No |
| Manage flash sales | Yes | Yes | No | No |

## Invite Flow

### Sending an Invite

1. Owner navigates to `/settings/team`
2. Clicks "Invite Member"
3. Enters email and selects role
4. System creates `OrgInvite` with unique token
5. Email sent to invitee with accept link

### Accepting an Invite

1. Invitee receives email with link to `/invite/accept?token=...`
2. If not logged in, redirected to login/signup
3. After authentication, shown invite details
4. Clicks "Accept Invitation"
5. System creates `OrgMember` record
6. Invitee redirected to organizer dashboard

### Invite Expiration

- Invites expire after 7 days by default
- Expired invites cannot be accepted
- Owner can resend invite (creates new token)
- Owner can cancel pending invites

## Scanner Quick-Pass

For temporary scanner access without creating a full account.

### Creating a Scanner Pass

1. Owner/Manager navigates to `/settings/team`
2. Clicks "Create Scanner Pass"
3. Selects expiration time (4-72 hours)
4. System generates one-time token
5. Displays shareable URL and QR code

### Using a Scanner Pass

1. Scanner opens the provided URL
2. Automatically authenticated with SCANNER role
3. Access limited to check-in functionality
4. Pass expires after configured time or first use

### Scanner Pass Features

- One-time use (marked as used after first access)
- Configurable TTL (4-72 hours)
- Can be revoked by owner/manager
- Limited scope (check-in only)

## API Endpoints

### Team Management

```typescript
// List team members
organizer.team.list({})

// Add team member directly (for existing users)
organizer.team.add({ userId: string, role: OrgRole })

// Remove team member
organizer.team.remove({ memberId: string })

// Update team member role
organizer.team.updateRole({ memberId: string, role: OrgRole })
```

### Invite Management

```typescript
// Create invite
organizer.invite.create({ email: string, role: OrgRole })

// List pending invites
organizer.invite.list({ status?: string })

// Resend invite email
organizer.invite.resend({ inviteId: string })

// Cancel invite
organizer.invite.cancel({ inviteId: string })

// Get invite by token (public)
organizer.invite.getByToken({ token: string })

// Accept invite
organizer.invite.accept({ token: string })
```

### Scanner Pass Management

```typescript
// Create scanner pass
organizer.scanner.createPass({ eventId?: string, ttlHours: number })

// List scanner passes
organizer.scanner.listPasses({})

// Revoke scanner pass
organizer.scanner.revokePass({ passId: string })

// Validate scanner pass (public)
organizer.scanner.validatePass({ token: string })
```

## Server-Side Authorization

### Permission Guard

Use `requireOrgPerm` to protect routes:

```typescript
import { requireOrgPerm, OrgPermission } from "@indietix/auth";

// In tRPC procedure
const result = await requireOrgPerm(
  ctx.userId,
  organizerId,
  OrgPermission.EDIT_EVENTS
);

if (!result.allowed) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

### Available Permissions

```typescript
enum OrgPermission {
  MANAGE_TEAM = "MANAGE_TEAM",
  CREATE_EVENTS = "CREATE_EVENTS",
  EDIT_EVENTS = "EDIT_EVENTS",
  DELETE_EVENTS = "DELETE_EVENTS",
  VIEW_EVENTS = "VIEW_EVENTS",
  VIEW_ATTENDEES = "VIEW_ATTENDEES",
  EXPORT_DATA = "EXPORT_DATA",
  CHECKIN_ATTENDEES = "CHECKIN_ATTENDEES",
  VIEW_PAYOUTS = "VIEW_PAYOUTS",
  REQUEST_PAYOUTS = "REQUEST_PAYOUTS",
  APPROVE_REFUNDS = "APPROVE_REFUNDS",
  VIEW_ANALYTICS = "VIEW_ANALYTICS",
  MANAGE_FLASH_SALES = "MANAGE_FLASH_SALES",
}
```

## Audit Logging

All team actions are logged in `OrgAction` for accountability.

### Logged Actions

- Team member added/removed
- Role changed
- Invite sent/cancelled/accepted
- Scanner pass created/revoked
- Event created/edited/deleted
- Payout requested
- Refund approved

### Audit Log Fields

```typescript
interface OrgAction {
  id: string;
  organizerId: string;
  actorUserId: string;
  action: string;        // e.g., "MEMBER_ADDED"
  entityType: string;    // e.g., "OrgMember"
  entityId: string;
  prev: Json | null;     // Previous state
  next: Json | null;     // New state
  ts: DateTime;
}
```

## Data Models

### OrgMember

```prisma
model OrgMember {
  id          String   @id @default(cuid())
  organizerId String
  userId      String
  role        OrgRole
  invitedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  organizer   Organizer @relation(...)
  user        User      @relation(...)
  inviter     User?     @relation(...)

  @@unique([organizerId, userId])
  @@index([organizerId])
  @@index([userId])
}

enum OrgRole {
  OWNER
  MANAGER
  STAFF
  SCANNER
}
```

### OrgInvite

```prisma
model OrgInvite {
  id          String          @id @default(cuid())
  organizerId String
  email       String
  role        OrgRole
  token       String          @unique
  status      OrgInviteStatus @default(PENDING)
  expiresAt   DateTime
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  organizer   Organizer       @relation(...)

  @@index([organizerId])
  @@index([email])
  @@index([token])
}

enum OrgInviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}
```

### ScannerPass

```prisma
model ScannerPass {
  id          String   @id @default(cuid())
  organizerId String
  eventId     String?
  token       String   @unique
  expiresAt   DateTime
  usedAt      DateTime?
  revokedAt   DateTime?
  createdBy   String
  createdAt   DateTime @default(now())

  organizer   Organizer @relation(...)
  event       Event?    @relation(...)
  creator     User      @relation(...)

  @@index([organizerId])
  @@index([token])
}
```

### OrgAction (Audit Log)

```prisma
model OrgAction {
  id          String   @id @default(cuid())
  organizerId String
  actorUserId String
  action      String
  entityType  String
  entityId    String
  prev        Json?
  next        Json?
  ts          DateTime @default(now())

  organizer   Organizer @relation(...)
  actor       User      @relation(...)

  @@index([organizerId])
  @@index([actorUserId])
  @@index([ts])
}
```

## UI Components

### Team Settings Page

**Location**: `/settings/team`

Features:
- List all team members with roles
- Change member roles (owner only)
- Remove team members (owner only)
- Invite new members
- View pending invites with resend/cancel
- Create scanner passes
- View active scanner passes with revoke option
- Role permissions reference

### Accept Invite Page

**Location**: `/invite/accept?token=...`

Features:
- Display organizer info and logo
- Show invite details (email, role)
- Role permissions explanation
- Accept/decline buttons
- Error handling for expired/invalid invites

## Testing

### Unit Tests

Located at `packages/auth/src/__tests__/perm.spec.ts`:
- Permission matrix validation
- Role hierarchy checks
- Guard function behavior

### E2E Tests

- Invite flow: send invite -> accept -> role reflected
- Scanner access: SCANNER role can only access scanner page
- Permission enforcement: STAFF cannot edit events
