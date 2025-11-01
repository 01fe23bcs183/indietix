import { describe, it, expect } from "vitest";
import {
  computeRefund,
  canCancelBooking,
  DEFAULT_REFUND_POLICY,
} from "../refund";

describe("Refund Calculations", () => {
  describe("computeRefund", () => {
    it("should calculate refund correctly for ₹199 ticket before deadline", () => {
      const now = new Date("2025-11-01T10:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = computeRefund({
        baseTicketPrice: 19900,
        qty: 1,
        policy: DEFAULT_REFUND_POLICY,
        now,
        eventStart,
        deadlineHours: 24,
      });

      expect(result.refundableAmount).toBe(19900 - 50);
      expect(result.nonRefundableBreakdown.cancellationFee).toBe(50);
    });

    it("should calculate refund correctly for ₹500 ticket with 3 quantity", () => {
      const now = new Date("2025-11-01T10:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = computeRefund({
        baseTicketPrice: 50000,
        qty: 3,
        policy: DEFAULT_REFUND_POLICY,
        now,
        eventStart,
        deadlineHours: 24,
      });

      expect(result.refundableAmount).toBe(150000 - 50);
      expect(result.nonRefundableBreakdown.cancellationFee).toBe(50);
      expect(result.nonRefundableBreakdown.paymentGateway).toBe(2 * 3);
      expect(result.nonRefundableBreakdown.serverMaintenance).toBe(2 * 3);
      expect(result.nonRefundableBreakdown.platformSupport).toBe(10 * 3);
    });

    it("should return zero refund after deadline without late refund policy", () => {
      const now = new Date("2025-11-03T17:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = computeRefund({
        baseTicketPrice: 50000,
        qty: 1,
        policy: DEFAULT_REFUND_POLICY,
        now,
        eventStart,
        deadlineHours: 24,
      });

      expect(result.refundableAmount).toBe(0);
      expect(result.message).toContain("Past cancellation deadline");
    });

    it("should return zero refund after event has started", () => {
      const now = new Date("2025-11-03T19:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = computeRefund({
        baseTicketPrice: 50000,
        qty: 1,
        policy: DEFAULT_REFUND_POLICY,
        now,
        eventStart,
        deadlineHours: 24,
      });

      expect(result.refundableAmount).toBe(0);
      expect(result.message).toContain("Event has already started");
    });

    it("should handle custom cancellation fee", () => {
      const now = new Date("2025-11-01T10:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = computeRefund({
        baseTicketPrice: 99900,
        qty: 1,
        policy: {
          cancellationFeeFlat: 10000,
          allowLateRefundPercent: null,
        },
        now,
        eventStart,
        deadlineHours: 24,
      });

      expect(result.refundableAmount).toBe(99900 - 10000);
      expect(result.nonRefundableBreakdown.cancellationFee).toBe(10000);
    });

    it("should handle late refund with percentage", () => {
      const now = new Date("2025-11-03T17:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = computeRefund({
        baseTicketPrice: 50000,
        qty: 1,
        policy: {
          cancellationFeeFlat: 50,
          allowLateRefundPercent: 50,
        },
        now,
        eventStart,
        deadlineHours: 24,
      });

      expect(result.refundableAmount).toBe(25000 - 50);
      expect(result.message).toContain("50%");
    });

    it("should not return negative refund amount", () => {
      const now = new Date("2025-11-01T10:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = computeRefund({
        baseTicketPrice: 10,
        qty: 1,
        policy: {
          cancellationFeeFlat: 5000,
          allowLateRefundPercent: null,
        },
        now,
        eventStart,
        deadlineHours: 24,
      });

      expect(result.refundableAmount).toBe(0);
    });
  });

  describe("canCancelBooking", () => {
    it("should allow cancellation before deadline", () => {
      const now = new Date("2025-11-01T10:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = canCancelBooking({
        now,
        eventStart,
        deadlineHours: 24,
        allowCancellation: true,
      });

      expect(result.canCancel).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should not allow cancellation if allowCancellation is false", () => {
      const now = new Date("2025-11-01T10:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = canCancelBooking({
        now,
        eventStart,
        deadlineHours: 24,
        allowCancellation: false,
      });

      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain("not allowed");
    });

    it("should not allow cancellation after deadline", () => {
      const now = new Date("2025-11-03T17:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = canCancelBooking({
        now,
        eventStart,
        deadlineHours: 24,
        allowCancellation: true,
      });

      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain("Past cancellation deadline");
    });

    it("should not allow cancellation after event has started", () => {
      const now = new Date("2025-11-03T19:00:00Z");
      const eventStart = new Date("2025-11-03T18:00:00Z");

      const result = canCancelBooking({
        now,
        eventStart,
        deadlineHours: 24,
        allowCancellation: true,
      });

      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain("already started");
    });
  });
});
