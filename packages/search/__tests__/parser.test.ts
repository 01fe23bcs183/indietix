import { describe, it, expect } from "vitest";
import {
  parseNaturalLanguageQuery,
  normalizeFilters,
  mergeFilters,
  CATEGORY_MAP,
  AREA_ALIASES,
} from "../src/parser.js";

describe("parseNaturalLanguageQuery", () => {
  describe("category parsing", () => {
    it('should parse "comedy" category', () => {
      const result = parseNaturalLanguageQuery("comedy tonight");
      expect(result.category).toBe("comedy");
    });

    it('should parse "standup" as comedy', () => {
      const result = parseNaturalLanguageQuery("standup show");
      expect(result.category).toBe("comedy");
    });

    it('should parse "music" category', () => {
      const result = parseNaturalLanguageQuery("music concert");
      expect(result.category).toBe("music");
    });

    it('should parse "open mic" category', () => {
      const result = parseNaturalLanguageQuery("open mic friday");
      expect(result.category).toBe("open-mic");
    });

    it('should parse "workshop" category', () => {
      const result = parseNaturalLanguageQuery("pottery workshop");
      expect(result.category).toBe("workshop");
    });
  });

  describe("area parsing", () => {
    it('should parse "indiranagar" area', () => {
      const result = parseNaturalLanguageQuery("events near indiranagar");
      expect(result.area).toBe("Indiranagar");
      expect(result.city).toBe("Bengaluru");
    });

    it('should parse "koramangala" area', () => {
      const result = parseNaturalLanguageQuery("comedy in koramangala");
      expect(result.area).toBe("Koramangala");
      expect(result.city).toBe("Bengaluru");
    });

    it('should parse "hsr" as HSR Layout', () => {
      const result = parseNaturalLanguageQuery("music hsr");
      expect(result.area).toBe("HSR Layout");
    });

    it('should parse "bangalore" as city only', () => {
      const result = parseNaturalLanguageQuery("events in bangalore");
      expect(result.city).toBe("Bengaluru");
      expect(result.area).toBeUndefined();
    });
  });

  describe("price parsing", () => {
    it('should parse "under 600"', () => {
      const result = parseNaturalLanguageQuery("comedy under 600");
      expect(result.maxPrice).toBe(600);
    });

    it('should parse "below 500"', () => {
      const result = parseNaturalLanguageQuery("events below 500");
      expect(result.maxPrice).toBe(500);
    });

    it('should parse "above 300"', () => {
      const result = parseNaturalLanguageQuery("premium events above 300");
      expect(result.minPrice).toBe(300);
    });

    it('should parse price range "300-700"', () => {
      const result = parseNaturalLanguageQuery("music 300-700");
      expect(result.minPrice).toBe(300);
      expect(result.maxPrice).toBe(700);
    });

    it("should parse price range with rupee symbol", () => {
      const result = parseNaturalLanguageQuery("events ₹300–₹700");
      expect(result.minPrice).toBe(300);
      expect(result.maxPrice).toBe(700);
    });
  });

  describe("date parsing", () => {
    it('should parse "today"', () => {
      const result = parseNaturalLanguageQuery("comedy today");
      const today = new Date().toISOString().split("T")[0];
      expect(result.dateStart).toBe(today);
      expect(result.dateEnd).toBe(today);
    });

    it('should parse "tonight"', () => {
      const result = parseNaturalLanguageQuery("events tonight");
      const today = new Date().toISOString().split("T")[0];
      expect(result.dateStart).toBe(today);
    });

    it('should parse "tomorrow"', () => {
      const result = parseNaturalLanguageQuery("music tomorrow");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.dateStart).toBe(tomorrow.toISOString().split("T")[0]);
    });

    it('should parse "this weekend"', () => {
      const result = parseNaturalLanguageQuery("events this weekend");
      expect(result.dateStart).toBeDefined();
      expect(result.dateEnd).toBeDefined();
    });

    it('should parse day of week "friday"', () => {
      const result = parseNaturalLanguageQuery("open mic friday");
      expect(result.dateStart).toBeDefined();
    });
  });

  describe("time window parsing", () => {
    it('should parse "evening"', () => {
      const result = parseNaturalLanguageQuery("comedy evening");
      expect(result.startTimeWindow).toBe("evening");
    });

    it('should parse "morning"', () => {
      const result = parseNaturalLanguageQuery("yoga morning");
      expect(result.startTimeWindow).toBe("morning");
    });

    it('should parse "night"', () => {
      const result = parseNaturalLanguageQuery("party night");
      expect(result.startTimeWindow).toBe("night");
    });
  });

  describe("complex queries", () => {
    it('should parse "comedy tonight under 600 near indiranagar"', () => {
      const result = parseNaturalLanguageQuery(
        "comedy tonight under 600 near indiranagar"
      );
      expect(result.category).toBe("comedy");
      expect(result.maxPrice).toBe(600);
      expect(result.area).toBe("Indiranagar");
      expect(result.dateStart).toBeDefined();
    });

    it('should parse "music this weekend ₹300–₹700 koramangala"', () => {
      const result = parseNaturalLanguageQuery(
        "music this weekend ₹300–₹700 koramangala"
      );
      expect(result.category).toBe("music");
      expect(result.minPrice).toBe(300);
      expect(result.maxPrice).toBe(700);
      expect(result.area).toBe("Koramangala");
    });

    it('should parse "open mic friday evening"', () => {
      const result = parseNaturalLanguageQuery("open mic friday evening");
      expect(result.category).toBe("open-mic");
      expect(result.startTimeWindow).toBe("evening");
      expect(result.dateStart).toBeDefined();
    });
  });
});

describe("normalizeFilters", () => {
  it("should normalize category to lowercase", () => {
    const result = normalizeFilters({ category: "COMEDY" });
    expect(result.category).toBe("comedy");
  });

  it("should keep valid price values", () => {
    const result = normalizeFilters({ minPrice: 100, maxPrice: 500 });
    expect(result.minPrice).toBe(100);
    expect(result.maxPrice).toBe(500);
  });

  it("should filter out negative prices", () => {
    const result = normalizeFilters({ minPrice: -100 });
    expect(result.minPrice).toBeUndefined();
  });

  it("should trim freeTextQuery", () => {
    const result = normalizeFilters({ freeTextQuery: "  test query  " });
    expect(result.freeTextQuery).toBe("test query");
  });
});

describe("mergeFilters", () => {
  it("should merge parsed and explicit filters", () => {
    const parsed = { category: "comedy", area: "Indiranagar" };
    const explicit = { maxPrice: 500 };
    const result = mergeFilters(parsed, explicit);
    expect(result.category).toBe("comedy");
    expect(result.area).toBe("Indiranagar");
    expect(result.maxPrice).toBe(500);
  });

  it("should let explicit filters override parsed", () => {
    const parsed = { category: "comedy", maxPrice: 1000 };
    const explicit = { maxPrice: 500 };
    const result = mergeFilters(parsed, explicit);
    expect(result.maxPrice).toBe(500);
  });

  it("should ignore undefined explicit values", () => {
    const parsed = { category: "comedy" };
    const explicit = { maxPrice: undefined };
    const result = mergeFilters(parsed, explicit);
    expect(result.category).toBe("comedy");
    expect(result.maxPrice).toBeUndefined();
  });
});

describe("CATEGORY_MAP", () => {
  it("should have all expected categories", () => {
    expect(CATEGORY_MAP["comedy"]).toBe("comedy");
    expect(CATEGORY_MAP["standup"]).toBe("comedy");
    expect(CATEGORY_MAP["music"]).toBe("music");
    expect(CATEGORY_MAP["concert"]).toBe("music");
    expect(CATEGORY_MAP["theatre"]).toBe("theatre");
    expect(CATEGORY_MAP["workshop"]).toBe("workshop");
    expect(CATEGORY_MAP["open mic"]).toBe("open-mic");
  });
});

describe("AREA_ALIASES", () => {
  it("should have Bengaluru areas", () => {
    expect(AREA_ALIASES["indiranagar"].area).toBe("Indiranagar");
    expect(AREA_ALIASES["koramangala"].area).toBe("Koramangala");
    expect(AREA_ALIASES["hsr"].area).toBe("HSR Layout");
    expect(AREA_ALIASES["bangalore"].city).toBe("Bengaluru");
  });
});
