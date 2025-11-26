# Feature Flags & Experiments

This document covers the design, evaluation process, examples, and guardrails for using feature flags and experiments in the IndieTix platform.

## Overview

The Feature Flags & Experimentation layer provides server-side evaluation, percentage rollouts, cohorts/segments, and experiment metrics. This enables controlled feature releases and A/B testing across the platform.

## Feature Flags

### Model Structure

Feature flags are stored in the `FeatureFlag` model with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `key` | String (Primary Key) | Unique identifier for the flag (e.g., `booking.enabled`) |
| `description` | String? | Brief explanation of the flag's purpose |
| `enabled` | Boolean | Whether the flag is globally active |
| `rollout` | Int (0-100) | Percentage of users for whom the flag is active |
| `rules` | Json? | Targeting rules for specific cohorts |
| `createdAt` | DateTime | Timestamp of creation |
| `updatedAt` | DateTime | Timestamp of last update |

### Targeting Rules

The `rules` field supports the following targeting criteria:

```json
{
  "roles": ["ADMIN", "ORGANIZER"],
  "cities": ["Mumbai", "Delhi", "Bangalore"],
  "categories": ["MUSIC", "TECH"],
  "allowList": ["user_id_1", "user_id_2"],
  "denyList": ["user_id_3"]
}
```

**Evaluation Order:**
1. **Deny List** (highest priority): If user is in deny list, flag is OFF
2. **Allow List**: If user is in allow list, flag is ON (bypasses other rules)
3. **Role Targeting**: User must have one of the specified roles
4. **City Targeting**: User must be in one of the specified cities
5. **Category Targeting**: User must match one of the specified categories
6. **Rollout Percentage**: Deterministic hash determines if user is in rollout

### SDK Usage

```typescript
import { getFlag, getAllFlags, evaluateFlag } from "@indietix/flags";

// Server-side evaluation
const isEnabled = await getFlag({ userId: "user123", role: "CUSTOMER" }, "feature.new_checkout");

// Get all flags for a user (boot-time fetch)
const flags = await getAllFlags({ userId: "user123", role: "CUSTOMER" });

// Client-side hook (React)
import { useFlag, useFlags } from "@/lib/useFlags";

function MyComponent() {
  const isNewCheckout = useFlag("feature.new_checkout");
  const { flags, isLoading } = useFlags();
  
  if (isNewCheckout) {
    return <NewCheckoutUI />;
  }
  return <OldCheckoutUI />;
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `flags.list` | Query | List all feature flags (admin only) |
| `flags.get` | Query | Get a specific flag by key (admin only) |
| `flags.set` | Mutation | Create or update a flag (admin only) |
| `flags.delete` | Mutation | Delete a flag (admin only) |
| `flags.evaluate` | Query | Evaluate flags for current user |

## Experiments

### Model Structure

Experiments are stored in the `Experiment` model:

| Field | Type | Description |
|-------|------|-------------|
| `key` | String (Primary Key) | Unique identifier for the experiment |
| `description` | String? | Brief explanation of the experiment |
| `variants` | Json | Array of variant objects with name and weight |
| `status` | Enum | DRAFT, RUNNING, PAUSED, STOPPED |
| `startAt` | DateTime? | When the experiment started/should start |
| `stopAt` | DateTime? | When the experiment stopped/should stop |

### Variant Structure

```json
[
  { "name": "A", "weight": 50 },
  { "name": "B", "weight": 50 }
]
```

Weights determine the distribution of users across variants. They don't need to sum to 100 - they're relative weights.

### Assignment Stickiness

Assignments are stored in `ExperimentAssignment`:

| Field | Type | Description |
|-------|------|-------------|
| `experimentKey` | String | Reference to the experiment |
| `userId` | String | The assigned user |
| `variant` | String | The assigned variant name |
| `assignedAt` | DateTime | When the assignment was made |

Once a user is assigned to a variant, they always get the same variant (sticky assignment).

### Exposure Tracking

Exposures are logged in `ExperimentExposure`:

| Field | Type | Description |
|-------|------|-------------|
| `experimentKey` | String | Reference to the experiment |
| `userId` | String | The exposed user |
| `variant` | String | The variant shown |
| `ts` | DateTime | Timestamp of exposure |

### SDK Usage

```typescript
import { assignVariant, getVariant, logExposure } from "@indietix/flags";

// Assign user to variant (creates sticky assignment)
const result = await assignVariant({ userId: "user123" }, "checkout-redesign");
// { variant: "B", isNew: true }

// Get variant without creating assignment
const variant = await getVariant({ userId: "user123" }, "checkout-redesign");
// "B" or null if not running

// Log additional exposure
await logExposure({ userId: "user123" }, "checkout-redesign", "B");
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `experiments.list` | Query | List all experiments (admin only) |
| `experiments.get` | Query | Get a specific experiment (admin only) |
| `experiments.create` | Mutation | Create a new experiment (admin only) |
| `experiments.update` | Mutation | Update experiment (admin only, not while running) |
| `experiments.launch` | Mutation | Start the experiment (admin only) |
| `experiments.pause` | Mutation | Pause the experiment (admin only) |
| `experiments.stop` | Mutation | Stop the experiment permanently (admin only) |
| `experiments.assign` | Mutation | Assign current user to variant |
| `experiments.getVariant` | Query | Get variant for current user |
| `experiments.metrics` | Query | Get experiment metrics (admin only) |

## Metrics

### Tracked Metrics

The system tracks the following metrics per variant:

1. **Exposures**: Number of times users saw the variant
2. **Assignments**: Number of unique users assigned to the variant
3. **Conversions**: Bookings confirmed within 7 days of exposure
4. **Clicks**: Event detail page views by exposed users

### Statistical Significance

The system calculates a basic z-score for comparing the first two variants:

```
z = (p1 - p2) / sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2))
```

Results are considered statistically significant at 95% confidence when |z| > 1.96.

## Admin UI

### Feature Flags Page (`/settings/flags`)

The admin UI provides:
- **Kill Switches**: Quick toggles for critical features (booking, checkout, payments)
- **Create/Edit Flags**: Full form with targeting rules
- **Rollout Slider**: Adjust rollout percentage in real-time
- **Toggle Switch**: Enable/disable flags instantly

### Experiments Page (`/experiments`)

The admin UI provides:
- **Create Experiment**: Define key, description, and variants with weights
- **Launch/Pause/Stop**: Control experiment lifecycle
- **Metrics Dashboard**: View exposures, conversions, and significance

## Guardrails

### Feature Flags

1. **Cache Invalidation**: Changes take effect within 30 seconds (staleTime)
2. **Kill Switches**: Critical features have dedicated kill switches for emergencies
3. **Audit Logging**: All flag changes are logged in `AdminAction`
4. **Rollout Safety**: Start with low rollout (10-20%) and gradually increase

### Experiments

1. **No Updates While Running**: Cannot modify variants while experiment is running
2. **No Restart After Stop**: Stopped experiments cannot be restarted
3. **Sticky Assignments**: Users always see the same variant
4. **Minimum Sample Size**: Wait for statistical significance before drawing conclusions

## Best Practices

### Naming Conventions

- Use dot notation for flags: `feature.new_checkout`, `booking.enabled`
- Use kebab-case for experiments: `checkout-redesign`, `pricing-test-2024`

### Rollout Strategy

1. **Internal Testing**: Enable for ADMIN role only
2. **Beta Users**: Add specific users to allow list
3. **Staged Rollout**: 10% → 25% → 50% → 100%
4. **Monitor Metrics**: Watch for errors, performance issues

### Experiment Design

1. **Clear Hypothesis**: Define what you're testing and expected outcome
2. **Single Variable**: Change only one thing per experiment
3. **Sufficient Duration**: Run until statistically significant
4. **Document Results**: Record learnings for future reference

## Examples

### Feature Flag: New Checkout UI

```typescript
// Create flag
await trpc.flags.set.mutate({
  key: "checkout.new_ui",
  description: "New checkout flow with improved UX",
  enabled: true,
  rollout: 20,
  rules: {
    roles: ["ADMIN", "ORGANIZER"],
    cities: ["Mumbai", "Delhi"],
  },
});

// Use in component
function CheckoutPage() {
  const useNewUI = useFlag("checkout.new_ui");
  return useNewUI ? <NewCheckout /> : <OldCheckout />;
}
```

### A/B Test: Pricing Display

```typescript
// Create experiment
await trpc.experiments.create.mutate({
  key: "pricing-display-test",
  description: "Test showing fees upfront vs at checkout",
  variants: [
    { name: "control", weight: 50 },
    { name: "upfront-fees", weight: 50 },
  ],
});

// Launch experiment
await trpc.experiments.launch.mutate({ key: "pricing-display-test" });

// Use in component
function PricingSection() {
  const { data } = trpc.experiments.assign.useMutation();
  
  if (data?.variant === "upfront-fees") {
    return <UpfrontFeePricing />;
  }
  return <StandardPricing />;
}
```

## Troubleshooting

### Flag Not Working

1. Check if flag exists and is enabled
2. Verify user meets targeting rules
3. Check rollout percentage (user may not be in rollout)
4. Clear cache and refresh (30s staleTime)

### Experiment Not Assigning

1. Verify experiment status is RUNNING
2. Check if user is logged in (userId required)
3. Look for existing assignment (sticky)

### Metrics Not Updating

1. Ensure exposure events are being logged
2. Check date range in metrics query
3. Verify booking/click events have correct userId
