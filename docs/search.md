# IndieTix Search System Documentation

## Overview

The IndieTix search system provides a low-cost, high-performance search pipeline that combines natural language parsing, PostgreSQL full-text search (FTS), trigram fuzzy matching, and optional embedding-based re-ranking.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Query     │────▶│  NL Parser       │────▶│  Structured     │
│  (Natural Lang) │     │  (Deterministic) │     │  Filters        │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Ranked Results │◀────│  Ranking Engine  │◀────│  PostgreSQL     │
│  + Debug Info   │     │  (FTS + Trigram  │     │  Query          │
└─────────────────┘     │   + Embeddings)  │     └─────────────────┘
                        └──────────────────┘
```

## Natural Language Parser

### Grammar

The parser uses a rule-based tokenizer to extract structured filters from natural language queries.

#### Supported Patterns

**Categories:**
- Direct: `comedy`, `music`, `theatre`, `workshop`, `art`, `food`, `sports`, `networking`, `party`
- Synonyms: `standup` → `comedy`, `concert` → `music`, `play` → `theatre`, `open mic` → `open-mic`

**Areas (Bengaluru):**
- Full names: `indiranagar`, `koramangala`, `hsr layout`, `whitefield`, `jayanagar`
- Aliases: `indira` → `Indiranagar`, `kora` → `Koramangala`, `hsr` → `HSR Layout`
- City: `bangalore`, `bengaluru`, `blr` → `Bengaluru`

**Prices:**
- Upper bound: `under 600`, `below 500`, `< 1000`
- Lower bound: `above 300`, `over 500`, `> 200`
- Range: `300-700`, `₹300–₹700`, `rs 300 to 700`

**Dates:**
- Relative: `today`, `tonight`, `tomorrow`, `this weekend`, `this week`, `next week`
- Day of week: `friday`, `saturday`, `sunday`

**Time Windows:**
- `morning` (6 AM - 12 PM)
- `afternoon` (12 PM - 5 PM)
- `evening` (5 PM - 9 PM)
- `night` (9 PM - 6 AM)

### Output Format

```typescript
interface SearchFilters {
  category?: string;
  dateStart?: string;      // ISO date string
  dateEnd?: string;        // ISO date string
  maxPrice?: number;
  minPrice?: number;
  area?: string;
  city?: string;
  startTimeWindow?: 'morning' | 'afternoon' | 'evening' | 'night';
  freeTextQuery?: string;  // Remaining tokens for FTS
}
```

### Examples

| Input | Output |
|-------|--------|
| `comedy tonight under 600 near indiranagar` | `{category: "comedy", dateStart: "2024-01-15", dateEnd: "2024-01-15", maxPrice: 600, area: "Indiranagar", city: "Bengaluru"}` |
| `music this weekend ₹300–₹700 koramangala` | `{category: "music", dateStart: "2024-01-20", dateEnd: "2024-01-21", minPrice: 300, maxPrice: 700, area: "Koramangala", city: "Bengaluru"}` |
| `open mic friday evening` | `{category: "open-mic", dateStart: "2024-01-19", dateEnd: "2024-01-19", startTimeWindow: "evening"}` |

## Ranking Methodology

### Scoring Formula

```
score = w1 * fts_rank + w2 * trgm_similarity + w3 * recency_boost + w4 * embedding_similarity
```

### Default Weights

| Component | With Embeddings | Without Embeddings |
|-----------|-----------------|-------------------|
| FTS Rank | 0.40 | 0.50 |
| Trigram Similarity | 0.25 | 0.30 |
| Recency Boost | 0.20 | 0.20 |
| Embedding Similarity | 0.15 | 0.00 |

### Component Details

#### FTS Rank (Full-Text Search)
- Uses PostgreSQL `tsvector` and `ts_rank`
- Indexes: `title`, `description`, `tags`, `venue`
- Weighted by field importance (title > tags > description > venue)

#### Trigram Similarity
- Uses PostgreSQL `pg_trgm` extension
- Fuzzy matching on `title`, `venue`, `city`
- Handles typos and partial matches

#### Recency Boost
- Events today: 1.0 (maximum boost)
- Events in next 14 days: 1.0 → 0.5 (linear decay)
- Events in 14-30 days: 0.5 → 0.3 (slower decay)
- Events beyond 30 days: 0.3 → 0.1 (minimal boost)
- Past events: Exponential decay (< 0.3)

#### Embedding Similarity (Optional)
- Uses cosine similarity between query and event embeddings
- 384-dimensional vectors from MiniLM model
- Only used when embeddings are enabled

## Embedding Providers

### Configuration

Set via environment variable: `SEARCH_EMBEDDINGS_PROVIDER`

| Value | Description | Use Case |
|-------|-------------|----------|
| `none` | Embeddings disabled | CI, cost-sensitive |
| `local` | Local MiniLM model | Development, Production |
| `remote` | External API | High-volume production |

### Default Behavior

- **CI**: `none` (automatically detected via `CI=true`)
- **Development**: `local`
- **Production**: `local`

### Local Provider

Uses `@xenova/transformers` with `all-MiniLM-L6-v2` model:
- Runs entirely in Node.js
- No internet access required at runtime
- Model cached after first load
- ~50ms per embedding generation

### Remote Provider

For high-volume production scenarios:
- Requires `SEARCH_EMBEDDINGS_API_KEY` and `SEARCH_EMBEDDINGS_API_URL`
- Built-in rate limiting (default: 60 requests/minute)
- Configurable via `SEARCH_EMBEDDINGS_RATE_LIMIT`

### Vector Caching

Embeddings are cached in the `EventEmbedding` table:
- `eventId`: Reference to event
- `vecData`: 384-dimensional float array
- `updatedAt`: Last update timestamp

Regenerate embeddings when event content changes significantly.

## API Reference

### `search.query`

Main search endpoint with filter parsing and ranking.

```typescript
input: {
  q?: string;           // Natural language query
  filters?: {           // Explicit filters (override parsed)
    category?: string;
    dateStart?: string;
    dateEnd?: string;
    maxPrice?: number;
    minPrice?: number;
    area?: string;
    city?: string;
    startTimeWindow?: string;
  };
  limit?: number;       // Default: 20, Max: 100
  offset?: number;      // Default: 0
  debug?: boolean;      // Include debug info
}

output: {
  results: SearchResult[];
  total: number;
  debug?: {
    appliedFilters: SearchFilters;
    queryTime: number;
    embeddingsUsed: boolean;
  };
}
```

### `search.suggest`

Typeahead suggestions for search autocomplete.

```typescript
input: {
  q: string;            // Partial query (min 1 char)
  limit?: number;       // Default: 10, Max: 10
}

output: Array<{
  type: 'event' | 'venue' | 'city';
  value: string;
  slug?: string;        // For events only
}>
```

## Database Indexes

### Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;  -- Optional, for pgvector
```

### Recommended Indexes

```sql
-- Full-text search
CREATE INDEX events_search_idx ON "Event" 
  USING GIN (to_tsvector('english', title || ' ' || description || ' ' || venue));

-- Trigram indexes
CREATE INDEX events_title_trgm_idx ON "Event" USING GIN (title gin_trgm_ops);
CREATE INDEX events_venue_trgm_idx ON "Event" USING GIN (venue gin_trgm_ops);
CREATE INDEX events_city_trgm_idx ON "Event" USING GIN (city gin_trgm_ops);

-- Filter indexes
CREATE INDEX events_category_idx ON "Event" (category);
CREATE INDEX events_city_idx ON "Event" (city);
CREATE INDEX events_area_idx ON "Event" (area);
CREATE INDEX events_start_date_idx ON "Event" (start_date);
CREATE INDEX events_status_idx ON "Event" (status);

-- Embedding index (if using pgvector)
CREATE INDEX event_embeddings_vec_idx ON "EventEmbedding" 
  USING hnsw (vec vector_cosine_ops);
```

## Cost Considerations

### Embedding Costs

| Provider | Cost | Latency | Recommended For |
|----------|------|---------|-----------------|
| None | $0 | 0ms | CI, testing |
| Local | $0 (CPU) | ~50ms | Development, small-scale production |
| Remote | Varies | ~100ms | High-volume production |

### Optimization Tips

1. **Disable embeddings in CI**: Set `SEARCH_EMBEDDINGS_PROVIDER=none`
2. **Cache aggressively**: Event embeddings rarely change
3. **Limit re-ranking pool**: Only fetch top 50 results for embedding re-rank
4. **Use lexical search first**: FTS + trigram handles most queries well

## Testing

### Unit Tests

```bash
# Run parser tests
pnpm --filter @indietix/search test

# Test specific file
pnpm --filter @indietix/search test parser
```

### E2E Tests

```bash
# Run Playwright tests
pnpm --filter @indietix/web test:e2e

# Run with UI
npx playwright test --ui
```

### Test Fixtures

Parser test fixtures cover:
- Category synonyms
- Area aliases
- Price parsing (ranges, bounds)
- Date parsing (relative, absolute)
- Complex multi-filter queries

## Troubleshooting

### Common Issues

**"No results found"**
- Check if events are seeded with `PUBLISHED` status
- Verify date filters aren't excluding all events
- Try broader search terms

**"Embeddings not working"**
- Check `SEARCH_EMBEDDINGS_PROVIDER` environment variable
- Ensure `@xenova/transformers` is installed
- First embedding generation may take longer (model download)

**"Slow search performance"**
- Ensure database indexes are created
- Check if embeddings are being generated on every request
- Consider disabling embeddings for faster results

### Debug Mode

Enable debug mode in the UI (development only) to see:
- Applied filters after parsing
- Score components for each result
- Query execution time
- Whether embeddings were used

## Changelog

### v1.0.0
- Initial implementation
- NL parser with category/area/price/date support
- FTS + trigram ranking
- Optional MiniLM embeddings
- Web and mobile UI integration
