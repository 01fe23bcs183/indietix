import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@indietix/db';

/**
 * Search filters interface
 */
export interface SearchFilters {
  category?: string;
  dateStart?: string;
  dateEnd?: string;
  maxPrice?: number;
  minPrice?: number;
  area?: string;
  city?: string;
  startTimeWindow?: 'morning' | 'afternoon' | 'evening' | 'night';
  freeTextQuery?: string;
}

/**
 * Score components interface
 */
export interface ScoreComponents {
  ftsRank: number;
  trigramSimilarity: number;
  recencyBoost: number;
  embeddingSimilarity?: number;
}

/**
 * Search result interface
 */
export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  venue: string;
  city: string;
  category: string;
  date: Date;
  price: number;
  score: number;
  scoreComponents?: ScoreComponents;
}

/**
 * Suggest result interface
 */
export interface SuggestResult {
  type: 'event' | 'venue' | 'city';
  value: string;
  slug?: string;
}

/**
 * Weights for scoring without embeddings
 */
const WEIGHTS_NO_EMBEDDINGS = {
  fts: 0.4,
  trigram: 0.3,
  recency: 0.3,
  embedding: 0,
};

/**
 * Parse natural language query into filters
 */
function parseNaturalLanguageQuery(query: string): SearchFilters {
  const filters: SearchFilters = {};
  const lowerQuery = query.toLowerCase();
  
  // Category detection
  const categoryMap: Record<string, string> = {
    'comedy': 'COMEDY',
    'standup': 'COMEDY',
    'stand-up': 'COMEDY',
    'music': 'MUSIC',
    'concert': 'MUSIC',
    'live music': 'MUSIC',
    'sports': 'SPORTS',
    'tech': 'TECH',
    'technology': 'TECH',
    'food': 'FOOD',
    'art': 'ART',
  };
  
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lowerQuery.includes(keyword)) {
      filters.category = category;
      break;
    }
  }
  
  // Date detection
  const today = new Date();
  if (lowerQuery.includes('today')) {
    filters.dateStart = today.toISOString().split('T')[0];
    filters.dateEnd = today.toISOString().split('T')[0];
  } else if (lowerQuery.includes('tonight')) {
    filters.dateStart = today.toISOString().split('T')[0];
    filters.dateEnd = today.toISOString().split('T')[0];
    filters.startTimeWindow = 'evening';
  } else if (lowerQuery.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    filters.dateStart = tomorrow.toISOString().split('T')[0];
    filters.dateEnd = tomorrow.toISOString().split('T')[0];
  } else if (lowerQuery.includes('this weekend')) {
    const dayOfWeek = today.getDay();
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + (6 - dayOfWeek));
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    filters.dateStart = saturday.toISOString().split('T')[0];
    filters.dateEnd = sunday.toISOString().split('T')[0];
  }
  
  // Price detection
  const priceMatch = lowerQuery.match(/under\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
  if (priceMatch && priceMatch[1]) {
    filters.maxPrice = parseInt(priceMatch[1], 10);
  }
  
  const priceRangeMatch = lowerQuery.match(/(?:₹|rs\.?|inr)?\s*(\d+)\s*[-–]\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
  if (priceRangeMatch && priceRangeMatch[1] && priceRangeMatch[2]) {
    filters.minPrice = parseInt(priceRangeMatch[1], 10);
    filters.maxPrice = parseInt(priceRangeMatch[2], 10);
  }
  
  // City detection (Bengaluru areas)
  const areaAliases: Record<string, string> = {
    'indiranagar': 'Bengaluru',
    'koramangala': 'Bengaluru',
    'hsr': 'Bengaluru',
    'whitefield': 'Bengaluru',
    'jp nagar': 'Bengaluru',
    'jayanagar': 'Bengaluru',
    'malleshwaram': 'Bengaluru',
    'bangalore': 'Bengaluru',
    'bengaluru': 'Bengaluru',
  };
  
  for (const [area, city] of Object.entries(areaAliases)) {
    if (lowerQuery.includes(area)) {
      filters.city = city;
      break;
    }
  }
  
  // Extract remaining text as free text query
  let freeText = query;
  // Remove detected keywords
  for (const keyword of Object.keys(categoryMap)) {
    freeText = freeText.replace(new RegExp(keyword, 'gi'), '');
  }
  freeText = freeText.replace(/today|tonight|tomorrow|this weekend/gi, '');
  freeText = freeText.replace(/under\s*(?:₹|rs\.?|inr)?\s*\d+/gi, '');
  freeText = freeText.replace(/(?:₹|rs\.?|inr)?\s*\d+\s*[-–]\s*(?:₹|rs\.?|inr)?\s*\d+/gi, '');
  for (const area of Object.keys(areaAliases)) {
    freeText = freeText.replace(new RegExp(area, 'gi'), '');
  }
  freeText = freeText.replace(/near|in|at/gi, '').trim();
  
  if (freeText.length > 2) {
    filters.freeTextQuery = freeText;
  }
  
  return filters;
}

/**
 * Normalize filters
 */
function normalizeFilters(filters: SearchFilters): SearchFilters {
  return { ...filters };
}

/**
 * Merge filters (explicit takes precedence)
 */
function mergeFilters(parsed: SearchFilters, explicit: SearchFilters): SearchFilters {
  return { ...parsed, ...explicit };
}

/**
 * Calculate recency boost for events
 */
function calculateRecencyBoost(eventDate: Date): number {
  const now = new Date();
  const diffDays = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (diffDays < 0) {
    // Past events get no boost
    return 0;
  } else if (diffDays <= 7) {
    // Events within a week get high boost
    return 1 - (diffDays / 14);
  } else if (diffDays <= 14) {
    // Events within 2 weeks get moderate boost
    return 0.5 - ((diffDays - 7) / 14);
  } else {
    // Events further out get minimal boost
    return Math.max(0, 0.2 - (diffDays / 100));
  }
}

/**
 * Calculate combined score
 */
function calculateCombinedScore(
  components: ScoreComponents,
  weights: typeof WEIGHTS_NO_EMBEDDINGS
): number {
  return (
    components.ftsRank * weights.fts +
    components.trigramSimilarity * weights.trigram +
    components.recencyBoost * weights.recency +
    (components.embeddingSimilarity || 0) * weights.embedding
  );
}

/**
 * Search filters schema
 */
const searchFiltersSchema = z.object({
  category: z.string().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  maxPrice: z.number().optional(),
  minPrice: z.number().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  startTimeWindow: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
  freeTextQuery: z.string().optional(),
});

/**
 * Time window to hour ranges
 */
const TIME_WINDOW_HOURS: Record<string, [number, number]> = {
  morning: [6, 12],
  afternoon: [12, 17],
  evening: [17, 21],
  night: [21, 6],
};

/**
 * Build WHERE conditions from filters
 */
function buildWhereConditions(filters: SearchFilters): {
  where: Record<string, unknown>;
  ftsQuery?: string;
} {
  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
  };
  
  if (filters.category) {
    where.category = { equals: filters.category, mode: 'insensitive' };
  }
  
  if (filters.dateStart || filters.dateEnd) {
    where.date = {};
    if (filters.dateStart) {
      (where.date as Record<string, unknown>).gte = new Date(filters.dateStart);
    }
    if (filters.dateEnd) {
      const endDate = new Date(filters.dateEnd);
      endDate.setHours(23, 59, 59, 999);
      (where.date as Record<string, unknown>).lte = endDate;
    }
  }
  
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) {
      (where.price as Record<string, unknown>).gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      (where.price as Record<string, unknown>).lte = filters.maxPrice;
    }
  }
  
  // Note: area field doesn't exist in the Event model, so we skip area filtering
  
  if (filters.city) {
    where.city = { equals: filters.city, mode: 'insensitive' };
  }
  
  // Note: startTimeWindow filtering would require parsing startTime field
  // This is a simplified implementation
  
  return {
    where,
    ftsQuery: filters.freeTextQuery,
  };
}

/**
 * Calculate trigram similarity (simplified - actual implementation uses pg_trgm)
 */
function calculateTrigramSimilarity(text: string, query: string): number {
  if (!query) return 0;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Simple word overlap similarity
  const textWords = new Set(textLower.split(/\s+/));
  const queryWords = queryLower.split(/\s+/);
  
  let matches = 0;
  for (const word of queryWords) {
    if (textWords.has(word)) {
      matches++;
    } else {
      // Check for partial matches
      for (const textWord of textWords) {
        if (textWord.includes(word) || word.includes(textWord)) {
          matches += 0.5;
          break;
        }
      }
    }
  }
  
  return queryWords.length > 0 ? matches / queryWords.length : 0;
}

/**
 * Calculate FTS rank (simplified - actual implementation uses ts_rank)
 */
function calculateFtsRank(event: { title: string; description: string; venue: string }, query: string): number {
  if (!query) return 0;
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  let score = 0;
  const searchText = `${event.title} ${event.description} ${event.venue}`.toLowerCase();
  
  for (const word of queryWords) {
    if (searchText.includes(word)) {
      // Title matches are worth more
      if (event.title.toLowerCase().includes(word)) {
        score += 0.5;
      }
      // Description matches
      if (event.description.toLowerCase().includes(word)) {
        score += 0.3;
      }
      // Venue matches
      if (event.venue.toLowerCase().includes(word)) {
        score += 0.2;
      }
    }
  }
  
  return Math.min(1, score);
}

export const searchRouter = router({
  /**
   * Main search query procedure
   */
  query: publicProcedure
    .input(
      z.object({
        q: z.string().optional(),
        filters: searchFiltersSchema.optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        debug: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const startTime = Date.now();
      
      // Parse natural language query if provided
      const parsedFilters = input.q
        ? parseNaturalLanguageQuery(input.q)
        : {};
      
      // Merge with explicit filters (explicit takes precedence)
      const appliedFilters = normalizeFilters(
        mergeFilters(parsedFilters, input.filters || {})
      );
      
      // Build query conditions
      const { where, ftsQuery } = buildWhereConditions(appliedFilters);
      
      // Fetch events from database
      const events = await prisma.event.findMany({
        where,
        take: 100, // Fetch more for re-ranking
      });
      
      // Use weights without embeddings (embeddings disabled for simplicity)
      const weights = WEIGHTS_NO_EMBEDDINGS;
      
      // Score and rank events
      const scoredEvents = events.map((event) => {
        const ftsRank = calculateFtsRank(
          {
            title: event.title,
            description: event.description,
            venue: event.venue,
          },
          ftsQuery || input.q || ''
        );
        
        const trigramSimilarity = calculateTrigramSimilarity(
          `${event.title} ${event.venue} ${event.city}`,
          ftsQuery || input.q || ''
        );
        
        const recencyBoost = calculateRecencyBoost(event.date);
        
        const components: ScoreComponents = {
          ftsRank,
          trigramSimilarity,
          recencyBoost,
        };
        
        const score = calculateCombinedScore(components, weights);
        
        return {
          event,
          score,
          components,
        };
      });
      
      // Sort by score
      scoredEvents.sort((a, b) => b.score - a.score);
      
      // Apply pagination
      const paginatedEvents = scoredEvents.slice(
        input.offset,
        input.offset + input.limit
      );
      
      // Transform to response format
      const results: SearchResult[] = paginatedEvents.map(({ event, score, components }) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        venue: event.venue,
        city: event.city,
        category: event.category,
        date: event.date,
        price: event.price,
        score,
        scoreComponents: input.debug ? components : undefined,
      }));
      
      const queryTime = Date.now() - startTime;
      
      return {
        results,
        total: scoredEvents.length,
        debug: input.debug
          ? {
              appliedFilters,
              queryTime,
              embeddingsUsed: false,
            }
          : undefined,
      };
    }),

  /**
   * Typeahead suggest procedure
   */
  suggest: publicProcedure
    .input(
      z.object({
        q: z.string().min(1),
        limit: z.number().min(1).max(10).default(10),
      })
    )
    .query(async ({ input }) => {
      const query = input.q.toLowerCase();
      const results: SuggestResult[] = [];
      
      // Search events by title
      const eventsByTitle = await prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          title: { contains: query, mode: 'insensitive' },
        },
        select: { title: true, slug: true },
        take: 5,
      });
      
      for (const event of eventsByTitle) {
        results.push({
          type: 'event',
          value: event.title,
          slug: event.slug,
        });
      }
      
      // Search unique venues
      const venues = await prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          venue: { contains: query, mode: 'insensitive' },
        },
        select: { venue: true },
        distinct: ['venue'],
        take: 3,
      });
      
      for (const event of venues) {
        if (!results.some((r) => r.value === event.venue)) {
          results.push({
            type: 'venue',
            value: event.venue,
          });
        }
      }
      
      // Search unique cities
      const cities = await prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          city: { contains: query, mode: 'insensitive' },
        },
        select: { city: true },
        distinct: ['city'],
        take: 2,
      });
      
      for (const event of cities) {
        if (!results.some((r) => r.value === event.city)) {
          results.push({
            type: 'city',
            value: event.city,
          });
        }
      }
      
      return results.slice(0, input.limit);
    }),
});
