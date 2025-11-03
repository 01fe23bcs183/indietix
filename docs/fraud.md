# Fraud & Risk Management System

## Overview

The IndieTix fraud/risk layer provides a comprehensive system for detecting and preventing fraudulent booking attempts through:

- **Declarative Rules Engine**: Configure fraud detection rules with flexible conditions
- **Risk Scoring**: Weighted scoring system (0-100) based on matched rules
- **Blacklists**: Manage blocked emails, phone numbers, and IP addresses
- **Manual Review Queue**: Flag suspicious bookings for admin review
- **Real-time Evaluation**: Fraud checks run on every booking attempt

## Architecture

### Components

1. **Prisma Models** (`packages/db/prisma/schema.prisma`)
   - `BookingAttempt`: Captures all booking signals (IP, user agent, email domain, etc.)
   - `FraudRule`: Stores declarative rule definitions
   - `FraudList`: Manages blacklists (EMAIL, PHONE, IP)
   - `FraudCase`: Manual review queue for flagged bookings
   - `Booking`: Extended with `riskScore` and `riskTags` fields

2. **Fraud Engine** (`packages/fraud/src/engine.ts`)
   - `buildContext()`: Queries velocity counters, blacklists, failed payments
   - `evaluateRule()`: Evaluates individual rule conditions
   - `evaluate()`: Main evaluation function returning risk score and action

3. **tRPC API** (`packages/api/src/routers/admin/fraud.ts`)
   - Rules management (CRUD operations)
   - Blacklist management (add, remove, bulk import)
   - Review queue (list cases, resolve, add notes)
   - Dashboard statistics

4. **Admin UI** (`apps/admin/src/app/(dashboard)/fraud/`)
   - Dashboard: Risk distribution, top IPs, statistics
   - Rules: Enable/disable, edit, delete rules
   - Blacklists: Manage blocked entities
   - Review Queue: Approve/reject flagged bookings

## Rule Types

### 1. Velocity Rules

**velocity_ip**: Detect multiple attempts from same IP
```json
{
  "type": "velocity_ip",
  "threshold": 5,
  "minutes": 10
}
```
Matches when IP has ≥5 attempts in last 10 minutes.

**velocity_user**: Detect multiple attempts from same user
```json
{
  "type": "velocity_user",
  "threshold": 3,
  "minutes": 10
}
```
Matches when user has ≥3 attempts in last 10 minutes.

### 2. Blacklist Rules

**email_domain_blacklist**: Block specific email domains
```json
{
  "type": "email_domain_blacklist"
}
```
Matches if user's email domain is in blacklist.

**phone_prefix_blacklist**: Block specific phone prefixes
```json
{
  "type": "phone_prefix_blacklist"
}
```
Matches if user's phone prefix is in blacklist.

**ip_blacklist**: Block specific IP addresses
```json
{
  "type": "ip_blacklist"
}
```
Matches if request IP is in blacklist.

### 3. Threshold Rules

**qty_threshold**: Flag large quantity bookings
```json
{
  "type": "qty_threshold",
  "threshold": 10
}
```
Matches when booking quantity ≥10.

### 4. Behavioral Rules

**high_value_new_user**: Flag expensive events for new accounts
```json
{
  "type": "high_value_new_user",
  "priceThreshold": 5000,
  "ageThreshold": 7
}
```
Matches when event price ≥₹5000 AND user account age <7 days.

**repeated_failed_payments**: Detect payment failure patterns
```json
{
  "type": "repeated_failed_payments",
  "threshold": 3
}
```
Matches when user has ≥3 failed payments in last 10 minutes.

## Actions

### FLAG
- Booking proceeds normally
- Risk score and tags are recorded
- No admin intervention required
- Use for: Low-risk signals, analytics

### REVIEW
- Booking is created but flagged for review
- Creates `FraudCase` with status=OPEN
- Admin must approve/reject before event
- Use for: Medium-risk signals requiring human judgment

### REJECT
- Booking is immediately blocked
- User sees error message with support link
- `BookingAttempt` created with result="cancelled"
- Use for: High-risk signals (blacklisted entities, extreme velocity)

## Risk Scoring

Risk score is calculated as the sum of weights from all matched rules, capped at 100:

```
riskScore = min(100, sum(matched_rule.weight))
```

**Risk Levels:**
- Low: 0-24
- Medium: 25-49
- High: 50-74
- Critical: 75-100

**Action Priority:**
If multiple rules match, the most severe action is taken:
```
REJECT > REVIEW > FLAG
```

## Configuration Examples

### Safe Defaults

```sql
-- Velocity protection
INSERT INTO "FraudRule" (name, enabled, priority, definition, action, weight)
VALUES (
  'High IP Velocity',
  true,
  100,
  '{"type":"velocity_ip","threshold":10,"minutes":10}',
  'REVIEW',
  30
);

-- Blacklist enforcement
INSERT INTO "FraudRule" (name, enabled, priority, definition, action, weight)
VALUES (
  'Email Domain Blacklist',
  true,
  200,
  '{"type":"email_domain_blacklist"}',
  'REJECT',
  100
);

-- Large quantity flag
INSERT INTO "FraudRule" (name, enabled, priority, definition, action, weight)
VALUES (
  'Bulk Purchase',
  true,
  50,
  '{"type":"qty_threshold","threshold":5}',
  'FLAG',
  15
);

-- New user protection
INSERT INTO "FraudRule" (name, enabled, priority, definition, action, weight)
VALUES (
  'High Value New User',
  true,
  80,
  '{"type":"high_value_new_user","priceThreshold":5000,"ageThreshold":7}',
  'REVIEW',
  40
);
```

### Tuning Guidelines

1. **Start Conservative**: Begin with FLAG actions, monitor false positives
2. **Adjust Weights**: Increase weights for rules with high precision
3. **Priority Matters**: Higher priority rules evaluate first
4. **Test Thoroughly**: Use test bookings to validate rule behavior
5. **Monitor Metrics**: Track open cases, rejection rates, false positives

## Integration

### Booking Flow

1. User initiates booking via `booking.start`
2. System captures signals (IP, user agent, email domain, etc.)
3. Fraud engine evaluates all enabled rules
4. Based on action:
   - **REJECT**: Throw error, create BookingAttempt with result="cancelled"
   - **REVIEW**: Create booking + BookingAttempt + FraudCase
   - **FLAG**: Create booking with riskScore/riskTags
5. Return booking details with risk information

### Webhook Integration

Razorpay webhook handler updates `BookingAttempt` with payment outcomes:
- `payment.captured`: Sets result="success", paidAt timestamp
- `payment.failed`: Sets result="failed"

This enables rules like `repeated_failed_payments` to detect patterns.

## Admin Operations

### Managing Rules

```typescript
// Create rule
await trpc.admin.fraud.createRule.mutate({
  name: "Suspicious Email Pattern",
  enabled: true,
  priority: 90,
  definition: { type: "email_domain_blacklist" },
  action: "REVIEW",
  weight: 25,
});

// Toggle rule
await trpc.admin.fraud.updateRule.mutate({
  id: ruleId,
  enabled: false,
});
```

### Managing Blacklists

```typescript
// Add single entry
await trpc.admin.fraud.addToBlacklist.mutate({
  type: "EMAIL",
  value: "spam.com",
  reason: "Known spam domain",
});

// Bulk import
await trpc.admin.fraud.bulkAddToBlacklist.mutate({
  type: "IP",
  values: ["10.0.0.1", "10.0.0.2", "10.0.0.3"],
  reason: "VPN exit nodes",
});
```

### Resolving Cases

```typescript
// Approve case
await trpc.admin.fraud.resolveCase.mutate({
  id: caseId,
  status: "APPROVED",
  note: "Verified with user via phone",
});

// Reject case
await trpc.admin.fraud.resolveCase.mutate({
  id: caseId,
  status: "REJECTED",
  note: "Confirmed fraudulent attempt",
});
```

## Best Practices

1. **Idempotency**: Engine can be re-run safely; use for testing
2. **No PAN Storage**: Never store card numbers; use metadata only
3. **Audit Trail**: All admin actions logged in `AdminAction` table
4. **Gradual Rollout**: Start with FLAG, monitor, then escalate to REVIEW/REJECT
5. **Regular Review**: Check dashboard weekly, adjust rules based on patterns
6. **False Positive Handling**: Provide clear support contact for rejected users
7. **Privacy**: Anonymize IP addresses in logs after 90 days

## Monitoring

Key metrics to track:
- Open cases count (should stay low)
- Rejection rate (target <1% of legitimate traffic)
- False positive rate (from support tickets)
- Top IPs (detect bot patterns)
- Risk distribution (most bookings should be low-risk)

## Troubleshooting

**High rejection rate:**
- Review REJECT rules, consider downgrading to REVIEW
- Check blacklists for overly broad entries
- Verify velocity thresholds aren't too aggressive

**Too many open cases:**
- Increase admin capacity or automate low-risk approvals
- Adjust REVIEW rules to FLAG for borderline cases
- Set up automated case expiry (approve after N hours)

**False positives:**
- Add allowlist support (future enhancement)
- Whitelist known good IPs/emails
- Reduce rule weights for problematic rules

## Future Enhancements

- Device fingerprinting
- Machine learning risk models
- Allowlist support
- Automated case resolution
- Geolocation-based rules
- Time-of-day patterns
- Historical user behavior analysis
