# Code Quality & Security

This document describes the code quality and security tools configured for IndieTix.

## Overview

The project uses multiple tools to ensure code quality and security:

- **Gitleaks**: Secret scanning to prevent credential leaks
- **ESLint**: JavaScript/TypeScript linting
- **TypeScript**: Static type checking
- **Dependabot**: Automated dependency updates
- **SonarCloud**: Code quality and security analysis (optional)
- **Codecov**: Code coverage tracking (optional)

## Gitleaks - Secret Scanning

Gitleaks scans the repository for hardcoded secrets, API keys, and credentials.

### Configuration

The configuration is in `.gitleaks.toml` at the repository root. It includes:

- Default rules for common secrets (AWS keys, private keys, etc.)
- Custom rules for Indian payment gateways (Razorpay, Paytm)
- JWT secret detection
- Database connection string detection
- Allowlist for false positives (`.env.example`, documentation)

### CI Integration

Gitleaks runs automatically on every push and pull request via `.github/workflows/quality.yml`. If secrets are detected, the build will fail.

### Local Usage

Run Gitleaks locally before committing:

```bash
# Install gitleaks
brew install gitleaks  # macOS
# or download from https://github.com/gitleaks/gitleaks/releases

# Scan repository
gitleaks detect --source . --verbose

# Scan uncommitted changes
gitleaks protect --staged --verbose
```

### What to Do If Secrets Are Found

1. **Remove the secret** from the code immediately
2. **Rotate the credential** - the old one is now compromised
3. **Use environment variables** instead of hardcoding
4. **Update `.env.example`** with placeholder values
5. **Add to `.gitignore`** if it's a file that should never be committed

## ESLint - Code Linting

ESLint enforces code style and catches common errors.

### Configuration

The configuration is in `eslint.config.js` at the repository root.

### CI Integration

ESLint runs with `--max-warnings=0` in CI, meaning any warnings will fail the build.

### Local Usage

```bash
# Run linting
pnpm run lint

# Fix auto-fixable issues
pnpm run lint:fix
```

## TypeScript - Type Checking

TypeScript provides static type checking to catch errors before runtime.

### Configuration

The configuration is in `tsconfig.json` at the repository root.

### CI Integration

TypeScript type checking runs in CI via `pnpm run typecheck`.

### Local Usage

```bash
# Run type checking
pnpm run typecheck

# Watch mode
pnpm run typecheck:watch
```

## Dependabot - Dependency Updates

Dependabot automatically creates PRs to update dependencies.

### Configuration

The configuration is in `.github/dependabot.yml`. It's configured to:

- Check for updates weekly (Mondays at 9:00 AM IST)
- Create separate PRs for each workspace (apps/web, packages/api, etc.)
- Assign appropriate reviewers based on the package
- Auto-label PRs with relevant tags

### Managing Dependabot PRs

1. Review the changelog and breaking changes
2. Check that CI passes
3. Test locally if needed
4. Merge when ready

## SonarCloud - Code Quality Analysis (Optional)

SonarCloud provides deep code quality and security analysis.

### Setup Instructions

1. **Create SonarCloud Account**
   - Go to https://sonarcloud.io
   - Sign in with your GitHub account

2. **Import Repository**
   - Click "+" → "Analyze new project"
   - Select `01fe23bcs183/indietix`
   - Follow the setup wizard

3. **Get Project Key and Token**
   - Note your project key (e.g., `01fe23bcs183_indietix`)
   - Generate a token: My Account → Security → Generate Token

4. **Add Token to GitHub Secrets**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SONAR_TOKEN`
   - Value: Your SonarCloud token
   - Click "Add secret"

5. **Create sonar-project.properties**
   - Create file at repository root:

   ```properties
   sonar.projectKey=01fe23bcs183_indietix
   sonar.organization=01fe23bcs183
   sonar.sources=apps,packages
   sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/*.test.ts,**/*.spec.ts
   sonar.javascript.lcov.reportPaths=coverage/lcov.info
   ```

6. **Verify Integration**
   - Push a commit to trigger CI
   - Check that SonarCloud analysis runs
   - View results at https://sonarcloud.io

### Current Status

SonarCloud is **optional** and will be skipped if `SONAR_TOKEN` is not configured. The CI workflow will show a warning but won't fail.

## Codecov - Code Coverage (Optional)

Codecov tracks test coverage over time.

### Setup Instructions

1. **Create Codecov Account**
   - Go to https://codecov.io
   - Sign in with your GitHub account

2. **Add Repository**
   - Click "Add repository"
   - Select `01fe23bcs183/indietix`

3. **Get Upload Token**
   - Go to repository settings in Codecov
   - Copy the upload token

4. **Add Token to GitHub Secrets**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Value: Your Codecov token
   - Click "Add secret"

5. **Add Test Coverage Script**
   - Ensure `package.json` has a `test:coverage` script:

   ```json
   {
     "scripts": {
       "test:coverage": "jest --coverage"
     }
   }
   ```

6. **Verify Integration**
   - Push a commit to trigger CI
   - Check that coverage is uploaded
   - View results at https://codecov.io

### Current Status

Codecov is **optional** and will be skipped if `CODECOV_TOKEN` is not configured. The CI workflow will show a warning but won't fail.

## CI Workflow

The quality workflow (`.github/workflows/quality.yml`) runs on every push and PR:

1. **Secret Scanning** (gitleaks) - Required, fails on secrets
2. **Lint & Type Check** - Required, fails on errors/warnings
3. **Unit Tests** - Required, fails on test failures
4. **SonarCloud** - Optional, skipped if token not configured
5. **Codecov** - Optional, skipped if token not configured
6. **Auto-Labeling** - Automatic, labels PRs based on files changed

## Best Practices

1. **Never commit secrets** - Use environment variables
2. **Run lint locally** before pushing
3. **Fix warnings** - Don't let them accumulate
4. **Write tests** for new features
5. **Keep dependencies updated** - Review Dependabot PRs regularly
6. **Monitor quality metrics** - Check SonarCloud/Codecov dashboards

## Troubleshooting

### Gitleaks False Positives

If Gitleaks flags something that's not a secret:

1. Add the file path to the allowlist in `.gitleaks.toml`
2. Or add a specific pattern to ignore

### ESLint Errors

If ESLint fails in CI but passes locally:

1. Ensure you're using the same Node.js version
2. Run `pnpm install` to sync dependencies
3. Check for uncommitted changes to `eslint.config.js`

### TypeScript Errors

If TypeScript fails in CI but passes locally:

1. Run `pnpm run typecheck` locally to reproduce
2. Ensure all dependencies are installed
3. Check for version mismatches in `package.json`
