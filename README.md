# indietix

All-in-one event booking platform for India (web + mobile + admin)

## Build Health & Progress

### CI Status

[![Code Quality & Security](https://github.com/01fe23bcs183/indietix/actions/workflows/quality.yml/badge.svg)](https://github.com/01fe23bcs183/indietix/actions/workflows/quality.yml)
[![Update Progress](https://github.com/01fe23bcs183/indietix/actions/workflows/progress.yml/badge.svg)](https://github.com/01fe23bcs183/indietix/actions/workflows/progress.yml)

### Project Progress

Track our development progress in real-time: [**PROGRESS.md**](./PROGRESS.md)

The progress report is automatically updated when code is merged to main and includes:

- Overall project completion percentage
- Progress by milestone (Foundation, Core Packages, Applications, Governance)
- Detailed task status and assignments

### Code Quality

- **Secret Scanning**: Gitleaks runs on every push to prevent credential leaks
- **Linting**: ESLint with zero warnings policy
- **Type Safety**: TypeScript strict mode enabled
- **Automated Reviews**: CodeRabbit AI reviews all pull requests
- **Dependency Updates**: Dependabot checks weekly for security updates

### Documentation

- [Code Review Process](./docs/ops/reviews.md) - PR templates, CODEOWNERS, CodeRabbit setup
- [Code Quality & Security](./docs/ops/quality.md) - Gitleaks, ESLint, SonarCloud, Codecov setup
- [Progress Tracking](./docs/progress.md) - Automated progress tracking system

## Getting Started

Coming soon - setup instructions will be added once the foundation is complete.
# IndieTix

All-in-one event booking platform for India (web + mobile + admin)

## Project Structure

```
indietix/
├── apps/
│   ├── web/              # Next.js App Router (customer-facing)
│   ├── organizer/        # Next.js PWA (organizer dashboard)
│   ├── admin/            # Next.js (admin panel)
│   └── mobile/           # Expo React Native (mobile app)
├── packages/
│   ├── ui/               # shadcn/ui components + Tailwind
│   ├── api/              # tRPC routers
│   ├── db/               # Prisma + PostgreSQL/SQLite
│   ├── utils/            # Shared helpers
│   └── config/           # ESLint, Prettier, TypeScript configs
├── .github/
│   └── workflows/
│       └── ci.yml        # GitHub Actions CI workflow
├── turbo.json            # Turborepo configuration
├── tsconfig.base.json    # Base TypeScript configuration
└── package.json          # Root workspace configuration
```

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Mobile**: Expo React Native + TypeScript
- **API**: tRPC
- **Database**: Prisma (SQLite for dev, PostgreSQL for prod)
- **UI Components**: shadcn/ui
- **Type Safety**: TypeScript (strict mode)
- **Code Quality**: ESLint, Prettier, Husky, lint-staged
- **Testing**: Vitest (unit), Playwright (e2e)
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Setup Prisma
cd packages/db
cp .env.example .env
pnpm prisma:gen
cd ../..

# Setup Husky hooks
pnpm prepare
```

### Development

```bash
# Run all apps in development mode
pnpm -w dev

# Run specific app
pnpm --filter @indietix/web dev
pnpm --filter @indietix/organizer dev
pnpm --filter @indietix/admin dev
pnpm --filter @indietix/mobile start
```

### Building

```bash
# Build all apps and packages
pnpm -w build

# Build specific app
pnpm --filter @indietix/web build
```

### Testing

```bash
# Run all tests
pnpm -w test

# Run e2e tests (web only)
cd apps/web
pnpm test:e2e
```

### Code Quality

```bash
# Lint all code
pnpm -w lint

# Type check all code
pnpm -w typecheck

# Format all code
pnpm -w format
```

## Apps

### Web (Customer-facing)

- **URL**: http://localhost:3000
- **Description**: Customer-facing event booking platform
- **Features**: Event discovery, ticket booking, user accounts

### Organizer (PWA)

- **URL**: http://localhost:3001
- **Description**: Event organizer dashboard with PWA support
- **Features**: Event management, ticket sales, analytics

### Admin

- **URL**: http://localhost:3002
- **Description**: Platform administration panel
- **Features**: User management, platform settings, moderation

### Mobile

- **Description**: Native mobile app for iOS and Android
- **Features**: Event browsing, ticket booking, mobile payments

## Packages

### @indietix/ui

Shared UI components built with shadcn/ui and Tailwind CSS. Consumed by all web apps.

### @indietix/api

tRPC API routers for type-safe client-server communication.

### @indietix/db

Prisma schema and database client. Supports SQLite (dev) and PostgreSQL (prod).

### @indietix/utils

Shared utility functions used across all apps and packages.

### @indietix/config

Shared configuration for ESLint, Prettier, and TypeScript.

## CI/CD

GitHub Actions workflow runs on every PR:

1. Install dependencies
2. Lint all code
3. Type check all code
4. Run unit tests
5. Build all packages
6. Build all apps (web, organizer, admin)
7. Run Playwright e2e tests (web only)

Mobile app builds are skipped in CI for now.

## Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

For packages/db, also create a local .env:

```bash
cd packages/db
cp .env.example .env
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `pnpm -w lint` and `pnpm -w typecheck`
4. Commit your changes (pre-commit hooks will run automatically)
5. Push and create a PR

## License

MIT
