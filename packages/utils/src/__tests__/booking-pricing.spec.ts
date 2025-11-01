import { describe, it, expect } from "vitest";
import { computeBookingAmounts, FEES } from "../pricing";

describe("computeBookingAmounts", () => {
  it("should compute correct amounts for 1 ticket", () => {
    const result = computeBookingAmounts(500, 1);

    expect(result.ticketPrice).toBe(500);
    expect(result.seats).toBe(1);
    expect(result.subtotal).toBe(500);
    expect(result.convenienceFee).toBe(14); // (2 + 2 + 10) * 1
    expect(result.platformFee).toBe(14);
    expect(result.gst).toBe(3); // Math.round(14 * 0.18)
    expect(result.finalAmount).toBe(517); // 500 + 14 + 3
  });

  it("should compute correct amounts for 2 tickets", () => {
    const result = computeBookingAmounts(500, 2);

    expect(result.ticketPrice).toBe(500);
    expect(result.seats).toBe(2);
    expect(result.subtotal).toBe(1000);
    expect(result.convenienceFee).toBe(28); // (2 + 2 + 10) * 2
    expect(result.platformFee).toBe(28);
    expect(result.gst).toBe(5); // Math.round(28 * 0.18)
    expect(result.finalAmount).toBe(1033); // 1000 + 28 + 5
  });

  it("should compute correct amounts for 5 tickets", () => {
    const result = computeBookingAmounts(1000, 5);

    expect(result.ticketPrice).toBe(1000);
    expect(result.seats).toBe(5);
    expect(result.subtotal).toBe(5000);
    expect(result.convenienceFee).toBe(70); // (2 + 2 + 10) * 5
    expect(result.platformFee).toBe(70);
    expect(result.gst).toBe(13); // Math.round(70 * 0.18)
    expect(result.finalAmount).toBe(5083); // 5000 + 70 + 13
  });

  it("should have correct breakdown structure", () => {
    const result = computeBookingAmounts(500, 2);

    expect(result.breakdown).toEqual({
      paymentGateway: FEES.paymentGateway * 2,
      serverMaintenance: FEES.serverMaintenance * 2,
      platformSupport: FEES.platformSupport * 2,
    });
  });

  it("should handle zero price tickets", () => {
    const result = computeBookingAmounts(0, 3);

    expect(result.subtotal).toBe(0);
    expect(result.convenienceFee).toBe(42); // Fees still apply
    expect(result.finalAmount).toBeGreaterThan(0);
  });
});
