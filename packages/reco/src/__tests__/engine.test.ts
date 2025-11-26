import { describe, it, expect } from "vitest";
import { scoreCandidate, scoreAllCandidates } from "../engine";
import { DEFAULT_CONFIG } from "../config";
import type { EventCandidate, UserProfileVector } from "../types";

describe("scoreCandidate", () => {
  const baseProfile: UserProfileVector = {
    catFreq: { COMEDY: 5, MUSIC: 3, TECH: 2 },
    priceP50: 50000, // 500 INR
    preferredAreas: ["Mumbai", "Pune"],
    timeSlots: ["evening"],
  };

  const baseCandidate: EventCandidate = {
    id: "event-1",
    title: "Comedy Night",
    category: "COMEDY",
    city: "Mumbai",
    venue: "Comedy Club",
    date: new Date(),
    price: 50000,
    totalSeats: 100,
    bookedSeats: 50,
    organizerId: "org-1",
  };

  it("should return a score between 0 and 1", () => {
    const result = scoreCandidate(
      baseCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("should give higher score for matching category", () => {
    const comedyCandidate = { ...baseCandidate, category: "COMEDY" };
    const techCandidate = { ...baseCandidate, category: "TECH" };
    const otherCandidate = { ...baseCandidate, category: "SPORTS" };

    const comedyResult = scoreCandidate(
      comedyCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );
    const techResult = scoreCandidate(
      techCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );
    const otherResult = scoreCandidate(
      otherCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );

    expect(comedyResult.score).toBeGreaterThan(techResult.score);
    expect(techResult.score).toBeGreaterThan(otherResult.score);
  });

  it("should give higher score for matching area", () => {
    const mumbaiCandidate = { ...baseCandidate, city: "Mumbai" };
    const delhiCandidate = { ...baseCandidate, city: "Delhi" };

    const mumbaiResult = scoreCandidate(
      mumbaiCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );
    const delhiResult = scoreCandidate(
      delhiCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );

    expect(mumbaiResult.score).toBeGreaterThan(delhiResult.score);
  });

  it("should give higher score for similar price band", () => {
    const similarPriceCandidate = { ...baseCandidate, price: 55000 }; // 550 INR
    const expensiveCandidate = { ...baseCandidate, price: 500000 }; // 5000 INR

    const similarResult = scoreCandidate(
      similarPriceCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );
    const expensiveResult = scoreCandidate(
      expensiveCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );

    expect(similarResult.score).toBeGreaterThan(expensiveResult.score);
  });

  it("should give higher score for more recent events", () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const soonCandidate = { ...baseCandidate, date: nextWeek };
    const laterCandidate = { ...baseCandidate, date: nextMonth };

    const soonResult = scoreCandidate(
      soonCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );
    const laterResult = scoreCandidate(
      laterCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );

    expect(soonResult.score).toBeGreaterThan(laterResult.score);
  });

  it("should give higher score for more popular events", () => {
    const popularCandidate = {
      ...baseCandidate,
      bookedSeats: 90,
      totalSeats: 100,
    };
    const unpopularCandidate = {
      ...baseCandidate,
      bookedSeats: 10,
      totalSeats: 100,
    };

    const popularResult = scoreCandidate(
      popularCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );
    const unpopularResult = scoreCandidate(
      unpopularCandidate,
      baseProfile,
      0,
      [],
      DEFAULT_CONFIG
    );

    expect(popularResult.score).toBeGreaterThan(unpopularResult.score);
  });
});

describe("scoreAllCandidates", () => {
  const profile: UserProfileVector = {
    catFreq: { COMEDY: 5 },
    priceP50: 50000,
    preferredAreas: ["Mumbai"],
    timeSlots: ["evening"],
  };

  const candidates: EventCandidate[] = [
    {
      id: "event-1",
      title: "Comedy Night",
      category: "COMEDY",
      city: "Mumbai",
      venue: "Club",
      date: new Date(),
      price: 50000,
      totalSeats: 100,
      bookedSeats: 50,
      organizerId: "org-1",
    },
    {
      id: "event-2",
      title: "Tech Talk",
      category: "TECH",
      city: "Delhi",
      venue: "Hall",
      date: new Date(),
      price: 100000,
      totalSeats: 100,
      bookedSeats: 10,
      organizerId: "org-2",
    },
    {
      id: "event-3",
      title: "Music Fest",
      category: "MUSIC",
      city: "Mumbai",
      venue: "Stadium",
      date: new Date(),
      price: 50000,
      totalSeats: 100,
      bookedSeats: 80,
      organizerId: "org-3",
    },
  ];

  it("should return candidates sorted by score descending", () => {
    const similarUserScores = new Map<
      string,
      { score: number; userIds: string[] }
    >();
    const scored = scoreAllCandidates(
      candidates,
      profile,
      similarUserScores,
      DEFAULT_CONFIG
    );

    expect(scored.length).toBe(3);
    expect(scored[0].score).toBeGreaterThanOrEqual(scored[1].score);
    expect(scored[1].score).toBeGreaterThanOrEqual(scored[2].score);
  });

  it("should respect limit parameter", () => {
    const config = { ...DEFAULT_CONFIG, maxRecosPerUser: 2 };
    const similarUserScores = new Map<
      string,
      { score: number; userIds: string[] }
    >();
    const scored = scoreAllCandidates(
      candidates,
      profile,
      similarUserScores,
      config
    );

    expect(scored.length).toBe(2);
  });

  it("should include reason for each recommendation", () => {
    const similarUserScores = new Map<
      string,
      { score: number; userIds: string[] }
    >();
    const scored = scoreAllCandidates(
      candidates,
      profile,
      similarUserScores,
      DEFAULT_CONFIG
    );

    for (const reco of scored) {
      expect(reco.reason).toBeDefined();
      expect(reco.reason.type).toBeDefined();
    }
  });

  it("should boost score for similar user recommendations", () => {
    const similarUserScores = new Map<
      string,
      { score: number; userIds: string[] }
    >();
    similarUserScores.set("event-2", {
      score: 5,
      userIds: ["user-1", "user-2"],
    });

    const scoredWithSimilar = scoreAllCandidates(
      candidates,
      profile,
      similarUserScores,
      DEFAULT_CONFIG
    );
    const scoredWithoutSimilar = scoreAllCandidates(
      candidates,
      profile,
      new Map(),
      DEFAULT_CONFIG
    );

    const event2WithSimilar = scoredWithSimilar.find(
      (r) => r.eventId === "event-2"
    );
    const event2WithoutSimilar = scoredWithoutSimilar.find(
      (r) => r.eventId === "event-2"
    );

    expect(event2WithSimilar?.score).toBeGreaterThan(
      event2WithoutSimilar?.score ?? 0
    );
  });
});
