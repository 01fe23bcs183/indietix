# Progress Tracking

This document describes the automated progress tracking system for IndieTix.

## Overview

The project uses an automated system to track progress across milestones and tasks. The system:

1. Reads task definitions from `project/tasks.json`
2. Scans git commits for task completion tokens (T01, T02, etc.)
3. Updates task status automatically when merged to main
4. Generates a progress report in `PROGRESS.md`
5. Runs automatically on push to main and every 8 hours

## Task Definition

Tasks are defined in `project/tasks.json` with the following structure:

```json
{
  "project": "IndieTix",
  "description": "Event booking platform for the Indian market",
  "milestones": [
    {
      "id": "M01",
      "name": "Foundation & Infrastructure",
      "description": "Core project setup, monorepo structure, and CI/CD",
      "weight": 25,
      "tasks": [
        {
          "id": "T01",
          "name": "Repository initialization",
          "description": "Initialize Git repository with basic configuration",
          "status": "done",
          "assignee": "iamjeevanh"
        }
      ]
    }
  ]
}
```

### Milestone Fields

- **id**: Unique identifier (M01, M02, etc.)
- **name**: Short milestone name
- **description**: What this milestone achieves
- **weight**: Relative importance (used for overall progress calculation)
- **tasks**: Array of tasks in this milestone

### Task Fields

- **id**: Unique identifier (T01, T02, etc.)
- **name**: Short task name
- **description**: What this task achieves
- **status**: Current status (`pending`, `in_progress`, `done`)
- **assignee**: GitHub username of the person responsible

## Task Status

Tasks can have three statuses:

- **pending**: Not yet started
- **in_progress**: Currently being worked on
- **done**: Completed and merged to main

## Automatic Status Updates

When you merge a PR to main, include the task token (e.g., `T01`, `T02`) in the commit message or PR title. The automation script will:

1. Scan recent commits for task tokens
2. Mark matching tasks as `done`
3. Recalculate progress percentages
4. Update `PROGRESS.md`

### Example Commit Messages

Good commit messages that will trigger automatic updates:

```
feat: implement user authentication [T05]
fix: resolve database connection issue (T07)
chore: add CI/CD pipeline - T03
```

The script looks for patterns like `T\d{2}` (T followed by 2 digits) anywhere in the commit message.

## Progress Calculation

### Milestone Progress

Milestone progress is calculated as:

```
(number of done tasks / total tasks) * 100
```

### Overall Progress

Overall progress is a weighted average:

```
sum(milestone_progress * milestone_weight) / sum(all_weights)
```

This ensures that more important milestones have greater impact on overall progress.

## Progress Report

The progress report (`PROGRESS.md`) is automatically generated and includes:

- Overall progress bar
- Progress by milestone
- Detailed task list with status
- Last updated timestamp

## Automation Workflow

The progress automation runs via `.github/workflows/progress.yml`:

### Triggers

1. **Push to main**: Updates immediately when code is merged
2. **Scheduled**: Runs every 8 hours (00:00, 08:00, 16:00 UTC)
3. **Manual**: Can be triggered manually from GitHub Actions

### Process

1. Checkout repository with full history
2. Install dependencies
3. Run `scripts/update-progress.ts`
4. Commit and push `PROGRESS.md` if changed

## Manual Usage

You can run the progress update script locally:

```bash
# Install dependencies
pnpm install

# Run the script
npx ts-node scripts/update-progress.ts

# Or with npm
npm install
npx ts-node scripts/update-progress.ts
```

This will:
- Scan your local git history
- Update task statuses based on commits
- Generate `PROGRESS.md`
- Print progress summary to console

## Dry Run

To test the progress automation without committing:

```bash
# Run the script
npx ts-node scripts/update-progress.ts

# Review the generated PROGRESS.md
cat PROGRESS.md

# If satisfied, commit the changes
git add PROGRESS.md
git commit -m "chore: update progress report"
```

## Adding New Tasks

To add new tasks:

1. Edit `project/tasks.json`
2. Add the task to the appropriate milestone
3. Assign a unique task ID (T01, T02, etc.)
4. Set initial status to `pending`
5. Commit the changes
6. The next progress update will include the new task

## Modifying Milestones

To modify milestones:

1. Edit `project/tasks.json`
2. Update milestone name, description, or weight
3. Adjust task assignments if needed
4. Commit the changes
5. Run the progress script to regenerate the report

## Best Practices

1. **Use task tokens in commits**: Always include task IDs in commit messages
2. **Keep tasks granular**: Break large tasks into smaller, trackable units
3. **Update status manually**: If a task is in progress, update `tasks.json` manually
4. **Review progress regularly**: Check `PROGRESS.md` to track team progress
5. **Adjust weights**: Update milestone weights if priorities change

## Troubleshooting

### Script Fails to Run

If the script fails:

1. Check that `project/tasks.json` is valid JSON
2. Ensure Node.js 20+ is installed
3. Install dependencies: `pnpm install`
4. Check for TypeScript errors: `npx tsc --noEmit scripts/update-progress.ts`

### Tasks Not Marked as Done

If tasks aren't being marked as done:

1. Verify the task token is in the commit message
2. Check that commits are on the main branch
3. Run the script manually to see what tokens are found
4. Ensure the token format matches `T\d{2}` (e.g., T01, T12)

### Progress Not Updating in CI

If the workflow isn't running:

1. Check GitHub Actions tab for errors
2. Verify the workflow file is in `.github/workflows/progress.yml`
3. Ensure the workflow has write permissions
4. Check that the schedule cron syntax is correct

## Future Enhancements

Potential improvements to the progress tracking system:

- Slack/Discord notifications on milestone completion
- Progress dashboard with charts and graphs
- Integration with GitHub Projects
- Burndown charts and velocity tracking
- Task time estimates and actual time tracking
