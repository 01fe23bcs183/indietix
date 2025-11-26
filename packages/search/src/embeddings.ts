import type { EmbeddingProvider, EmbeddingConfig } from './types.js';

/**
 * Get the embedding provider from environment
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.SEARCH_EMBEDDINGS_PROVIDER?.toLowerCase();
  
  if (provider === 'local' || provider === 'remote' || provider === 'none') {
    return provider;
  }
  
  // Default based on environment
  if (process.env.CI === 'true') {
    return 'none';
  }
  
  if (process.env.NODE_ENV === 'development') {
    return 'local';
  }
  
  // Production default
  return 'local';
}

/**
 * Get embedding configuration
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  return {
    provider: getEmbeddingProvider(),
    remoteApiKey: process.env.SEARCH_EMBEDDINGS_API_KEY,
    remoteApiUrl: process.env.SEARCH_EMBEDDINGS_API_URL,
    rateLimitPerMinute: parseInt(process.env.SEARCH_EMBEDDINGS_RATE_LIMIT || '60', 10),
  };
}

/**
 * Check if embeddings are enabled
 */
export function isEmbeddingsEnabled(): boolean {
  return getEmbeddingProvider() !== 'none';
}

/**
 * Embedding dimension for MiniLM model
 */
export const EMBEDDING_DIMENSION = 384;

/**
 * Local embedding provider using @xenova/transformers
 * Lazy-loaded to avoid loading the model when not needed
 */
let localPipeline: unknown = null;
let localPipelinePromise: Promise<unknown> | null = null;

async function getLocalPipeline(): Promise<unknown> {
  if (localPipeline) {
    return localPipeline;
  }
  
  if (localPipelinePromise) {
    return localPipelinePromise;
  }
  
  localPipelinePromise = (async () => {
    try {
      // Dynamic import to avoid loading in CI
      const { pipeline } = await import('@xenova/transformers');
      localPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { quantized: true }
      );
      return localPipeline;
    } catch (error) {
      console.error('Failed to load local embedding model:', error);
      throw error;
    }
  })();
  
  return localPipelinePromise;
}

/**
 * Generate embedding using local model
 */
async function generateLocalEmbedding(text: string): Promise<number[]> {
  const pipe = await getLocalPipeline();
  
  // Type assertion for the pipeline function
  const result = await (pipe as (text: string, options: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array }>)(
    text,
    { pooling: 'mean', normalize: true }
  );
  
  return Array.from(result.data);
}

/**
 * Rate limiter for remote API
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  
  constructor(tokensPerMinute: number) {
    this.maxTokens = tokensPerMinute;
    this.tokens = tokensPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = tokensPerMinute / 60000; // tokens per ms
  }
  
  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }
    
    this.tokens -= 1;
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

let rateLimiter: RateLimiter | null = null;

function getRateLimiter(config: EmbeddingConfig): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter(config.rateLimitPerMinute || 60);
  }
  return rateLimiter;
}

/**
 * Generate embedding using remote API
 */
async function generateRemoteEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  if (!config.remoteApiUrl || !config.remoteApiKey) {
    throw new Error('Remote embedding API URL and key are required');
  }
  
  // Apply rate limiting
  await getRateLimiter(config).acquire();
  
  const response = await fetch(config.remoteApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.remoteApiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'all-MiniLM-L6-v2',
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Remote embedding API error: ${response.status}`);
  }
  
  const data = await response.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

/**
 * Generate embedding for text
 * Uses the configured provider (local, remote, or none)
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const config = getEmbeddingConfig();
  
  if (config.provider === 'none') {
    return null;
  }
  
  // Truncate text to reasonable length for embedding
  const truncatedText = text.slice(0, 512);
  
  try {
    if (config.provider === 'local') {
      return await generateLocalEmbedding(truncatedText);
    }
    
    if (config.provider === 'remote') {
      return await generateRemoteEmbedding(truncatedText, config);
    }
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
  
  return null;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<Array<number[] | null>> {
  const config = getEmbeddingConfig();
  
  if (config.provider === 'none') {
    return texts.map(() => null);
  }
  
  // Process in parallel with concurrency limit
  const concurrency = config.provider === 'remote' ? 5 : 10;
  const results: Array<number[] | null> = [];
  
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Create text for embedding from event data
 */
export function createEventEmbeddingText(event: {
  title: string;
  description: string;
  venue: string;
  category: string;
  tags?: string[];
}): string {
  const parts = [
    event.title,
    event.description,
    event.venue,
    event.category,
    ...(event.tags || []),
  ];
  
  return parts.filter(Boolean).join(' ').slice(0, 512);
}
