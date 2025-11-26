# CMS Content Blocks + Blog/Help + Preview/Versioning Implementation

## Overview

This document tracks the implementation of a lightweight CMS for the IndieTix platform. The CMS allows Admins to control homepage sections, FAQs, and blog/help content without requiring redeployments.

## Features

### Content Blocks
- Model with id, key (unique), type (rich|json), value (JSON), version, published, timestamps, authorId
- Predefined keys: home.hero, home.featured, home.categories, home.testimonials, legal.terms, legal.privacy, faq.items
- Admin editor UI at /admin/cms with rich-text (Tiptap) and JSON editors
- Version history with diff view and rollback
- Draft vs published states with preview mode

### Blog & Help Center
- Post model with slug, title, excerpt, body (rich JSON), tags, status (DRAFT|PUBLISHED), publishedAt, authorId
- Routes: /blog (list with tag filtering), /blog/[slug] (detail), /help (search by title/tags)
- SEO metadata generation

### Live Rendering
- Homepage reads ContentBlock entries where published=true
- Next.js draft/preview mode for admin preview
- ISR caching with 60s revalidation, cache invalidation on publish

### Media Library
- Cloudinary integration if CLOUDINARY_URL is present
- URL field fallback otherwise

### Roles & Audit
- ADMIN role required for publishing
- AdminAction logs for all CMS actions

## Implementation Progress

### Phase 1: Data Layer
- [ ] Add ContentBlock model to Prisma schema
- [ ] Add Post model to Prisma schema
- [ ] Run database migration

### Phase 2: API Layer
- [ ] Implement cms.blocks.list
- [ ] Implement cms.blocks.get
- [ ] Implement cms.blocks.save
- [ ] Implement cms.blocks.publish
- [ ] Implement cms.blocks.rollback
- [ ] Implement cms.posts.create
- [ ] Implement cms.posts.update
- [ ] Implement cms.posts.publish
- [ ] Implement cms.posts.list
- [ ] Implement cms.posts.get
- [ ] Implement cms.search

### Phase 3: Admin UI
- [ ] Create /admin/cms page with content block list
- [ ] Add rich-text editor (Tiptap) for type:rich
- [ ] Add JSON editor with schema validation for type:json
- [ ] Implement version history with diff view
- [ ] Add rollback functionality
- [ ] Add draft/published toggle
- [ ] Add preview link generation
- [ ] Create posts management UI

### Phase 4: Public Pages
- [ ] Update homepage to read ContentBlock entries
- [ ] Implement Next.js draft/preview mode
- [ ] Implement ISR with 60s revalidation
- [ ] Create /blog page with tag filtering
- [ ] Create /blog/[slug] page
- [ ] Create /help page with search
- [ ] Add SEO metadata generation

### Phase 5: Testing & Documentation
- [ ] Unit tests for JSON schema validation
- [ ] Unit tests for preview token verification
- [ ] Unit tests for ISR invalidation helper
- [ ] Playwright E2E test for CMS editing/preview
- [ ] Playwright E2E test for blog/help pages
- [ ] Create docs/cms.md

## Technical Decisions

1. Using Tiptap for rich-text editing (lightweight, extensible)
2. JSON schema validation using Zod
3. Preview tokens using signed JWTs with short expiry
4. ISR revalidation via Next.js revalidatePath/revalidateTag

## Files Changed

(Will be updated as implementation progresses)
