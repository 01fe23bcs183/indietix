# IndieTix Transparent Pricing Model

## Overview

IndieTix implements a fully transparent pricing model that explicitly breaks down all fees for customers. This approach builds trust and ensures customers know exactly what they're paying for when booking event tickets.

## Core Principles

1. **Complete Transparency**: All fees are itemized and clearly labeled
2. **No Hidden Charges**: Every rupee is accounted for in the breakdown
3. **No "Convenience Fee" Language**: We avoid ambiguous terminology that obscures the nature of charges
4. **Customer-First**: Pricing is designed to be fair and understandable

## Pricing Structure

### Base Components

The total price for a ticket consists of three main components:

1. **Ticket Price (Subtotal)**: The base price set by the event organizer
2. **Platform Fees**: Operational costs broken down into specific line items
3. **GST**: Government tax applied only to platform fees

### Fee Breakdown

Platform fees are divided into three transparent categories:

| Fee Type           | Amount  | Purpose                                   |
| ------------------ | ------- | ----------------------------------------- |
| Payment gateway    | ₹2      | Processing online payments securely       |
| Server maintenance | ₹2      | Hosting and infrastructure costs          |
| Platform support   | ₹10     | Customer service and platform development |
| **Total Fees**     | **₹14** |                                           |

### GST Calculation

GST is applied only to the platform fees, not to the ticket price:

- **GST Rate**: 18% (configurable)
- **Calculation**: `GST = round(fees × 0.18)`
- **Applied to**: Platform fees only (₹14)
- **Typical GST**: ₹3 (rounded from ₹2.52)

### Total Calculation Formula

```
subtotal = ticketPrice
fees = paymentGateway + serverMaintenance + platformSupport
gst = round(fees × GST_RATE)
total = subtotal + fees + gst
```

## Examples

### Example 1: ₹199 Ticket

- Ticket Price: ₹199
- Payment gateway: ₹2
- Server maintenance: ₹2
- Platform support: ₹10
- Fees subtotal: ₹14
- GST (18% on fees): ₹3
- **Total: ₹216**

### Example 2: ₹500 Ticket

- Ticket Price: ₹500
- Payment gateway: ₹2
- Server maintenance: ₹2
- Platform support: ₹10
- Fees subtotal: ₹14
- GST (18% on fees): ₹3
- **Total: ₹517**

### Example 3: ₹999 Ticket

- Ticket Price: ₹999
- Payment gateway: ₹2
- Server maintenance: ₹2
- Platform support: ₹10
- Fees subtotal: ₹14
- GST (18% on fees): ₹3
- **Total: ₹1,016**

## Configuration

All pricing parameters are centralized in `packages/utils/src/pricing.ts` for easy adjustment:

```typescript
export const FEES = {
  paymentGateway: 2,
  serverMaintenance: 2,
  platformSupport: 10,
};

export const GST_RATE = 0.18;
```

### Updating Fee Structure

To modify fees:

1. Edit `packages/utils/src/pricing.ts`
2. Update the `FEES` object with new values
3. Adjust `GST_RATE` if tax regulations change
4. Run tests to ensure calculations remain correct: `pnpm -w test`

## Implementation

### Backend (tRPC)

The pricing logic is implemented in the `computeTotals` function:

```typescript
export function computeTotals(basePrice: number): PricingBreakdown {
  const subtotal = basePrice;
  const fees =
    FEES.paymentGateway + FEES.serverMaintenance + FEES.platformSupport;
  const gst = Math.round(fees * GST_RATE);
  const total = subtotal + fees + gst;

  return {
    subtotal,
    fees,
    gst,
    total,
    breakdown: {
      paymentGateway: FEES.paymentGateway,
      serverMaintenance: FEES.serverMaintenance,
      platformSupport: FEES.platformSupport,
    },
  };
}
```

### Frontend (UI Component)

The `PriceBreakdown` component displays the transparent fee structure:

```typescript
<PriceBreakdown
  basePrice={ticketPrice}
  feesConfig={FEES}
  gstRate={GST_RATE}
/>
```

## Testing

Pricing calculations are thoroughly tested in `packages/utils/src/__tests__/pricing.spec.ts`:

- Correctness for various ticket prices (₹199, ₹500, ₹999)
- GST rounding accuracy
- Total calculation formula validation
- Configuration value verification

Run tests with:

```bash
pnpm -w test
```

## Rationale

### Why Transparent Pricing?

1. **Trust Building**: Customers appreciate knowing exactly what they're paying for
2. **Competitive Advantage**: Differentiates IndieTix from platforms with hidden fees
3. **Regulatory Compliance**: Aligns with consumer protection guidelines
4. **Customer Satisfaction**: Reduces booking abandonment due to surprise charges

### Why Avoid "Convenience Fee"?

The term "convenience fee" has negative connotations:

- Often perceived as arbitrary or excessive
- Doesn't explain what the fee covers
- Creates customer frustration and distrust

Instead, we use specific, descriptive labels:

- "Payment gateway" clearly indicates payment processing costs
- "Server maintenance" explains infrastructure expenses
- "Platform support" covers customer service and development

### Why Fixed Fees Instead of Percentage?

For lower-priced tickets (₹199-₹999), fixed fees are more equitable:

- Percentage-based fees would be too low to cover costs on cheap tickets
- Percentage-based fees would be excessive on expensive tickets
- Fixed fees provide predictable revenue for platform sustainability
- Customers can easily calculate total costs

## Future Considerations

### Potential Adjustments

1. **Tiered Pricing**: Different fee structures for different price ranges
2. **Organizer Pass-Through**: Option for organizers to absorb platform fees
3. **Bulk Discounts**: Reduced per-ticket fees for large group bookings
4. **Premium Features**: Additional optional services with separate fees

### Monitoring

Track these metrics to evaluate pricing effectiveness:

- Booking conversion rate
- Cart abandonment rate
- Customer feedback on pricing transparency
- Comparison with competitor fee structures

## Support

For questions about pricing implementation or configuration:

- Technical: Review `packages/utils/src/pricing.ts`
- Business: Contact platform management
- Customer-facing: See FAQ and help documentation

---

**Last Updated**: November 2025  
**Version**: 1.0  
**Owner**: IndieTix Platform Team
