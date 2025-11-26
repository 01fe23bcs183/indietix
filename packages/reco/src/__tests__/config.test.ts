import { describe, it, expect } from "vitest";
import {
  getPriceBand,
  getTimeSlot,
  DEFAULT_WEIGHTS,
  DEFAULT_CONFIG,
  getConfig,
} from "../config";

describe("getPriceBand", () => {
  it("should return budget for price 0", () => {
    expect(getPriceBand(0)).toBe("budget");
  });

  it("should return budget for prices under 500 INR", () => {
    expect(getPriceBand(10000)).toBe("budget"); // 100 INR
    expect(getPriceBand(49900)).toBe("budget"); // 499 INR
  });

  it("should return mid for prices 500-1500 INR", () => {
    expect(getPriceBand(50000)).toBe("mid"); // 500 INR
    expect(getPriceBand(100000)).toBe("mid"); // 1000 INR
    expect(getPriceBand(149900)).toBe("mid"); // 1499 INR
  });

  it("should return premium for prices 1500-3000 INR", () => {
    expect(getPriceBand(150000)).toBe("premium"); // 1500 INR
    expect(getPriceBand(299900)).toBe("premium"); // 2999 INR
  });

  it("should return luxury for prices over 3000 INR", () => {
    expect(getPriceBand(300000)).toBe("luxury"); // 3000 INR
    expect(getPriceBand(1000000)).toBe("luxury"); // 10000 INR
  });
});

describe("getTimeSlot", () => {
  it("should return morning for hours 6-12", () => {
    expect(getTimeSlot(9)).toBe("morning");
    expect(getTimeSlot(6)).toBe("morning");
    expect(getTimeSlot(11)).toBe("morning");
  });

  it("should return afternoon for hours 12-17", () => {
    expect(getTimeSlot(12)).toBe("afternoon");
    expect(getTimeSlot(14)).toBe("afternoon");
    expect(getTimeSlot(16)).toBe("afternoon");
  });

  it("should return evening for hours 17-21", () => {
    expect(getTimeSlot(17)).toBe("evening");
    expect(getTimeSlot(19)).toBe("evening");
    expect(getTimeSlot(20)).toBe("evening");
  });

  it("should return night for hours 21-6", () => {
    expect(getTimeSlot(21)).toBe("night");
    expect(getTimeSlot(23)).toBe("night");
    expect(getTimeSlot(2)).toBe("night");
    expect(getTimeSlot(5)).toBe("night");
  });
});

describe("DEFAULT_WEIGHTS", () => {
  it("should have all required weight properties", () => {
    expect(DEFAULT_WEIGHTS).toHaveProperty("category");
    expect(DEFAULT_WEIGHTS).toHaveProperty("price");
    expect(DEFAULT_WEIGHTS).toHaveProperty("area");
    expect(DEFAULT_WEIGHTS).toHaveProperty("recency");
    expect(DEFAULT_WEIGHTS).toHaveProperty("popularity");
  });

  it("should have weights that sum to approximately 1", () => {
    const sum =
      DEFAULT_WEIGHTS.category +
      DEFAULT_WEIGHTS.price +
      DEFAULT_WEIGHTS.area +
      DEFAULT_WEIGHTS.recency +
      DEFAULT_WEIGHTS.popularity;

    expect(sum).toBeCloseTo(1, 1);
  });

  it("should have all weights between 0 and 1", () => {
    expect(DEFAULT_WEIGHTS.category).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WEIGHTS.category).toBeLessThanOrEqual(1);
    expect(DEFAULT_WEIGHTS.price).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WEIGHTS.price).toBeLessThanOrEqual(1);
    expect(DEFAULT_WEIGHTS.area).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WEIGHTS.area).toBeLessThanOrEqual(1);
    expect(DEFAULT_WEIGHTS.recency).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WEIGHTS.recency).toBeLessThanOrEqual(1);
    expect(DEFAULT_WEIGHTS.popularity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WEIGHTS.popularity).toBeLessThanOrEqual(1);
  });
});

describe("DEFAULT_CONFIG", () => {
  it("should have all required config properties", () => {
    expect(DEFAULT_CONFIG).toHaveProperty("weights");
    expect(DEFAULT_CONFIG).toHaveProperty("maxRecosPerUser");
    expect(DEFAULT_CONFIG).toHaveProperty("coldStartMinBookings");
    expect(DEFAULT_CONFIG).toHaveProperty("mfProvider");
  });

  it("should have reasonable default values", () => {
    expect(DEFAULT_CONFIG.maxRecosPerUser).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.maxRecosPerUser).toBeLessThanOrEqual(100);
    expect(DEFAULT_CONFIG.coldStartMinBookings).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.mfProvider).toBe("none");
  });
});

describe("getConfig", () => {
  it("should return default config when no overrides provided", () => {
    const config = getConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("should merge overrides with default config", () => {
    const config = getConfig({ maxRecosPerUser: 10 });
    expect(config.maxRecosPerUser).toBe(10);
    expect(config.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("should allow overriding mfProvider", () => {
    const config = getConfig({ mfProvider: "local" });
    expect(config.mfProvider).toBe("local");
  });

  it("should allow overriding weights", () => {
    const customWeights = { ...DEFAULT_WEIGHTS, category: 0.5 };
    const config = getConfig({ weights: customWeights });
    expect(config.weights.category).toBe(0.5);
  });
});
