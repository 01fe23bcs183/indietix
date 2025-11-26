import type { SearchFilters } from "./types.js";

/**
 * Category synonyms mapping
 */
export const CATEGORY_MAP: Record<string, string> = {
  // Comedy
  comedy: "comedy",
  standup: "comedy",
  "stand-up": "comedy",
  "stand up": "comedy",
  comic: "comedy",
  funny: "comedy",
  laugh: "comedy",
  jokes: "comedy",

  // Music
  music: "music",
  concert: "music",
  gig: "music",
  band: "music",
  live: "music",
  acoustic: "music",
  jazz: "music",
  rock: "music",
  indie: "music",
  classical: "music",

  // Theatre
  theatre: "theatre",
  theater: "theatre",
  play: "theatre",
  drama: "theatre",
  musical: "theatre",
  stage: "theatre",

  // Workshop
  workshop: "workshop",
  class: "workshop",
  course: "workshop",
  learn: "workshop",
  training: "workshop",

  // Art
  art: "art",
  exhibition: "art",
  gallery: "art",
  painting: "art",
  sculpture: "art",

  // Food & Drink
  food: "food",
  foodie: "food",
  culinary: "food",
  tasting: "food",
  wine: "food",
  beer: "food",

  // Sports
  sports: "sports",
  fitness: "sports",
  yoga: "sports",
  marathon: "sports",
  run: "sports",

  // Networking
  networking: "networking",
  meetup: "networking",
  conference: "networking",
  seminar: "networking",

  // Open Mic
  "open mic": "open-mic",
  openmic: "open-mic",
  "open-mic": "open-mic",
  mic: "open-mic",

  // Party
  party: "party",
  club: "party",
  nightlife: "party",
  dj: "party",
  dance: "party",
};

/**
 * Area aliases for Bengaluru
 */
export const AREA_ALIASES: Record<string, { area: string; city: string }> = {
  // Indiranagar
  indiranagar: { area: "Indiranagar", city: "Bengaluru" },
  indira: { area: "Indiranagar", city: "Bengaluru" },
  "indira nagar": { area: "Indiranagar", city: "Bengaluru" },

  // Koramangala
  koramangala: { area: "Koramangala", city: "Bengaluru" },
  kora: { area: "Koramangala", city: "Bengaluru" },
  kormangala: { area: "Koramangala", city: "Bengaluru" },

  // HSR Layout
  hsr: { area: "HSR Layout", city: "Bengaluru" },
  "hsr layout": { area: "HSR Layout", city: "Bengaluru" },

  // Whitefield
  whitefield: { area: "Whitefield", city: "Bengaluru" },

  // Jayanagar
  jayanagar: { area: "Jayanagar", city: "Bengaluru" },
  jp: { area: "JP Nagar", city: "Bengaluru" },
  "jp nagar": { area: "JP Nagar", city: "Bengaluru" },

  // Marathahalli
  marathahalli: { area: "Marathahalli", city: "Bengaluru" },
  marathon: { area: "Marathahalli", city: "Bengaluru" },

  // Electronic City
  "electronic city": { area: "Electronic City", city: "Bengaluru" },
  ec: { area: "Electronic City", city: "Bengaluru" },

  // MG Road
  "mg road": { area: "MG Road", city: "Bengaluru" },
  mg: { area: "MG Road", city: "Bengaluru" },

  // Brigade Road
  brigade: { area: "Brigade Road", city: "Bengaluru" },
  "brigade road": { area: "Brigade Road", city: "Bengaluru" },

  // Malleshwaram
  malleshwaram: { area: "Malleshwaram", city: "Bengaluru" },
  malleswaram: { area: "Malleshwaram", city: "Bengaluru" },

  // Rajajinagar
  rajajinagar: { area: "Rajajinagar", city: "Bengaluru" },

  // Yelahanka
  yelahanka: { area: "Yelahanka", city: "Bengaluru" },

  // Hebbal
  hebbal: { area: "Hebbal", city: "Bengaluru" },

  // BTM Layout
  btm: { area: "BTM Layout", city: "Bengaluru" },
  "btm layout": { area: "BTM Layout", city: "Bengaluru" },

  // Bannerghatta
  bannerghatta: { area: "Bannerghatta", city: "Bengaluru" },
  "bannerghatta road": { area: "Bannerghatta Road", city: "Bengaluru" },

  // Sarjapur
  sarjapur: { area: "Sarjapur", city: "Bengaluru" },
  "sarjapur road": { area: "Sarjapur Road", city: "Bengaluru" },

  // Bellandur
  bellandur: { area: "Bellandur", city: "Bengaluru" },

  // City aliases
  bangalore: { area: "", city: "Bengaluru" },
  bengaluru: { area: "", city: "Bengaluru" },
  blr: { area: "", city: "Bengaluru" },
};

/**
 * Time window patterns
 */
const TIME_PATTERNS: Record<
  string,
  "morning" | "afternoon" | "evening" | "night"
> = {
  morning: "morning",
  am: "morning",
  breakfast: "morning",

  afternoon: "afternoon",
  lunch: "afternoon",
  noon: "afternoon",

  evening: "evening",
  eve: "evening",
  sunset: "evening",

  night: "night",
  late: "night",
  midnight: "night",
  pm: "evening",
};

/**
 * Day patterns for date parsing
 */
const DAY_PATTERNS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Parse price from text
 */
function parsePrice(text: string): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};

  // Match "under X" or "below X" or "< X"
  const underMatch = text.match(
    /(?:under|below|<|less than)\s*(?:rs\.?|₹|inr)?\s*(\d+)/i
  );
  if (underMatch) {
    result.max = parseInt(underMatch[1], 10);
  }

  // Match "above X" or "over X" or "> X"
  const aboveMatch = text.match(
    /(?:above|over|>|more than)\s*(?:rs\.?|₹|inr)?\s*(\d+)/i
  );
  if (aboveMatch) {
    result.min = parseInt(aboveMatch[1], 10);
  }

  // Match range "X-Y" or "X to Y" or "₹X–₹Y"
  const rangeMatch = text.match(
    /(?:rs\.?|₹|inr)?\s*(\d+)\s*(?:[-–—]|to)\s*(?:rs\.?|₹|inr)?\s*(\d+)/i
  );
  if (rangeMatch) {
    result.min = parseInt(rangeMatch[1], 10);
    result.max = parseInt(rangeMatch[2], 10);
  }

  // Match exact price "₹X" or "rs X"
  if (!result.min && !result.max) {
    const exactMatch = text.match(/(?:rs\.?|₹|inr)\s*(\d+)/i);
    if (exactMatch) {
      const price = parseInt(exactMatch[1], 10);
      result.min = price;
      result.max = price;
    }
  }

  return result;
}

/**
 * Parse date from text
 */
function parseDate(text: string): { start?: string; end?: string } {
  const result: { start?: string; end?: string } = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerText = text.toLowerCase();

  // Today
  if (lowerText.includes("today") || lowerText.includes("tonight")) {
    result.start = today.toISOString().split("T")[0];
    result.end = today.toISOString().split("T")[0];
    return result;
  }

  // Tomorrow
  if (lowerText.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.start = tomorrow.toISOString().split("T")[0];
    result.end = tomorrow.toISOString().split("T")[0];
    return result;
  }

  // This weekend
  if (lowerText.includes("weekend") || lowerText.includes("this weekend")) {
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    result.start = saturday.toISOString().split("T")[0];
    result.end = sunday.toISOString().split("T")[0];
    return result;
  }

  // This week
  if (lowerText.includes("this week")) {
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

    result.start = today.toISOString().split("T")[0];
    result.end = endOfWeek.toISOString().split("T")[0];
    return result;
  }

  // Next week
  if (lowerText.includes("next week")) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (8 - today.getDay()));
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    result.start = nextMonday.toISOString().split("T")[0];
    result.end = nextSunday.toISOString().split("T")[0];
    return result;
  }

  // Specific day of week
  for (const [dayName, dayNum] of Object.entries(DAY_PATTERNS)) {
    if (lowerText.includes(dayName)) {
      const currentDay = today.getDay();
      let daysUntil = dayNum - currentDay;
      if (daysUntil <= 0) daysUntil += 7;

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);

      result.start = targetDate.toISOString().split("T")[0];
      result.end = targetDate.toISOString().split("T")[0];
      return result;
    }
  }

  return result;
}

/**
 * Parse natural language query into structured filters
 */
export function parseNaturalLanguageQuery(query: string): SearchFilters {
  const filters: SearchFilters = {};
  const lowerQuery = query.toLowerCase().trim();
  const tokens = lowerQuery.split(/\s+/);
  const usedTokens = new Set<number>();

  // Parse category (check multi-word phrases first)
  for (const [synonym, category] of Object.entries(CATEGORY_MAP)) {
    if (lowerQuery.includes(synonym)) {
      filters.category = category;
      // Mark tokens as used
      const synonymTokens = synonym.split(/\s+/);
      for (let i = 0; i < tokens.length; i++) {
        if (synonymTokens.includes(tokens[i])) {
          usedTokens.add(i);
        }
      }
      break;
    }
  }

  // Parse area/city (check multi-word phrases first)
  for (const [alias, location] of Object.entries(AREA_ALIASES)) {
    if (lowerQuery.includes(alias)) {
      if (location.area) {
        filters.area = location.area;
      }
      filters.city = location.city;
      // Mark tokens as used
      const aliasTokens = alias.split(/\s+/);
      for (let i = 0; i < tokens.length; i++) {
        if (aliasTokens.includes(tokens[i])) {
          usedTokens.add(i);
        }
      }
      break;
    }
  }

  // Parse price
  const priceResult = parsePrice(lowerQuery);
  if (priceResult.min !== undefined) {
    filters.minPrice = priceResult.min;
  }
  if (priceResult.max !== undefined) {
    filters.maxPrice = priceResult.max;
  }

  // Parse date
  const dateResult = parseDate(lowerQuery);
  if (dateResult.start) {
    filters.dateStart = dateResult.start;
  }
  if (dateResult.end) {
    filters.dateEnd = dateResult.end;
  }

  // Parse time window
  for (const [pattern, window] of Object.entries(TIME_PATTERNS)) {
    if (lowerQuery.includes(pattern)) {
      filters.startTimeWindow = window;
      break;
    }
  }

  // Extract remaining tokens as free text query
  const freeTextTokens: string[] = [];
  const skipWords = new Set([
    "near",
    "in",
    "at",
    "on",
    "for",
    "the",
    "a",
    "an",
    "and",
    "or",
    "under",
    "below",
    "above",
    "over",
    "to",
    "from",
    "with",
    "today",
    "tonight",
    "tomorrow",
    "weekend",
    "week",
    "next",
    "morning",
    "afternoon",
    "evening",
    "night",
    "am",
    "pm",
    "rs",
    "inr",
    "₹",
  ]);

  for (let i = 0; i < tokens.length; i++) {
    if (
      !usedTokens.has(i) &&
      !skipWords.has(tokens[i]) &&
      !/^\d+$/.test(tokens[i])
    ) {
      freeTextTokens.push(tokens[i]);
    }
  }

  if (freeTextTokens.length > 0) {
    filters.freeTextQuery = freeTextTokens.join(" ");
  }

  return filters;
}

/**
 * Validate and normalize filters
 */
export function normalizeFilters(
  filters: Partial<SearchFilters>
): SearchFilters {
  const normalized: SearchFilters = {};

  if (filters.category) {
    normalized.category = filters.category.toLowerCase();
  }

  if (filters.dateStart) {
    normalized.dateStart = filters.dateStart;
  }

  if (filters.dateEnd) {
    normalized.dateEnd = filters.dateEnd;
  }

  if (filters.minPrice !== undefined && filters.minPrice >= 0) {
    normalized.minPrice = filters.minPrice;
  }

  if (filters.maxPrice !== undefined && filters.maxPrice >= 0) {
    normalized.maxPrice = filters.maxPrice;
  }

  if (filters.area) {
    normalized.area = filters.area;
  }

  if (filters.city) {
    normalized.city = filters.city;
  }

  if (filters.startTimeWindow) {
    normalized.startTimeWindow = filters.startTimeWindow;
  }

  if (filters.freeTextQuery) {
    normalized.freeTextQuery = filters.freeTextQuery.trim();
  }

  return normalized;
}

/**
 * Merge parsed filters with explicit filters (explicit takes precedence)
 */
export function mergeFilters(
  parsed: SearchFilters,
  explicit: Partial<SearchFilters>
): SearchFilters {
  return {
    ...parsed,
    ...Object.fromEntries(
      Object.entries(explicit).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    ),
  };
}
