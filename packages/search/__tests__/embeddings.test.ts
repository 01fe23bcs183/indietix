import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEmbeddingProvider,
  getEmbeddingConfig,
  isEmbeddingsEnabled,
  createEventEmbeddingText,
  EMBEDDING_DIMENSION,
} from "../src/embeddings.js";

describe("getEmbeddingProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return "none" when SEARCH_EMBEDDINGS_PROVIDER is "none"', () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "none";
    expect(getEmbeddingProvider()).toBe("none");
  });

  it('should return "local" when SEARCH_EMBEDDINGS_PROVIDER is "local"', () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "local";
    expect(getEmbeddingProvider()).toBe("local");
  });

  it('should return "remote" when SEARCH_EMBEDDINGS_PROVIDER is "remote"', () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "remote";
    expect(getEmbeddingProvider()).toBe("remote");
  });

  it('should return "none" in CI environment by default', () => {
    delete process.env.SEARCH_EMBEDDINGS_PROVIDER;
    process.env.CI = "true";
    expect(getEmbeddingProvider()).toBe("none");
  });

  it('should return "local" in development by default', () => {
    delete process.env.SEARCH_EMBEDDINGS_PROVIDER;
    delete process.env.CI;
    process.env.NODE_ENV = "development";
    expect(getEmbeddingProvider()).toBe("local");
  });

  it('should return "local" in production by default', () => {
    delete process.env.SEARCH_EMBEDDINGS_PROVIDER;
    delete process.env.CI;
    process.env.NODE_ENV = "production";
    expect(getEmbeddingProvider()).toBe("local");
  });
});

describe("getEmbeddingConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return config with provider", () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "local";
    const config = getEmbeddingConfig();
    expect(config.provider).toBe("local");
  });

  it("should include remote API settings when set", () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "remote";
    process.env.SEARCH_EMBEDDINGS_API_KEY = "test-key";
    process.env.SEARCH_EMBEDDINGS_API_URL = "https://api.example.com";
    process.env.SEARCH_EMBEDDINGS_RATE_LIMIT = "100";

    const config = getEmbeddingConfig();
    expect(config.remoteApiKey).toBe("test-key");
    expect(config.remoteApiUrl).toBe("https://api.example.com");
    expect(config.rateLimitPerMinute).toBe(100);
  });

  it("should default rate limit to 60", () => {
    delete process.env.SEARCH_EMBEDDINGS_RATE_LIMIT;
    const config = getEmbeddingConfig();
    expect(config.rateLimitPerMinute).toBe(60);
  });
});

describe("isEmbeddingsEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return false when provider is "none"', () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "none";
    expect(isEmbeddingsEnabled()).toBe(false);
  });

  it('should return true when provider is "local"', () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "local";
    expect(isEmbeddingsEnabled()).toBe(true);
  });

  it('should return true when provider is "remote"', () => {
    process.env.SEARCH_EMBEDDINGS_PROVIDER = "remote";
    expect(isEmbeddingsEnabled()).toBe(true);
  });

  it("should return false in CI by default", () => {
    delete process.env.SEARCH_EMBEDDINGS_PROVIDER;
    process.env.CI = "true";
    expect(isEmbeddingsEnabled()).toBe(false);
  });
});

describe("createEventEmbeddingText", () => {
  it("should combine event fields into text", () => {
    const event = {
      title: "Comedy Night",
      description: "A night of laughter",
      venue: "The Laugh Store",
      category: "comedy",
      tags: ["standup", "funny"],
    };

    const text = createEventEmbeddingText(event);

    expect(text).toContain("Comedy Night");
    expect(text).toContain("A night of laughter");
    expect(text).toContain("The Laugh Store");
    expect(text).toContain("comedy");
    expect(text).toContain("standup");
    expect(text).toContain("funny");
  });

  it("should handle missing tags", () => {
    const event = {
      title: "Music Concert",
      description: "Live music",
      venue: "The Arena",
      category: "music",
    };

    const text = createEventEmbeddingText(event);

    expect(text).toContain("Music Concert");
    expect(text).toContain("Live music");
  });

  it("should truncate to 512 characters", () => {
    const event = {
      title: "A".repeat(200),
      description: "B".repeat(200),
      venue: "C".repeat(200),
      category: "D".repeat(100),
      tags: ["E".repeat(100)],
    };

    const text = createEventEmbeddingText(event);

    expect(text.length).toBeLessThanOrEqual(512);
  });

  it("should filter out empty values", () => {
    const event = {
      title: "Test Event",
      description: "",
      venue: "Test Venue",
      category: "test",
      tags: [],
    };

    const text = createEventEmbeddingText(event);

    expect(text).toBe("Test Event Test Venue test");
  });
});

describe("EMBEDDING_DIMENSION", () => {
  it("should be 384 for MiniLM model", () => {
    expect(EMBEDDING_DIMENSION).toBe(384);
  });
});
