# Authentication & Authorization Documentation

## Overview

IndieTix uses NextAuth v5 for authentication with a Credentials provider and implements Role-Based Access Control (RBAC) for authorization.

## Authentication Flow

### Sign Up Flow

```
User → /auth/signup → Fill Form (name, email, phone?, password)
  ↓
tRPC auth.signup mutation
  ↓
Validate input with Zod
  ↓
Check if user exists
  ↓
Hash password with bcrypt (10 rounds)
  ↓
Create User with role=CUSTOMER
  ↓
Redirect to /auth/signin
```

### Sign In Flow

```
User → /auth/signin → Fill Form (email, password)
  ↓
NextAuth Credentials Provider
  ↓
Validate input with Zod
  ↓
Find user by email
  ↓
Verify password with bcrypt
  ↓
Create JWT session with user data
  ↓
Attach role to session via callbacks
  ↓
Redirect to home page
```

### Session Management

```
Request → Middleware → Check session
  ↓
JWT token contains: { id, email, role }
  ↓
Session available via auth() helper
  ↓
Used in tRPC context and middleware
```

## Role-Based Access Control (RBAC)

### Roles

- **CUSTOMER**: Default role for new users. Can browse events and make bookings.
- **ORGANIZER**: Can create and manage events, view analytics, and manage payouts.
- **ADMIN**: Full platform access including user management and moderation.

### Access Control Matrix

| Route/Resource                    | CUSTOMER | ORGANIZER | ADMIN |
| --------------------------------- | -------- | --------- | ----- |
| `/` (Public pages)                | ✅       | ✅        | ✅    |
| `/auth/*`                         | ✅       | ✅        | ✅    |
| `/events` (Browse)                | ✅       | ✅        | ✅    |
| `/bookings` (Own)                 | ✅       | ✅        | ✅    |
| `/organizer/*`                    | ❌       | ✅        | ✅    |
| `/organizer/events` (Create/Edit) | ❌       | ✅        | ✅    |
| `/organizer/analytics`            | ❌       | ✅        | ✅    |
| `/organizer/payouts`              | ❌       | ✅        | ✅    |
| `/admin/*`                        | ❌       | ❌        | ✅    |
| `/admin/users`                    | ❌       | ❌        | ✅    |
| `/admin/moderation`               | ❌       | ❌        | ✅    |

### Middleware Implementation

#### Web App (`apps/web/middleware.ts`)

- Protects `/organizer/*` routes: Requires ORGANIZER or ADMIN role
- Protects `/admin/*` routes: Requires ADMIN role
- Redirects unauthorized users to `/auth/signin` with HTTP 302

#### Organizer App (`apps/organizer/middleware.ts`)

- Protects all routes except auth and static files
- Requires ORGANIZER or ADMIN role
- Redirects unauthorized users to `/auth/signin` with HTTP 302

#### Admin App (`apps/admin/middleware.ts`)

- Protects all routes except auth and static files
- Requires ADMIN role only
- Redirects unauthorized users to `/auth/signin` with HTTP 302

## tRPC Procedures

### Public Procedures

#### `auth.signup`

- **Input**: `{ name, email, phone?, password }`
- **Output**: `{ userId: string }`
- **Validation**: Zod schema with email format and password min length (6)
- **Logic**:
  - Check for existing user
  - Hash password with bcrypt (10 rounds)
  - Create user with role=CUSTOMER
  - Return userId

#### `auth.signin`

- **Input**: `{ email, password }`
- **Output**: `{ ok: true }`
- **Validation**: Zod schema with email format and password min length (6)
- **Logic**:
  - Call NextAuth signIn with credentials
  - Return success or throw UNAUTHORIZED error

#### `auth.me`

- **Input**: None
- **Output**: `{ id, email, role }`
- **Authorization**: Requires authenticated session
- **Logic**:
  - Check session from context
  - Fetch user from database
  - Return user data

#### `events.list`

- **Input**: `{ city?, category?, priceLte?, dateFrom?, dateTo?, orderBy? }`
- **Output**: Array of events with organizer businessName
- **Filters**:
  - `city`: Filter by city name
  - `category`: Filter by event category (MUSIC, COMEDY, SPORTS, TECH, FOOD, ART, OTHER)
  - `priceLte`: Filter by maximum price
  - `dateFrom`: Filter events from this date
  - `dateTo`: Filter events until this date
  - `orderBy`: Sort by date_asc (default), date_desc, price_asc, price_desc
- **Logic**:
  - Only returns PUBLISHED events
  - Includes organizer businessName

#### `events.getBySlug`

- **Input**: `{ slug: string }`
- **Output**: Event with full details and organizer info
- **Logic**:
  - Find event by slug
  - Include organizer businessName, description, verified status
  - Throw NOT_FOUND if event doesn't exist

## Security Features

### Password Security

- **Hashing Algorithm**: bcrypt
- **Salt Rounds**: 10
- **Minimum Length**: 6 characters
- **Storage**: Only hashed passwords stored in database

### Session Security

- **Strategy**: JWT (JSON Web Tokens)
- **Token Contents**: User ID, email, role
- **Storage**: HTTP-only cookies (handled by NextAuth)
- **Expiration**: Configured by NextAuth defaults

### Input Validation

- **Library**: Zod
- **Validation Points**:
  - All tRPC procedure inputs
  - Auth forms (client-side and server-side)
  - Email format validation
  - Password strength validation

## Testing

### Unit Tests

- **bcrypt hash/verify**: Tests password hashing and verification
- **RBAC helper**: Tests role-based access control logic for all routes and roles

### E2E Tests (Playwright)

- **Full auth flow**: Signup → Signin → Verify user in header
- **Invalid credentials**: Test error handling
- **Email validation**: Test email format validation
- **Password validation**: Test password length validation

### Test Database

- **Environment**: SQLite (`file:./tmp/test.db`)
- **Setup**: `tests/prisma-test-setup.ts`
- **Process**:
  1. Set DATABASE_URL to SQLite
  2. Run `prisma db push`
  3. Seed with test user
  4. Run tests
  5. Disconnect Prisma client

## Environment Variables

### Development (PostgreSQL)

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.kzthzbncfftjggfvuage.supabase.co:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[GENERATE_RANDOM_SECRET]"
```

### Testing (SQLite)

```env
DATABASE_URL="file:./tmp/test.db"
```

## API Routes

### NextAuth Routes

- `GET/POST /api/auth/[...nextauth]`: NextAuth handler for all auth operations
- `GET /api/auth/signin`: Sign in page
- `GET /api/auth/signout`: Sign out handler
- `GET /api/auth/session`: Get current session

### Custom Auth Routes

- `GET /auth/signin`: Custom sign in page
- `GET /auth/signup`: Custom sign up page

## Database Schema

### User Model

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  phone         String?
  role          Role      @default(CUSTOMER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  organizer     Organizer?
  bookings      Booking[]

  @@index([email])
  @@index([role])
}
```

### Session Model

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}
```

### Role Enum

```prisma
enum Role {
  CUSTOMER
  ORGANIZER
  ADMIN
}
```

## Best Practices

1. **Never expose passwords**: Always hash passwords before storing
2. **Validate all inputs**: Use Zod schemas for all user inputs
3. **Check authorization**: Always verify user role before granting access
4. **Use HTTPS in production**: Protect session cookies and credentials
5. **Rotate secrets**: Regularly update NEXTAUTH_SECRET
6. **Monitor failed logins**: Track and alert on suspicious activity
7. **Implement rate limiting**: Prevent brute force attacks (future enhancement)
8. **Use secure session storage**: HTTP-only cookies prevent XSS attacks

## Future Enhancements

- Two-factor authentication (2FA)
- OAuth providers (Google, Facebook, GitHub)
- Password reset flow
- Email verification
- Rate limiting for auth endpoints
- Account lockout after failed attempts
- Session management (view/revoke active sessions)
- Audit logging for security events
