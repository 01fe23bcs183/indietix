import type { ScoreComponents } from "./types.js";

/**
 * Ranking weights configuration
 */
export interface RankingWeights {
  ftsRank: number;
  trigramSimilarity: number;
  recencyBoost: number;
  embeddingSimilarity: number;
}

/**
 * Default ranking weights
 */
export const DEFAULT_WEIGHTS: RankingWeights = {
  ftsRank: 0.4,
  trigramSimilarity: 0.25,
  recencyBoost: 0.2,
  embeddingSimilarity: 0.15,
};

/**
 * Weights when embeddings are disabled
 */
export const WEIGHTS_NO_EMBEDDINGS: RankingWeights = {
  ftsRank: 0.5,
  trigramSimilarity: 0.3,
  recencyBoost: 0.2,
  embeddingSimilarity: 0,
};

/**
 * Calculate recency boost for an event
 * Events in the next 14 days get a boost, older events get decay
 *
 * @param eventDate - The event start date
 * @param referenceDate - The reference date (defaults to now)
 * @returns A boost value between 0 and 1
 */
export function calculateRecencyBoost(
  eventDate: Date,
  referenceDate: Date = new Date()
): number {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Past events get heavy decay
  if (daysDiff < 0) {
    // Exponential decay for past events
    return Math.max(0, Math.exp(daysDiff / 7) * 0.3);
  }

  // Events today get maximum boost
  if (daysDiff === 0) {
    return 1.0;
  }

  // Events in next 14 days get high boost with gradual decay
  if (daysDiff <= 14) {
    // Linear decay from 1.0 to 0.5 over 14 days
    return 1.0 - (daysDiff / 14) * 0.5;
  }

  // Events beyond 14 days get moderate boost with slower decay
  if (daysDiff <= 30) {
    // Continue decay from 0.5 to 0.3
    return 0.5 - ((daysDiff - 14) / 16) * 0.2;
  }

  // Events beyond 30 days get minimal boost
  return Math.max(0.1, 0.3 - ((daysDiff - 30) / 60) * 0.2);
}

/**
 * Normalize a score to 0-1 range
 */
export function normalizeScore(
  score: number,
  min: number,
  max: number
): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (score - min) / (max - min)));
}

/**
 * Calculate combined score from components
 */
export function calculateCombinedScore(
  components: ScoreComponents,
  weights: RankingWeights = DEFAULT_WEIGHTS
): number {
  const score =
    weights.ftsRank * components.ftsRank +
    weights.trigramSimilarity * components.trigramSimilarity +
    weights.recencyBoost * components.recencyBoost +
    weights.embeddingSimilarity * (components.embeddingSimilarity ?? 0);

  return score;
}

/**
 * Re-rank results using embedding similarity
 * Takes top N results from lexical search and re-ranks using cosine similarity
 */
export function reRankWithEmbeddings(
  results: Array<{
    id: string;
    ftsRank: number;
    trigramSimilarity: number;
    recencyBoost: number;
    embedding?: number[];
  }>,
  queryEmbedding: number[],
  weights: RankingWeights = DEFAULT_WEIGHTS
): Array<{ id: string; score: number; components: ScoreComponents }> {
  return results
    .map((result) => {
      const embeddingSimilarity = result.embedding
        ? cosineSimilarity(queryEmbedding, result.embedding)
        : 0;

      const components: ScoreComponents = {
        ftsRank: result.ftsRank,
        trigramSimilarity: result.trigramSimilarity,
        recencyBoost: result.recencyBoost,
        embeddingSimilarity,
      };

      return {
        id: result.id,
        score: calculateCombinedScore(components, weights),
        components,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Build SQL for FTS ranking
 * Returns a SQL fragment for ts_rank
 */
export function buildFtsRankSql(searchVector: string, query: string): string {
  // Escape single quotes in query
  const escapedQuery = query.replace(/'/g, "''");
  return `ts_rank(${searchVector}, plainto_tsquery('english', '${escapedQuery}'))`;
}

/**
 * Build SQL for trigram similarity
 */
export function buildTrigramSql(column: string, query: string): string {
  const escapedQuery = query.replace(/'/g, "''");
  return `similarity(${column}, '${escapedQuery}')`;
}

/**
 * Build SQL for combined trigram similarity across multiple columns
 */
export function buildMultiColumnTrigramSql(
  columns: string[],
  query: string
): string {
  const escapedQuery = query.replace(/'/g, "''");
  const similarities = columns.map(
    (col) => `COALESCE(similarity(${col}, '${escapedQuery}'), 0)`
  );
  return `GREATEST(${similarities.join(", ")})`;
}

/**
 * Build SQL for recency boost
 * Uses a CASE expression to calculate boost based on days until event
 */
export function buildRecencyBoostSql(dateColumn: string): string {
  return `
    CASE
      WHEN ${dateColumn} < CURRENT_DATE THEN
        GREATEST(0, EXP((EXTRACT(EPOCH FROM (${dateColumn} - CURRENT_DATE)) / 86400) / 7) * 0.3)
      WHEN ${dateColumn} = CURRENT_DATE THEN 1.0
      WHEN ${dateColumn} <= CURRENT_DATE + INTERVAL '14 days' THEN
        1.0 - (EXTRACT(EPOCH FROM (${dateColumn} - CURRENT_DATE)) / 86400 / 14) * 0.5
      WHEN ${dateColumn} <= CURRENT_DATE + INTERVAL '30 days' THEN
        0.5 - ((EXTRACT(EPOCH FROM (${dateColumn} - CURRENT_DATE)) / 86400 - 14) / 16) * 0.2
      ELSE
        GREATEST(0.1, 0.3 - ((EXTRACT(EPOCH FROM (${dateColumn} - CURRENT_DATE)) / 86400 - 30) / 60) * 0.2)
    END
  `.trim();
}
