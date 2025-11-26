import { describe, it, expect } from "vitest";
import {
  calculateRecencyBoost,
  normalizeScore,
  calculateCombinedScore,
  cosineSimilarity,
  reRankWithEmbeddings,
  DEFAULT_WEIGHTS,
  WEIGHTS_NO_EMBEDDINGS,
} from "../src/rank.js";

describe("calculateRecencyBoost", () => {
  it("should return 1.0 for events today", () => {
    const today = new Date();
    const boost = calculateRecencyBoost(today, today);
    expect(boost).toBe(1.0);
  });

  it("should return high boost for events in next 7 days", () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const boost = calculateRecencyBoost(nextWeek, today);
    expect(boost).toBeGreaterThan(0.5);
    expect(boost).toBeLessThan(1.0);
  });

  it("should return moderate boost for events in 14 days", () => {
    const today = new Date();
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    const boost = calculateRecencyBoost(twoWeeks, today);
    expect(boost).toBeCloseTo(0.5, 1);
  });

  it("should return lower boost for events beyond 14 days", () => {
    const today = new Date();
    const threeWeeks = new Date(today);
    threeWeeks.setDate(today.getDate() + 21);
    const boost = calculateRecencyBoost(threeWeeks, today);
    expect(boost).toBeLessThan(0.5);
    expect(boost).toBeGreaterThan(0.3);
  });

  it("should return decay for past events", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const boost = calculateRecencyBoost(yesterday, today);
    expect(boost).toBeLessThan(0.3);
    expect(boost).toBeGreaterThan(0);
  });

  it("should return near-zero for events far in the past", () => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    const boost = calculateRecencyBoost(monthAgo, today);
    expect(boost).toBeLessThan(0.1);
  });
});

describe("normalizeScore", () => {
  it("should normalize to 0-1 range", () => {
    expect(normalizeScore(50, 0, 100)).toBe(0.5);
    expect(normalizeScore(0, 0, 100)).toBe(0);
    expect(normalizeScore(100, 0, 100)).toBe(1);
  });

  it("should clamp values outside range", () => {
    expect(normalizeScore(-10, 0, 100)).toBe(0);
    expect(normalizeScore(150, 0, 100)).toBe(1);
  });

  it("should handle equal min and max", () => {
    expect(normalizeScore(50, 50, 50)).toBe(0.5);
  });
});

describe("calculateCombinedScore", () => {
  it("should calculate weighted score with default weights", () => {
    const components = {
      ftsRank: 0.8,
      trigramSimilarity: 0.6,
      recencyBoost: 0.9,
      embeddingSimilarity: 0.7,
    };
    const score = calculateCombinedScore(components, DEFAULT_WEIGHTS);

    const expected =
      0.4 * 0.8 + // ftsRank
      0.25 * 0.6 + // trigramSimilarity
      0.2 * 0.9 + // recencyBoost
      0.15 * 0.7; // embeddingSimilarity

    expect(score).toBeCloseTo(expected, 5);
  });

  it("should calculate score without embeddings", () => {
    const components = {
      ftsRank: 0.8,
      trigramSimilarity: 0.6,
      recencyBoost: 0.9,
    };
    const score = calculateCombinedScore(components, WEIGHTS_NO_EMBEDDINGS);

    const expected =
      0.5 * 0.8 + // ftsRank
      0.3 * 0.6 + // trigramSimilarity
      0.2 * 0.9; // recencyBoost

    expect(score).toBeCloseTo(expected, 5);
  });

  it("should handle zero components", () => {
    const components = {
      ftsRank: 0,
      trigramSimilarity: 0,
      recencyBoost: 0,
      embeddingSimilarity: 0,
    };
    const score = calculateCombinedScore(components);
    expect(score).toBe(0);
  });
});

describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  it("should return 0 for orthogonal vectors", () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
  });

  it("should return -1 for opposite vectors", () => {
    const vec1 = [1, 2, 3];
    const vec2 = [-1, -2, -3];
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
  });

  it("should handle normalized vectors", () => {
    const vec1 = [0.6, 0.8];
    const vec2 = [0.8, 0.6];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it("should throw for vectors of different lengths", () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2];
    expect(() => cosineSimilarity(vec1, vec2)).toThrow();
  });

  it("should return 0 for zero vectors", () => {
    const vec1 = [0, 0, 0];
    const vec2 = [1, 2, 3];
    expect(cosineSimilarity(vec1, vec2)).toBe(0);
  });
});

describe("reRankWithEmbeddings", () => {
  it("should re-rank results by combined score", () => {
    const results = [
      {
        id: "1",
        ftsRank: 0.9,
        trigramSimilarity: 0.8,
        recencyBoost: 0.5,
        embedding: [1, 0, 0],
      },
      {
        id: "2",
        ftsRank: 0.7,
        trigramSimilarity: 0.6,
        recencyBoost: 0.9,
        embedding: [0, 1, 0],
      },
      {
        id: "3",
        ftsRank: 0.5,
        trigramSimilarity: 0.4,
        recencyBoost: 0.7,
        embedding: [0.7, 0.7, 0],
      },
    ];
    const queryEmbedding = [0.7, 0.7, 0];

    const ranked = reRankWithEmbeddings(results, queryEmbedding);

    expect(ranked).toHaveLength(3);
    expect(ranked[0].components.embeddingSimilarity).toBeDefined();
    // Results should be sorted by score
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
  });

  it("should handle results without embeddings", () => {
    const results = [
      { id: "1", ftsRank: 0.9, trigramSimilarity: 0.8, recencyBoost: 0.5 },
      { id: "2", ftsRank: 0.7, trigramSimilarity: 0.6, recencyBoost: 0.9 },
    ];
    const queryEmbedding = [1, 0, 0];

    const ranked = reRankWithEmbeddings(results, queryEmbedding);

    expect(ranked).toHaveLength(2);
    expect(ranked[0].components.embeddingSimilarity).toBe(0);
  });
});

describe("DEFAULT_WEIGHTS", () => {
  it("should sum to approximately 1", () => {
    const sum =
      DEFAULT_WEIGHTS.ftsRank +
      DEFAULT_WEIGHTS.trigramSimilarity +
      DEFAULT_WEIGHTS.recencyBoost +
      DEFAULT_WEIGHTS.embeddingSimilarity;
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe("WEIGHTS_NO_EMBEDDINGS", () => {
  it("should sum to 1 without embedding weight", () => {
    const sum =
      WEIGHTS_NO_EMBEDDINGS.ftsRank +
      WEIGHTS_NO_EMBEDDINGS.trigramSimilarity +
      WEIGHTS_NO_EMBEDDINGS.recencyBoost;
    expect(sum).toBeCloseTo(1, 5);
  });

  it("should have zero embedding weight", () => {
    expect(WEIGHTS_NO_EMBEDDINGS.embeddingSimilarity).toBe(0);
  });
});
