import { z } from 'zod';
import { router, publicProcedure } from '../index.js';
import { prisma } from '@indietix/db';
import {
  parseNaturalLanguageQuery,
  normalizeFilters,
  mergeFilters,
  calculateRecencyBoost,
  calculateCombinedScore,
  cosineSimilarity,
  WEIGHTS_NO_EMBEDDINGS,
  DEFAULT_WEIGHTS,
  isEmbeddingsEnabled,
  generateEmbedding,
} from '@indietix/search';
import type { SearchFilters, SearchResult, ScoreComponents, SuggestResult } from '@indietix/search';

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
    where.startDate = {};
    if (filters.dateStart) {
      (where.startDate as Record<string, unknown>).gte = new Date(filters.dateStart);
    }
    if (filters.dateEnd) {
      const endDate = new Date(filters.dateEnd);
      endDate.setHours(23, 59, 59, 999);
      (where.startDate as Record<string, unknown>).lte = endDate;
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
  
  if (filters.area) {
    where.area = { equals: filters.area, mode: 'insensitive' };
  }
  
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
function calculateFtsRank(event: { title: string; description: string; tags: string[]; venue: string }, query: string): number {
  if (!query) return 0;
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  let score = 0;
  const searchText = `${event.title} ${event.description} ${event.tags.join(' ')} ${event.venue}`.toLowerCase();
  
  for (const word of queryWords) {
    if (searchText.includes(word)) {
      // Title matches are worth more
      if (event.title.toLowerCase().includes(word)) {
        score += 0.4;
      }
      // Description matches
      if (event.description.toLowerCase().includes(word)) {
        score += 0.2;
      }
      // Tag matches
      if (event.tags.some(tag => tag.toLowerCase().includes(word))) {
        score += 0.3;
      }
      // Venue matches
      if (event.venue.toLowerCase().includes(word)) {
        score += 0.1;
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
        include: {
          embedding: true,
        },
        take: 100, // Fetch more for re-ranking
      });
      
      // Check if embeddings are enabled
      const useEmbeddings = isEmbeddingsEnabled();
      const weights = useEmbeddings ? DEFAULT_WEIGHTS : WEIGHTS_NO_EMBEDDINGS;
      
      // Generate query embedding if needed
      let queryEmbedding: number[] | null = null;
      if (useEmbeddings && (ftsQuery || input.q)) {
        queryEmbedding = await generateEmbedding(ftsQuery || input.q || '');
      }
      
      // Score and rank events
      const scoredEvents = events.map((event) => {
        const ftsRank = calculateFtsRank(
          {
            title: event.title,
            description: event.description,
            tags: event.tags,
            venue: event.venue,
          },
          ftsQuery || input.q || ''
        );
        
        const trigramSimilarity = calculateTrigramSimilarity(
          `${event.title} ${event.venue} ${event.city}`,
          ftsQuery || input.q || ''
        );
        
        const recencyBoost = calculateRecencyBoost(event.startDate);
        
        let embeddingSimilarity = 0;
        if (queryEmbedding && event.embedding?.vecData) {
          embeddingSimilarity = cosineSimilarity(
            queryEmbedding,
            event.embedding.vecData
          );
        }
        
        const components: ScoreComponents = {
          ftsRank,
          trigramSimilarity,
          recencyBoost,
          embeddingSimilarity: useEmbeddings ? embeddingSimilarity : undefined,
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
        area: event.area,
        category: event.category,
        tags: event.tags,
        startDate: event.startDate,
        price: event.price,
        imageUrl: event.imageUrl,
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
              embeddingsUsed: useEmbeddings,
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
