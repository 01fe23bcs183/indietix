import { describe, it, expect } from "vitest";
import { buildSegmentWhereClause, validateSegmentQuery } from "../segments";

describe("Segment Query Engine", () => {
  describe("buildSegmentWhereClause", () => {
    it("should build where clause for city filter", () => {
      const query = { city: "Bengaluru" };
      const where = buildSegmentWhereClause(query);

      expect(where).toEqual({
        bookings: {
          some: {
            event: {
              city: "Bengaluru",
            },
          },
        },
      });
    });

    it("should build where clause for categories filter", () => {
      const query = { categories: ["COMEDY", "MUSIC"] };
      const where = buildSegmentWhereClause(query);

      expect(where).toEqual({
        bookings: {
          some: {
            event: {
              category: {
                in: ["COMEDY", "MUSIC"],
              },
            },
          },
        },
      });
    });

    it("should build where clause for attended_in_last_days filter", () => {
      const now = new Date("2025-11-02");
      const query = { attended_in_last_days: 180 };
      const where = buildSegmentWhereClause(query, { now });

      expect(where).toHaveProperty("bookings");
      expect(where.bookings).toHaveProperty("some");
      const some = (where.bookings as { some: unknown }).some as Record<
        string,
        unknown
      >;
      expect(some.status).toBe("CONFIRMED");
      expect(some.event).toHaveProperty("date");
    });

    it("should build where clause for price_ceiling filter", () => {
      const query = { price_ceiling: 60000 };
      const where = buildSegmentWhereClause(query);

      expect(where).toEqual({
        bookings: {
          some: {
            event: {
              price: {
                lte: 60000,
              },
            },
          },
        },
      });
    });

    it("should return empty where clause for empty query", () => {
      const query = {};
      const where = buildSegmentWhereClause(query);

      expect(where).toEqual({});
    });
  });

  describe("validateSegmentQuery", () => {
    it("should validate valid query with city", () => {
      const query = { city: "Bengaluru" };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should validate valid query with categories", () => {
      const query = { categories: ["COMEDY", "MUSIC"] };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should validate valid query with attended_in_last_days", () => {
      const query = { attended_in_last_days: 180 };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should validate valid query with price_ceiling", () => {
      const query = { price_ceiling: 60000 };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should reject non-object query", () => {
      const query = "invalid";
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Query must be an object");
    });

    it("should reject invalid city type", () => {
      const query = { city: 123 };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("city must be a string");
    });

    it("should reject invalid categories type", () => {
      const query = { categories: "COMEDY" };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("categories must be an array");
    });

    it("should reject invalid categories array elements", () => {
      const query = { categories: ["COMEDY", 123] };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("categories must be an array of strings");
    });

    it("should reject invalid attended_in_last_days type", () => {
      const query = { attended_in_last_days: "180" };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("attended_in_last_days must be a number");
    });

    it("should reject negative attended_in_last_days", () => {
      const query = { attended_in_last_days: -10 };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("attended_in_last_days must be positive");
    });

    it("should reject invalid price_ceiling type", () => {
      const query = { price_ceiling: "600" };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("price_ceiling must be a number");
    });

    it("should reject negative price_ceiling", () => {
      const query = { price_ceiling: -100 };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("price_ceiling must be positive");
    });

    it("should collect multiple errors", () => {
      const query = {
        city: 123,
        categories: "invalid",
        attended_in_last_days: -10,
      };
      const result = validateSegmentQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(1);
    });
  });
});
