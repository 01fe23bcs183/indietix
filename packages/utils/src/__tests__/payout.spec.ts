import { describe, it, expect, vi, beforeEach } from "vitest";
import { computePayoutAmount, formatPayoutForCSV } from "../payout";

describe("Payout Calculations", () => {
  describe("computePayoutAmount", () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        event: {
          findMany: vi.fn(),
        },
        booking: {
          findMany: vi.fn(),
        },
      };
    });

    it("should calculate payout correctly with confirmed bookings", async () => {
      mockPrisma.event.findMany.mockResolvedValue([
        { id: "event1" },
        { id: "event2" },
      ]);

      mockPrisma.booking.findMany
        .mockResolvedValueOnce([
          {
            ticketPrice: 1000,
            seats: 2,
            convenienceFee: 28,
            platformFee: 28,
          },
          {
            ticketPrice: 500,
            seats: 1,
            convenienceFee: 14,
            platformFee: 14,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await computePayoutAmount(
        {
          organizerId: "org1",
          periodStart: new Date("2024-01-01"),
          periodEnd: new Date("2024-01-31"),
        },
        mockPrisma
      );

      expect(result.gmv).toBe(2500); // (1000*2) + (500*1)
      expect(result.refunds).toBe(0);
      expect(result.feesKept).toBe(84); // (28+28) + (14+14)
      expect(result.netPayable).toBe(2416); // 2500 - 0 - 84
      expect(result.bookingCount).toBe(2);
      expect(result.refundCount).toBe(0);
    });

    it("should handle refunds correctly", async () => {
      mockPrisma.event.findMany.mockResolvedValue([{ id: "event1" }]);

      mockPrisma.booking.findMany
        .mockResolvedValueOnce([
          {
            ticketPrice: 1000,
            seats: 2,
            convenienceFee: 28,
            platformFee: 28,
          },
        ])
        .mockResolvedValueOnce([
          {
            ticketPrice: 500,
            seats: 1,
            refunds: [{ status: "SUCCEEDED", amount: 450 }],
          },
        ]);

      const result = await computePayoutAmount(
        {
          organizerId: "org1",
          periodStart: new Date("2024-01-01"),
          periodEnd: new Date("2024-01-31"),
        },
        mockPrisma
      );

      expect(result.gmv).toBe(2000); // 1000*2
      expect(result.refunds).toBe(450);
      expect(result.feesKept).toBe(56); // 28+28
      expect(result.netPayable).toBe(1494); // 2000 - 450 - 56
      expect(result.refundCount).toBe(1);
    });

    it("should return zero payout for organizer with no events", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await computePayoutAmount(
        {
          organizerId: "org1",
          periodStart: new Date("2024-01-01"),
          periodEnd: new Date("2024-01-31"),
        },
        mockPrisma
      );

      expect(result.gmv).toBe(0);
      expect(result.refunds).toBe(0);
      expect(result.feesKept).toBe(0);
      expect(result.netPayable).toBe(0);
      expect(result.eventCount).toBe(0);
      expect(result.bookingCount).toBe(0);
    });

    it("should ensure non-negative net payable", async () => {
      mockPrisma.event.findMany.mockResolvedValue([{ id: "event1" }]);

      mockPrisma.booking.findMany
        .mockResolvedValueOnce([
          {
            ticketPrice: 100,
            seats: 1,
            convenienceFee: 50,
            platformFee: 50,
          },
        ])
        .mockResolvedValueOnce([
          {
            ticketPrice: 100,
            seats: 1,
            refunds: [{ status: "SUCCEEDED", amount: 90 }],
          },
        ]);

      const result = await computePayoutAmount(
        {
          organizerId: "org1",
          periodStart: new Date("2024-01-01"),
          periodEnd: new Date("2024-01-31"),
        },
        mockPrisma
      );

      expect(result.netPayable).toBe(0);
    });

    it("should handle multiple refunds for same booking", async () => {
      mockPrisma.event.findMany.mockResolvedValue([{ id: "event1" }]);

      mockPrisma.booking.findMany
        .mockResolvedValueOnce([
          {
            ticketPrice: 1000,
            seats: 1,
            convenienceFee: 14,
            platformFee: 14,
          },
        ])
        .mockResolvedValueOnce([
          {
            ticketPrice: 500,
            seats: 1,
            refunds: [
              { status: "SUCCEEDED", amount: 200 },
              { status: "SUCCEEDED", amount: 100 },
              { status: "FAILED", amount: 50 }, // Should be ignored
            ],
          },
        ]);

      const result = await computePayoutAmount(
        {
          organizerId: "org1",
          periodStart: new Date("2024-01-01"),
          periodEnd: new Date("2024-01-31"),
        },
        mockPrisma
      );

      expect(result.refunds).toBe(300); // Only SUCCEEDED refunds
      expect(result.netPayable).toBe(672); // 1000 - 300 - 28
    });
  });

  describe("formatPayoutForCSV", () => {
    it("should format payout correctly for CSV export", () => {
      const payout = {
        beneficiaryName: "Test Organizer",
        accountMasked: "XXXX1234",
        amount: 50000, // in paise
        providerPayoutId: "px_fake_123",
      };

      const result = formatPayoutForCSV(payout);

      expect(result.beneficiary_name).toBe("Test Organizer");
      expect(result.account).toBe("XXXX1234");
      expect(result.ifsc).toBe("N/A");
      expect(result.amount).toBe(500); // converted to rupees
      expect(result.utr).toBe("px_fake_123");
    });

    it("should handle missing optional fields", () => {
      const payout = {
        beneficiaryName: "Test Organizer",
        accountMasked: null,
        amount: 50000,
        providerPayoutId: null,
      };

      const result = formatPayoutForCSV(payout);

      expect(result.account).toBe("MASKED");
      expect(result.utr).toBeUndefined();
    });

    it("should convert paise to rupees correctly", () => {
      const payout = {
        beneficiaryName: "Test",
        amount: 123456, // 1234.56 rupees
      };

      const result = formatPayoutForCSV(payout);

      expect(result.amount).toBe(1234.56);
    });
  });
});
