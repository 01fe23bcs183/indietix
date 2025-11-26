# Fraud Detection & Risk Scoring System

## Overview

The IndieTix fraud detection system provides a declarative rules engine for identifying and preventing fraudulent booking attempts. The system operates in real-time during the booking flow and provides admin tools for managing rules, blacklists, and reviewing flagged cases.

## Architecture

### Components

1. **Fraud Engine** (`packages/fraud/engine.ts`)
   - Evaluates booking attempts against configured rules
   - Calculates risk scores (0-100)
   - Returns actions: FLAG, REVIEW, or REJECT

2. **Database Models**
   - `BookingAttempt`: Tracks all booking attempts with signals (IP, email domain, phone prefix, etc.)
   - `FraudRule`: Stores declarative rules with JSON definitions
   - `FraudList`: Blacklists for EMAIL, PHONE, and IP
   - `FraudCase`: Manual review queue for flagged bookings

3. **API Integration**
   - Integrated into `booking.start` to evaluate attempts before creating bookings
   - Razorpay webhook enrichment to track payment success/failure
   - Admin API endpoints for managing rules, blacklists, and cases

4. **Admin UI**
   - Dashboard with KPIs and top IPs
   - Rules management (enable/disable, edit, reorder)
   - Blacklist management with CSV import
   - Review queue for manual case resolution

## Rule Types

### 1. Velocity Rules

**velocity_ip**: Detects rapid booking attempts from the same IP
```json
{
  "type": "velocity_ip",
  "last_minutes": 10,
  "threshold": 5
}
```

**velocity_user**: Detects rapid booking attempts from the same user
```json
{
  "type": "velocity_user",
  "last_minutes": 10,
  "threshold": 5
}
```

### 2. Blacklist Rules

**email_domain_blacklist**: Checks if email domain is blacklisted
```json
{
  "type": "email_domain_blacklist"
}
```

**phone_prefix_blacklist**: Checks if phone prefix is blacklisted
```json
{
  "type": "phone_prefix_blacklist"
}
```

**ip_blacklist**: Checks if IP address is blacklisted
```json
{
  "type": "ip_blacklist"
}
```

### 3. Threshold Rules

**qty_threshold**: Flags bookings with high quantities
```json
{
  "type": "qty_threshold",
  "threshold": 10
}
```

**high_value_new_user**: Flags expensive tickets from new users
```json
{
  "type": "high_value_new_user",
  "min_price": 5000,
  "max_signup_age_days": 7
}
```

### 4. Payment History Rules

**repeated_failed_payments**: Detects multiple failed payment attempts
```json
{
  "type": "repeated_failed_payments",
  "last_minutes": 30,
  "threshold": 3
}
```

## Actions

### FLAG
- Annotates booking with risk score and tags
- Allows booking to proceed
- Visible in admin dashboard for monitoring

### REVIEW
- Creates a FraudCase in OPEN status
- Booking proceeds but is flagged for manual review
- Admin can approve or reject later

### REJECT
- Prevents booking from being created
- Returns error to user with support link
- Most severe action for high-confidence fraud

## Risk Scoring

- Each matched rule contributes its weight to the total risk score
- Risk scores are capped at 100
- Higher scores indicate higher fraud risk
- Scores are stored on the Booking model for analytics

## Safe Defaults

Recommended starting configuration:

1. **Email Domain Blacklist** (REJECT, weight: 50)
   - Manually add known disposable email domains

2. **IP Velocity** (REVIEW, weight: 30)
   - 5+ attempts in 10 minutes

3. **High Quantity** (FLAG, weight: 20)
   - 10+ tickets in single booking

4. **Repeated Failures** (REVIEW, weight: 40)
   - 3+ failed payments in 30 minutes

## Tuning Weights

- Start with conservative weights (10-30)
- Monitor false positive rate in admin dashboard
- Adjust weights based on actual fraud patterns
- Use FLAG action for new rules until validated

## Idempotency

The fraud engine is designed to be idempotent:
- Re-evaluating the same booking attempt produces the same result
- BookingAttempt records are immutable once created
- Safe to re-run evaluation for debugging

## Admin Workflows

### Adding to Blacklist
1. Navigate to /admin/fraud/blacklists
2. Select type (EMAIL, PHONE, IP)
3. Enter value and optional reason
4. Submit to add entry

### Bulk CSV Import
1. Prepare CSV with columns: type, value, reason
2. Upload via blacklist management page
3. System skips duplicates automatically

### Reviewing Cases
1. Navigate to /admin/fraud/review
2. View OPEN cases with booking details
3. Add notes for investigation
4. Approve or Reject with reason
5. Actions are logged in AdminAction table

## Monitoring

Key metrics to track:
- Total booking attempts vs. flagged attempts
- False positive rate (approved reviews / total reviews)
- Top IPs by attempt count
- Rules firing frequency
- Average risk score distribution

## Security Considerations

- No reliance on card PAN (PCI compliance)
- All fraud signals are metadata-based
- HMAC signature verification on webhooks
- Admin-only access to fraud management
- Audit trail via AdminAction logs

## Future Enhancements

Potential improvements:
- Machine learning model integration
- Device fingerprinting
- Geolocation verification
- Behavioral analysis
- Real-time alerting
- Automated blacklist updates from threat feeds
