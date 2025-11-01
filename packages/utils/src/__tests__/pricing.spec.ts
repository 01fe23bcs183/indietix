import { describe, it, expect } from "vitest";
import { computeTotals, FEES, GST_RATE } from "../pricing";

describe("computeTotals", () => {
  it("calculates correct totals for ₹199 ticket", () => {
    const result = computeTotals(199);
    
    expect(result.subtotal).toBe(199);
    expect(result.fees).toBe(14);
    expect(result.breakdown.paymentGateway).toBe(2);
    expect(result.breakdown.serverMaintenance).toBe(2);
    expect(result.breakdown.platformSupport).toBe(10);
    expect(result.gst).toBe(3);
    expect(result.total).toBe(216);
  });

  it("calculates correct totals for ₹500 ticket", () => {
    const result = computeTotals(500);
    
    expect(result.subtotal).toBe(500);
    expect(result.fees).toBe(14);
    expect(result.breakdown.paymentGateway).toBe(2);
    expect(result.breakdown.serverMaintenance).toBe(2);
    expect(result.breakdown.platformSupport).toBe(10);
    expect(result.gst).toBe(3);
    expect(result.total).toBe(517);
  });

  it("calculates correct totals for ₹999 ticket", () => {
    const result = computeTotals(999);
    
    expect(result.subtotal).toBe(999);
    expect(result.fees).toBe(14);
    expect(result.breakdown.paymentGateway).toBe(2);
    expect(result.breakdown.serverMaintenance).toBe(2);
    expect(result.breakdown.platformSupport).toBe(10);
    expect(result.gst).toBe(3);
    expect(result.total).toBe(1016);
  });

  it("rounds GST correctly", () => {
    const result = computeTotals(1000);
    const expectedGst = Math.round(14 * 0.18);
    
    expect(result.gst).toBe(expectedGst);
    expect(result.gst).toBe(3);
  });

  it("uses correct fee configuration", () => {
    expect(FEES.paymentGateway).toBe(2);
    expect(FEES.serverMaintenance).toBe(2);
    expect(FEES.platformSupport).toBe(10);
    expect(GST_RATE).toBe(0.18);
  });

  it("calculates correct total formula", () => {
    const basePrice = 1500;
    const result = computeTotals(basePrice);
    
    const expectedFees = FEES.paymentGateway + FEES.serverMaintenance + FEES.platformSupport;
    const expectedGst = Math.round(expectedFees * GST_RATE);
    const expectedTotal = basePrice + expectedFees + expectedGst;
    
    expect(result.fees).toBe(expectedFees);
    expect(result.gst).toBe(expectedGst);
    expect(result.total).toBe(expectedTotal);
  });
});
