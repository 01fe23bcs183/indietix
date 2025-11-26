import { describe, it, expect } from "vitest";
import { computeBookingAmounts } from "../pricing";

describe("Pricing with Discounts", () => {
  describe("computeBookingAmounts", () => {
    it("should calculate booking amounts without discount", () => {
      const result = computeBookingAmounts(50000, 2);

      expect(result.ticketPrice).toBe(50000);
      expect(result.seats).toBe(2);
      expect(result.subtotal).toBe(100000);
      expect(result.discountAmount).toBeUndefined();
      expect(result.discountedSubtotal).toBeUndefined();
      expect(result.convenienceFee).toBe(28); // (2+2+10) * 2
      expect(result.platformFee).toBe(28);
      expect(result.gst).toBe(5); // 18% of 28
      expect(result.finalAmount).toBe(100033); // 100000 + 28 + 5
    });

    it("should calculate booking amounts with discount", () => {
      const discountAmount = 20000; // ₹200 discount
      const result = computeBookingAmounts(50000, 2, discountAmount);

      expect(result.ticketPrice).toBe(50000);
      expect(result.seats).toBe(2);
      expect(result.subtotal).toBe(100000);
      expect(result.discountAmount).toBe(20000);
      expect(result.discountedSubtotal).toBe(80000);
      expect(result.convenienceFee).toBe(28); // Fees still on 2 tickets
      expect(result.platformFee).toBe(28);
      expect(result.gst).toBe(5); // 18% of 28
      expect(result.finalAmount).toBe(80033); // 80000 + 28 + 5
    });

    it("should apply discount before fees calculation", () => {
      const discountAmount = 50000; // ₹500 discount
      const result = computeBookingAmounts(100000, 1, discountAmount);

      expect(result.subtotal).toBe(100000);
      expect(result.discountedSubtotal).toBe(50000);
      expect(result.convenienceFee).toBe(14); // (2+2+10) * 1
      expect(result.finalAmount).toBe(50017); // 50000 + 14 + 3
    });

    it("should handle 100% discount", () => {
      const discountAmount = 100000;
      const result = computeBookingAmounts(50000, 2, discountAmount);

      expect(result.subtotal).toBe(100000);
      expect(result.discountedSubtotal).toBe(0);
      expect(result.finalAmount).toBe(33); // Only fees + GST
    });

    it("should calculate fees on quantity, not discounted subtotal", () => {
      const discountAmount = 90000; // Large discount
      const result = computeBookingAmounts(50000, 2, discountAmount);

      expect(result.convenienceFee).toBe(28); // (2+2+10) * 2
      expect(result.finalAmount).toBe(10033); // 10000 + 28 + 5
    });
  });
});
