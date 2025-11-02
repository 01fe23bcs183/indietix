# Admin Panel Documentation

## Overview

The IndieTix Admin Panel (Tier 1.5) provides comprehensive platform management capabilities for administrators. This document covers roles, actions, audit logging, and safety rails.

## Authentication & Authorization

### Roles

The platform supports three user roles:

- **CUSTOMER**: Regular users who book tickets
- **ORGANIZER**: Event organizers who create and manage events
- **ADMIN**: Platform administrators with full access

### Access Control

The Admin app (`apps/admin`) is protected by middleware that enforces:

1. User must be authenticated (have a valid session)
2. User role must be `ADMIN`
3. Non-admin users are redirected to `/auth/signin`

**Implementation**: See `apps/admin/middleware.ts`

### RBAC in API

All admin API routes include RBAC guards that:

1. Check if the user is authenticated
2. Verify the user has `ADMIN` role
3. Throw `FORBIDDEN` error if access is denied

**Implementation**: Each admin router includes a `requireAdmin()` helper function

## Dashboard

The admin dashboard provides real-time platform metrics:

### KPI Cards

- **GMV Today**: Total booking amounts for today
- **Revenue Today**: Platform fees collected today
- **Active Users**: Users with activity in last 24 hours
- **Bookings Last Hour**: Number of bookings in the last hour
- **Uptime**: Static placeholder (99.9%)

### Charts

- **Revenue (Last 30 Days)**: Daily revenue breakdown
- **Bookings by Category**: Pie chart of bookings by event category
- **Top Cities**: Bar chart of top cities by booking count

### Recent Activity

- Last 20 bookings/events changes
- Shows description, timestamp, and status

## Entity Management

### Users

**Features**:

- Search by email, phone, or name
- Filter by role (CUSTOMER, ORGANIZER, ADMIN)
- Filter by creation date range
- View user details (bookings, flags)
- Edit user role
- Ban/unban users

**API Endpoints**:

- `admin.users.list` - Paginated user list with filters
- `admin.users.get` - Get user details
- `admin.users.updateRole` - Change user role
- `admin.users.ban` - Ban or unban user

**Safety Rails**:

- All actions are logged in `AdminAction` table
- Banned users cannot access the platform

### Organizers

**Features**:

- Verification queue (approve/reject)
- Organizer profile detail view
- View verification docs (JSON field)
- View masked bank account info
- View events and revenue
- Commission override (stored in `commissionOverride` field)

**API Endpoints**:

- `admin.organizers.verificationQueue` - List unverified organizers
- `admin.organizers.list` - List all organizers with filters
- `admin.organizers.get` - Get organizer details with revenue
- `admin.organizers.approve` - Approve organizer verification
- `admin.organizers.reject` - Reject organizer verification
- `admin.organizers.setCommissionOverride` - Set custom commission rate

**Safety Rails**:

- All verification actions are logged
- Commission override is nullable (null = use default)
- Commission override is validated (0-100%)

### Events

**Features**:

- Full event list with filters (status, category, city, date)
- Search by title or description
- Feature/unfeature events (promoted display)
- Hide/unhide events (remove from public view)
- Cancel events with reason

**API Endpoints**:

- `admin.events.list` - Paginated event list with filters
- `admin.events.get` - Get event details
- `admin.events.feature` - Feature or unfeature event
- `admin.events.hide` - Hide or unhide event
- `admin.events.cancel` - Cancel event with reason

**Safety Rails**:

- All actions are logged
- Cancel reason is required and stored
- Featured events appear first in search results
- Hidden events are not shown to customers

### Transactions

**Features**:

- Bookings list with filters (status, payment status, date)
- Search by ticket number, payment IDs, or user
- View booking details (payment IDs, timeline)
- Refund bookings (admin override)

**API Endpoints**:

- `admin.transactions.list` - Paginated bookings list
- `admin.transactions.get` - Get booking details with full history
- `admin.transactions.refund` - Issue refund (admin override)

**Safety Rails**:

- Refunds are logged in `AdminAction` table
- Refund amount cannot exceed booking amount
- Can only refund completed payments
- Refund creates entry in `Refund` table

### Payouts

**Features**:

- Approval queue for pending payouts
- Integration with payment provider API

**API Endpoints**:

- Uses existing `payouts` router with admin access

**Safety Rails**:

- Payout approval is logged
- Payout status transitions are tracked

## Platform Settings

### Fee Configuration

Admins can configure platform fees (stored in `PlatformSetting` table):

- **Payment Gateway Fee**: Per-ticket fee (₹)
- **Server Maintenance Fee**: Per-ticket fee (₹)
- **Platform Support Fee**: Per-ticket fee (₹)

**Default Values**: 2, 2, 10 (₹14 total per ticket)

### GST Configuration

- **GST Rate**: Percentage applied to fees only (not base ticket price)
- **Default Value**: 18% (0.18)

### Cancellation Policy Defaults

- **Cancellation Fee Flat**: Fixed cancellation fee (₹)
- **Cancellation Deadline Hours**: Hours before event when cancellation is allowed
- **Default Values**: ₹50, 24 hours

### Feature Flags

Boolean flags stored in `PlatformSetting` table under key `featureFlags`:

- Admins can enable/disable features platform-wide
- Stored as JSON object: `{ flagName: boolean }`

**API Endpoints**:

- `admin.settings.getFees` - Get current fee configuration
- `admin.settings.setFees` - Update fee configuration
- `admin.settings.getGstRate` - Get current GST rate
- `admin.settings.setGstRate` - Update GST rate
- `admin.settings.getCancellationDefaults` - Get cancellation defaults
- `admin.settings.setCancellationDefaults` - Update cancellation defaults
- `admin.settings.getFeatureFlags` - Get all feature flags
- `admin.settings.setFeatureFlag` - Enable/disable a feature flag

**Safety Rails**:

- All settings changes are logged in `AdminAction` table
- Settings have validation (e.g., GST rate 0-100%)
- Web app reads settings with fallback to constants
- Settings are cached for performance

## Audit Logging

### AdminAction Table

All admin mutations are logged in the `AdminAction` table:

```prisma
model AdminAction {
  id         String   @id @default(cuid())
  adminId    String
  entityType String   // USER, ORGANIZER, EVENT, BOOKING, PLATFORM_SETTING
  entityId   String   // ID of the affected entity
  action     String   // UPDATE_ROLE, BAN, APPROVE, REJECT, FEATURE, etc.
  prev       Json?    // Previous state
  next       Json?    // New state
  ts         DateTime @default(now())

  admin      User     @relation(fields: [adminId], references: [id])

  @@index([entityType, entityId])
  @@index([adminId])
  @@index([ts])
}
```

### Logged Actions

**User Actions**:

- `UPDATE_ROLE` - Role change
- `BAN` / `UNBAN` - Ban status change

**Organizer Actions**:

- `APPROVE` - Verification approval
- `REJECT` - Verification rejection
- `SET_COMMISSION_OVERRIDE` - Commission override change

**Event Actions**:

- `FEATURE` / `UNFEATURE` - Featured status change
- `HIDE` / `UNHIDE` - Hidden status change
- `CANCEL` - Event cancellation

**Booking Actions**:

- `REFUND` - Admin-initiated refund

**Settings Actions**:

- `UPDATE` - Generic setting update
- `UPDATE_FEES` - Fee configuration change
- `UPDATE_GST_RATE` - GST rate change
- `UPDATE_CANCELLATION_DEFAULTS` - Cancellation policy change
- `UPDATE_FEATURE_FLAG` - Feature flag change

### Audit Trail

The audit trail provides:

- **Who**: Admin user ID
- **What**: Action type and entity type
- **When**: Timestamp
- **Where**: Entity ID
- **Before/After**: Previous and new state (JSON)

This enables:

- Compliance and accountability
- Debugging and troubleshooting
- Rollback capability (manual)
- Security monitoring

## Safety Rails

### Authentication

- All admin routes require authentication
- Session-based authentication with NextAuth
- Automatic redirect to signin for unauthenticated users

### Authorization

- Role-based access control (RBAC)
- Admin role required for all admin operations
- API-level enforcement (not just UI)

### Validation

- Input validation using Zod schemas
- Type safety with TypeScript
- Database constraints (foreign keys, indexes)

### Audit

- All mutations are logged
- Immutable audit trail
- Indexed for fast queries

### Data Integrity

- Transactions for critical operations
- Foreign key constraints
- Cascading deletes where appropriate

### Rate Limiting

- (To be implemented) API rate limiting
- (To be implemented) Login attempt limiting

### Monitoring

- Dashboard KPIs for real-time monitoring
- Recent activity feed
- (To be implemented) Alerting for suspicious activity

## Testing

### Unit Tests (Vitest)

- `packages/api/src/__tests__/admin-settings.spec.ts` - Settings CRUD
- `packages/api/src/__tests__/admin-rbac.spec.ts` - RBAC enforcement
- `packages/api/src/__tests__/admin-commission.spec.ts` - Commission override

### E2E Tests (Playwright)

- `apps/admin/e2e/admin.spec.ts` - Admin login, dashboard, navigation

**Run Tests**:

```bash
pnpm -w test              # Unit tests
npx playwright test       # E2E tests
```

## Deployment

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Admin app URL

### Database Migrations

```bash
cd packages/db
npx prisma migrate deploy
```

### Build

```bash
pnpm -w build
```

## Security Considerations

1. **Admin Credentials**: Use strong passwords and 2FA (to be implemented)
2. **Session Management**: Sessions expire after inactivity
3. **Audit Logging**: All actions are logged for accountability
4. **Input Validation**: All inputs are validated and sanitized
5. **SQL Injection**: Prisma ORM prevents SQL injection
6. **XSS**: React escapes output by default
7. **CSRF**: NextAuth includes CSRF protection

## Future Enhancements

- Two-factor authentication (2FA)
- IP whitelisting for admin access
- Advanced analytics and reporting
- Bulk operations (e.g., bulk ban users)
- Export audit logs to CSV
- Real-time notifications for critical events
- Advanced search with Elasticsearch
- Role hierarchy (super admin, admin, moderator)
