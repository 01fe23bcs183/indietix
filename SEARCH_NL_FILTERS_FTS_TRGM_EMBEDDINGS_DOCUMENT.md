# Search Feature Implementation Document

## PR Title
`[search] NL→filters + FTS/trgm + optional embeddings re-rank (pgvector, cost-aware)`

## Overview
This document tracks the implementation of an upgraded search functionality for IndieTix that:
1. Parses natural language queries into structured filters
2. Uses PostgreSQL FTS and trigram for efficient text search
3. Optionally incorporates embeddings for re-ranking results

## Architecture

### 1. Natural Language Parser (`packages/search/parser.ts`)
A deterministic rule-based tokenizer that converts natural language queries into structured JSON filters.

**Input Examples:**
- "comedy tonight under 600 near indiranagar"
- "music this weekend ₹300–₹700 koramangala"
- "open mic friday evening"

**Output Structure:**
```json
{
  "category"?: string,
  "dateStart"?: string,
  "dateEnd"?: string,
  "maxPrice"?: number,
  "minPrice"?: number,
  "area"?: string,
  "city"?: string,
  "startTimeWindow"?: string
}
```

### 2. Indexing Strategy

**PostgreSQL Extensions:**
- `pg_trgm`: Fuzzy matching on title, venue, city
- `tsvector`: Full-text search on title, description, tags, venue
- `pgvector`: 384-dimensional embeddings (optional, with migration guards)

**Indexes Created:**
- GIN index on tsvector column for FTS
- GIN trigram indexes on title, venue, city
- HNSW index on embedding vector (if pgvector enabled)

### 3. Ranking Function (`packages/search/rank.ts`)
```
score = w1*fts_rank + w2*trgm(title) + w3*recencyBoost + w4*emb_sim(optional)
```

**Recency Boost:**
- Events in next 14 days get boost
- Events older than today get decay penalty

### 4. Embeddings (`packages/search/embeddings.ts`)
**Provider Options:**
- `none`: No embeddings (CI default)
- `local`: sentence-transformers all-MiniLM-L6-v2 via @xenova/transformers
- `remote`: External API with rate limiting (production optional)

**Caching:**
- EventEmbedding table: eventId, vec vector(384), updatedAt

### 5. tRPC API (`packages/api/src/routers/search.ts`)
- `search.query({ q?, filters? })`: Main search with debug info
- `search.suggest({ q })`: Typeahead (10 results max)

### 6. Web UI Changes (`apps/web`)
- Search bar with NL placeholder on /events
- Filter chips (removable)
- Debug toggle (dev only) showing score components

### 7. Mobile UI Changes (`apps/mobile`)
- Search screen using new tRPC endpoints
- Parity with web UI

## Configuration
Environment variable: `SEARCH_EMBEDDINGS_PROVIDER`
- CI: `none` (default)
- Development: `local`
- Production: `local`

## Implementation Log

### Session 1 - Initial Setup
- Created feature branch
- Created documentation files
- Setting up monorepo structure

## Files Created/Modified
(Will be updated as implementation progresses)

## Testing Strategy
- Unit tests (Vitest): parser fixtures, rank composition, vector cache
- Playwright tests: search queries, filter display, sorted results
