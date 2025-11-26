import { describe, it, expect } from "vitest";
import {
  computeJaccardSimilarity,
  computeCosineSimilarity,
  filterExpiredAndBooked,
} from "../candidates";
import type { EventCandidate } from "../types";

describe("computeJaccardSimilarity", () => {
  it("should return 1 for identical sets", () => {
    const catFreq1 = { COMEDY: 5, MUSIC: 3 };
    const catFreq2 = { COMEDY: 3, MUSIC: 2 };

    const similarity = computeJaccardSimilarity(catFreq1, catFreq2);
    expect(similarity).toBe(1);
  });

  it("should return 0 for completely different sets", () => {
    const catFreq1 = { COMEDY: 5, MUSIC: 3 };
    const catFreq2 = { TECH: 3, SPORTS: 2 };

    const similarity = computeJaccardSimilarity(catFreq1, catFreq2);
    expect(similarity).toBe(0);
  });

  it("should return value between 0 and 1 for partial overlap", () => {
    const catFreq1 = { COMEDY: 5, MUSIC: 3, TECH: 1 };
    const catFreq2 = { COMEDY: 3, SPORTS: 2 };

    const similarity = computeJaccardSimilarity(catFreq1, catFreq2);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it("should handle empty sets", () => {
    const catFreq1 = {};
    const catFreq2 = { COMEDY: 3 };

    const similarity = computeJaccardSimilarity(catFreq1, catFreq2);
    expect(similarity).toBe(0);
  });
});

describe("computeCosineSimilarity", () => {
  it("should return 1 for identical price bands", () => {
    const similarity = computeCosineSimilarity(50000, 50000);
    expect(similarity).toBe(1);
  });

  it("should return high similarity for close prices", () => {
    const similarity = computeCosineSimilarity(50000, 55000);
    expect(similarity).toBeGreaterThan(0.8);
  });

  it("should return lower similarity for different price bands", () => {
    const lowPrice = 10000; // 100 INR - budget
    const highPrice = 500000; // 5000 INR - premium

    const similarity = computeCosineSimilarity(lowPrice, highPrice);
    expect(similarity).toBeLessThan(0.5);
  });

  it("should handle zero prices", () => {
    const similarity = computeCosineSimilarity(0, 50000);
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });
});

describe("filterExpiredAndBooked", () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates: EventCandidate[] = [
    {
      id: "event-1",
      title: "Future Event",
      category: "COMEDY",
      city: "Mumbai",
      venue: "Club",
      date: tomorrow,
      price: 50000,
      totalSeats: 100,
      bookedSeats: 50,
      organizerId: "org-1",
    },
    {
      id: "event-2",
      title: "Past Event",
      category: "MUSIC",
      city: "Delhi",
      venue: "Hall",
      date: yesterday,
      price: 50000,
      totalSeats: 100,
      bookedSeats: 50,
      organizerId: "org-2",
    },
    {
      id: "event-3",
      title: "Another Future Event",
      category: "TECH",
      city: "Bangalore",
      venue: "Center",
      date: tomorrow,
      price: 50000,
      totalSeats: 100,
      bookedSeats: 50,
      organizerId: "org-3",
    },
  ];

  it("should filter out expired events", () => {
    const bookedEventIds: string[] = [];
    const filtered = filterExpiredAndBooked(candidates, bookedEventIds);

    expect(filtered.length).toBe(2);
    expect(filtered.find((e) => e.id === "event-2")).toBeUndefined();
  });

  it("should filter out already booked events", () => {
    const bookedEventIds = ["event-1"];
    const filtered = filterExpiredAndBooked(candidates, bookedEventIds);

    expect(filtered.length).toBe(1);
    expect(filtered.find((e) => e.id === "event-1")).toBeUndefined();
    expect(filtered.find((e) => e.id === "event-3")).toBeDefined();
  });

  it("should filter out both expired and booked events", () => {
    const bookedEventIds = ["event-3"];
    const filtered = filterExpiredAndBooked(candidates, bookedEventIds);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("event-1");
  });

  it("should return empty array when all events are filtered", () => {
    const bookedEventIds = ["event-1", "event-3"];
    const filtered = filterExpiredAndBooked(candidates, bookedEventIds);

    expect(filtered.length).toBe(0);
  });
});
