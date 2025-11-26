/**
 * Parsed search filters from natural language query
 */
export interface SearchFilters {
  category?: string;
  dateStart?: string;
  dateEnd?: string;
  maxPrice?: number;
  minPrice?: number;
  area?: string;
  city?: string;
  startTimeWindow?: "morning" | "afternoon" | "evening" | "night";
  freeTextQuery?: string;
}

/**
 * Search result with scoring components
 */
export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  venue: string;
  city: string;
  area?: string | null;
  category: string;
  tags: string[];
  startDate: Date;
  price: number;
  imageUrl?: string | null;
  score: number;
  scoreComponents?: ScoreComponents;
}

/**
 * Individual score components for debugging
 */
export interface ScoreComponents {
  ftsRank: number;
  trigramSimilarity: number;
  recencyBoost: number;
  embeddingSimilarity?: number;
}

/**
 * Search query input
 */
export interface SearchQueryInput {
  q?: string;
  filters?: Partial<SearchFilters>;
  limit?: number;
  offset?: number;
}

/**
 * Search query response
 */
export interface SearchQueryResponse {
  results: SearchResult[];
  total: number;
  debug?: {
    appliedFilters: SearchFilters;
    queryTime: number;
    embeddingsUsed: boolean;
  };
}

/**
 * Suggest query input
 */
export interface SuggestInput {
  q: string;
  limit?: number;
}

/**
 * Suggest result
 */
export interface SuggestResult {
  type: "event" | "venue" | "city";
  value: string;
  slug?: string;
}

/**
 * Embedding provider type
 */
export type EmbeddingProvider = "none" | "local" | "remote";

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  remoteApiKey?: string;
  remoteApiUrl?: string;
  rateLimitPerMinute?: number;
}
