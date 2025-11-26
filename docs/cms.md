# CMS Documentation

This document describes the Content Management System (CMS) for IndieTix, which allows administrators to manage homepage sections, FAQs, blog posts, and help center content without requiring redeployments.

## Overview

The CMS provides a database-backed content management solution with the following features:

- Content blocks for homepage sections and legal pages
- Blog posts with rich text editing
- Help center with FAQ management
- Version history with rollback capability
- Draft/published workflow with preview mode
- ISR (Incremental Static Regeneration) for optimal performance

## Content Blocks

Content blocks are reusable content sections that can be edited through the admin interface.

### Predefined Keys

The following content block keys are supported:

| Key | Description | Type |
|-----|-------------|------|
| `home.hero` | Homepage hero section | JSON |
| `home.featured` | Featured events section | JSON |
| `home.categories` | Category browsing section | JSON |
| `home.testimonials` | Customer testimonials | JSON |
| `legal.terms` | Terms of Service | Rich Text |
| `legal.privacy` | Privacy Policy | Rich Text |
| `faq.items` | FAQ items | JSON |

### Content Block Schema

Each content block has the following structure:

```typescript
interface ContentBlock {
  id: string;
  key: string;           // Unique identifier (e.g., "home.hero")
  type: "RICH" | "JSON"; // Content type
  value: JSON;           // The actual content
  version: number;       // Current version number
  published: boolean;    // Whether the block is live
  authorId: string;      // Last editor's user ID
  createdAt: Date;
  updatedAt: Date;
}
```

### JSON Block Schemas

#### home.hero

```json
{
  "title": "Discover Amazing Events",
  "subtitle": "Find and book tickets for the best events in your city",
  "ctaText": "Browse Events",
  "ctaLink": "/events",
  "backgroundImage": "https://..."
}
```

#### home.featured

```json
{
  "title": "Featured Events",
  "subtitle": "Don't miss these popular events",
  "eventIds": ["event-id-1", "event-id-2"]
}
```

#### home.categories

```json
{
  "title": "Browse by Category",
  "categories": [
    { "name": "Music", "icon": "music", "slug": "music" },
    { "name": "Comedy", "icon": "comedy", "slug": "comedy" }
  ]
}
```

#### home.testimonials

```json
{
  "title": "What Our Users Say",
  "items": [
    {
      "name": "John Doe",
      "role": "Event Enthusiast",
      "content": "Great platform for finding events!",
      "avatar": "https://..."
    }
  ]
}
```

#### faq.items

```json
{
  "items": [
    {
      "question": "How do I book tickets?",
      "answer": "Browse events, select your tickets, and complete checkout.",
      "category": "Booking"
    }
  ]
}
```

## Blog Posts

Blog posts support rich text content with the following structure:

```typescript
interface Post {
  id: string;
  slug: string;        // URL-friendly identifier
  title: string;
  excerpt: string;     // Short description
  body: JSON;          // Rich text content
  tags: string[];      // For filtering and categorization
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: Date;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Routes

- `/blog` - List of published blog posts with tag filtering
- `/blog/[slug]` - Individual blog post page
- `/help` - Help center with FAQ and search

## Preview Mode

The CMS supports Next.js draft mode for previewing unpublished content.

### Enabling Preview

1. Generate a preview token from the admin CMS interface
2. Navigate to `/api/preview?token=<token>&block=<block-key>`
3. The page will display a "Preview Mode Enabled" banner
4. Unpublished content will be visible

### Preview Token Format

Preview tokens are base64-encoded JSON with the following structure:

```json
{
  "key": "home.hero",
  "exp": 1700000000000
}
```

Tokens expire after 1 hour by default.

### Disabling Preview

Send a POST request to `/api/preview` to disable preview mode and return to viewing published content only.

## Versioning

Every content block maintains a version history:

1. Each save creates a new version
2. The version number increments automatically
3. Previous versions are stored in `ContentBlockVersion`
4. Rollback restores a previous version's content

### Version History Features

- View all previous versions with timestamps
- Compare versions with diff view
- Rollback to any previous version
- Track which user made each change

## Roles & Permissions

### Admin Role

Only users with the `ADMIN` role can:

- Publish content blocks
- Publish blog posts
- Rollback to previous versions

### Audit Logging

All CMS actions are logged to `AdminAction`:

- Content block saves
- Content block publishes
- Content block rollbacks
- Post creates/updates/publishes

## API Endpoints

### Content Blocks

| Endpoint | Description |
|----------|-------------|
| `cms.blocks.list` | List all content blocks |
| `cms.blocks.get` | Get a specific block by key |
| `cms.blocks.save` | Save/update a block (creates new version) |
| `cms.blocks.publish` | Publish a block (Admin only) |
| `cms.blocks.rollback` | Rollback to a previous version (Admin only) |

### Posts

| Endpoint | Description |
|----------|-------------|
| `cms.posts.list` | List posts with pagination and filtering |
| `cms.posts.get` | Get a specific post by slug |
| `cms.posts.create` | Create a new post |
| `cms.posts.update` | Update an existing post |
| `cms.posts.publish` | Publish a post (Admin only) |

### Search

| Endpoint | Description |
|----------|-------------|
| `cms.search` | Search posts and blocks by query |

## Caching & ISR

The CMS uses Incremental Static Regeneration (ISR) for optimal performance:

- Pages are statically generated at build time
- Content is revalidated every 60 seconds
- Cache is invalidated when content is published
- Preview mode bypasses the cache

### Revalidation

When content is published:

1. The database is updated
2. Relevant paths are revalidated
3. New content appears within 60 seconds

## Admin Interface

The admin CMS interface is available at `/admin/cms` and provides:

### Content Blocks Tab

- List of all predefined content blocks
- Click to edit any block
- Rich text editor for `type: "rich"` blocks
- JSON editor with validation for `type: "json"` blocks
- Version history sidebar
- Preview link generation
- Save as draft / Publish buttons

### Blog Posts Tab

- List of all posts with status indicators
- Create new post button
- Click to edit existing posts
- Rich text editor for post body
- Tag management
- SEO metadata fields

## Media Library

If `CLOUDINARY_URL` is configured, the CMS provides:

- Image upload to Cloudinary
- Image picker for content blocks
- Automatic image optimization

Without Cloudinary, a simple URL field is provided for media.

## Testing

### Unit Tests

Located in `packages/api/src/__tests__/cms.test.ts`:

- JSON schema validation tests
- Preview token verification tests
- ISR invalidation helper tests

### E2E Tests

Located in `apps/web/e2e/cms.spec.ts`:

- Homepage content rendering
- Preview mode functionality
- Blog page rendering
- Help center functionality

## Development

### Running Locally

```bash
# Start the admin app
cd apps/admin && pnpm dev

# Start the web app
cd apps/web && pnpm dev
```

### Database Migrations

```bash
# Generate Prisma client
pnpm db:gen

# Run migrations
pnpm db:migrate
```

### Running Tests

```bash
# Unit tests
pnpm -w test

# E2E tests
npx playwright test apps/web/e2e/cms.spec.ts
```
