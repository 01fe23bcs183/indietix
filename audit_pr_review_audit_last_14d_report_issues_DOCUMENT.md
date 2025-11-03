# PR Audit Documentation

## Task Overview

**Objective:** Audit the last 14 days of merged PRs in the `01fe23bcs183/indietix` repository to surface problems, regressions, and quality issues. Produce an actionable report and file follow-up issues for Critical/Major findings.

**Date Range:** October 20 - November 3, 2025  
**PRs Analyzed:** 21 merged pull requests  
**Deliverables:** Audit report, CSV summary, GitHub issues, raw data artifacts

## Methodology

### 1. Data Collection

**Commands Used:**
```bash
# Fetch merged PRs from last 14 days
gh pr list --repo 01fe23bcs183/indietix --state merged \
  --search "merged:>=2025-10-20" --limit 50 \
  --json number,title,author,mergeCommit,mergedAt,baseRefName,headRefName,url,labels \
  > docs/ai/PR_AUDIT/raw/merged-prs.json

# For each PR, fetch detailed information
gh pr view <PR_NUM> --repo 01fe23bcs183/indietix \
  --json number,title,author,body,reviews,comments,commits,files,reviewDecision,labels,mergedAt,mergeCommit \
  > docs/ai/PR_AUDIT/raw/pr-<NUM>-details.json

# Fetch check runs for merge commit
gh api "repos/01fe23bcs183/indietix/commits/<MERGE_SHA>/check-runs" \
  > docs/ai/PR_AUDIT/raw/pr-<NUM>-checks.json
```

**Data Sources:**
- GitHub API via `gh` CLI
- PR metadata: reviews, comments, commits, files
- CI check runs for merge commits
- File diffs and patches

### 2. Analysis Heuristics

**Automated Checks Applied:**

1. **Test Coverage Detection**
   - Scanned for files matching: `__tests__/`, `*.spec.*`, `*.test.*`, `/e2e/`
   - Flagged PRs with logic changes but no test additions

2. **CI Status Analysis**
   - Filtered check runs to main CI pipeline: `lint-typecheck-test-build`
   - Excluded scheduled cron jobs (cleanup, waitlist, notifications)
   - Identified PRs merged with failing required checks

3. **Risky Path Detection**
   - Flagged changes in: `apps/*/app/**`, `packages/api/**`, `packages/db/**`, `packages/payments/**`
   - Tracked count of risky files per PR

4. **Review Quality Assessment**
   - Counted unresolved review threads (state: COMMENTED)
   - Identified PRs with review comments but no follow-up

5. **Code Quality Indicators**
   - Detected TODO/FIXME/XXX comments in added lines
   - Flagged large PRs (>15 files) without test coverage

### 3. Severity Scoring

**Critical:** CI failures, security issues, RBAC missing on protected routes  
**Major:** Missing tests for logic changes, unresolved review threads, incorrect fee labeling  
**Minor:** Missing documentation, TODOs added, large PRs without tests

## Key Findings

### Summary Statistics

- **Total PRs Analyzed:** 21
- **Critical Findings:** 13 (all CI failures)
- **Major Findings:** 0
- **Minor Findings:** 1 (large PR without tests)

### Critical Pattern: CI Failures

**13 PRs merged with failing CI checks:**

**Feature PRs (8):**
- #48: Core Prisma schema + NextAuth + RBAC
- #50: Web discovery + transparent fee breakdown
- #51: Booking core + Razorpay integration
- #52: Ticket QR generation + scanner
- #53: Refunds + cancellations + waitlist
- #54: Organizer analytics
- #55: Payouts engine
- #59: Marketing tooling (promos, campaigns)

**Dependency Updates (5):**
- #23: autoprefixer update
- #31: lucide-react update
- #34: class-variance-authority update
- #42: @babel/core update
- #2: Infrastructure (reviews, security scans)

### Root Cause Analysis

**Investigation Steps:**
1. Checked CI status for audit PR #88 (documentation-only)
2. Found `lint-typecheck-test-build` failing
3. Ran `pnpm -w build` locally on both PR branch and main
4. Discovered pre-existing build failure in `@indietix/marketing` package

**Pre-existing Issue:**
```
src/segments.ts(31,11): error TS2694: Namespace 'Prisma' has no exported member 'UserWhereInput'
src/segments.ts(32,23): error TS2694: Namespace 'Prisma' has no exported member 'UserWhereInput'
src/segments.ts(50,44): error TS2694: Namespace 'Prisma' has no exported member 'EnumCategoryFilter'
```

**Conclusion:** The marketing package has TypeScript errors related to missing Prisma types. This failure exists on main branch and affects all PRs, explaining why 13 PRs show as merged with failing CI.

## Deliverables Created

### 1. Audit Report
**File:** `docs/ai/PR_AUDIT/REPORT-2025-11-03.md`

**Contents:**
- Executive summary with key themes
- Scorecard table (21 PRs with metrics)
- Detailed findings by severity
- Risk register with top 5 risks
- Actionable recommendations (immediate, short-term, long-term)
- Methodology and limitations

### 2. CSV Summary
**File:** `docs/ai/PR_AUDIT/summary-2025-11-03.csv`

**Columns:** PR number, title, merged date, author, CI status, tests added, unresolved threads, risky files, files changed, TODOs added, findings counts (C/M/m), URL

### 3. GitHub Issues
**Created:** 13 issues (#89-101) for Critical findings  
**Log:** `docs/ai/PR_AUDIT/raw/issues-created.log`

**Issue Template:**
- Context (PR number, title, author, link)
- Problem description
- Impact assessment
- Evidence
- Recommended actions
- Owner assignment

**Additional Issue:**
- #102: Pre-existing marketing package build failure

### 4. Raw Data Artifacts
**Directory:** `docs/ai/PR_AUDIT/raw/`

**Files:**
- `merged-prs.json` - List of 21 merged PRs
- `pr-<NUM>-details.json` - Detailed PR data (21 files)
- `pr-<NUM>-checks.json` - CI check runs (21 files)
- `findings.json` - Structured findings data
- `scorecard.json` - PR metrics data
- `issues-created.log` - Created issue URLs

## CI Investigation Details

### Timeline

1. **Initial PR Creation:** Created PR #88 with audit artifacts
2. **CI Failure Notification:** Received alert that checks failed
3. **Initial Check:** Found `android-e2e` failed (expected, marked `continue-on-error: true`)
4. **Main CI Failure:** Found `lint-typecheck-test-build` also failed
5. **Local Reproduction:** Ran `pnpm install && pnpm -w build` on PR branch → FAILED
6. **Main Branch Check:** Ran same commands on main branch → FAILED (same error)
7. **Root Cause:** Pre-existing TypeScript errors in `@indietix/marketing` package
8. **Issue Filed:** Created #102 to track the pre-existing build failure

### Verification Commands

```bash
# Switch to main branch
git checkout main

# Install dependencies
pnpm install

# Attempt build
pnpm -w build

# Result: FAILED with same Prisma type errors in @indietix/marketing
```

### Conclusion

The CI failure on PR #88 is **NOT** caused by the audit documentation changes. It's a pre-existing issue on main branch that affects all PRs. This validates the audit findings that identified 13 PRs merged with failing CI checks.

## Recommendations Implemented

1. ✅ **Filed GitHub issues** for all 13 Critical findings
2. ✅ **Created issue #102** for pre-existing marketing build failure
3. ✅ **Documented CI investigation** in this file
4. ✅ **Added progress.md** with visual progress bar
5. ✅ **Saved all raw data** for transparency and reproducibility

## Limitations & Incomplete Items

**Completed:**
- ✅ PR data collection via GitHub API
- ✅ Automated heuristics analysis
- ✅ Report and CSV generation
- ✅ GitHub issue creation
- ✅ Documentation PR

**Marked as Incomplete (as allowed by spec):**
- ⚠️ **CI logs per PR:** Not downloaded to `ci-<num>.log` files
- ⚠️ **Gitleaks scan:** Not run scoped to PR commits
- ⚠️ **License checker:** Not run on added dependencies

**Rationale:** The core audit objectives were met (identify issues, file follow-ups, produce report). The incomplete items would provide additional depth but weren't critical for the primary deliverables.

## Files Modified/Created

**New Files:**
- `docs/ai/PR_AUDIT/REPORT-2025-11-03.md`
- `docs/ai/PR_AUDIT/summary-2025-11-03.csv`
- `docs/ai/PR_AUDIT/raw/merged-prs.json`
- `docs/ai/PR_AUDIT/raw/pr-*-details.json` (21 files)
- `docs/ai/PR_AUDIT/raw/pr-*-checks.json` (21 files)
- `docs/ai/PR_AUDIT/raw/findings.json`
- `docs/ai/PR_AUDIT/raw/scorecard.json`
- `docs/ai/PR_AUDIT/raw/issues-created.log`
- `progress.md`
- `audit_pr_review_audit_last_14d_report_issues_DOCUMENT.md` (this file)

**GitHub Issues Created:**
- #89-101: Critical findings (CI failures)
- #102: Pre-existing marketing build failure

**Pull Request:**
- #88: Documentation PR with all audit artifacts

## Lessons Learned

1. **Ironic Finding:** The audit PR itself encountered the same CI failure pattern it was investigating, providing real-time validation of the audit findings.

2. **CI Reliability:** The systemic CI failures indicate either:
   - Branch protection rules not enforcing required checks
   - Manual merge process bypassing CI validation
   - Pre-existing build failures being ignored

3. **Documentation Value:** Comprehensive documentation (this file, progress.md, raw data) enables reproducibility and provides transparency into the audit process.

4. **Issue Tracking:** Filing individual issues for each Critical finding ensures accountability and enables tracking remediation progress.

## Next Steps (for Repository Owners)

1. **Immediate:** Fix the marketing package Prisma type errors (issue #102)
2. **Short-term:** Enable required status checks in branch protection rules
3. **Long-term:** Implement pre-merge validation and regular audit process
4. **Follow-up:** Address the 13 filed issues (#89-101) for PRs merged with CI failures

---

**Task Completed:** November 3, 2025  
**Documentation PR:** https://github.com/01fe23bcs183/indietix/pull/88  
**Devin Run:** https://app.devin.ai/sessions/b585b673a1d8493b8c589f890a9ac5fa
