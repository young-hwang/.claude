---
description: Create a worktree for a GitLab issue in the parent directory
category: version-control-git
argument-hint: <gitlab_issue_url_or_number>
allowed-tools: Bash(glab *), Bash(git *), Bash(tmux *), Read, Edit, Write
---

# GitLab Issue Worktree Creation

Create a git worktree for a GitLab issue in the parent directory to keep the main working directory clean.

## Command Usage

Provide a GitLab issue URL or issue number: $ARGUMENTS

## Workflow

1. **Check glab CLI installation via `scripts/check_glab.sh`**
   - Executes the `scripts/check_glab.sh` script to verify `glab` is installed and authenticated.
   - The script will stop execution and provide instructions if `glab` is not found or configured.

2. **Extract and validate issue**
   - Parse issue number from URL or direct number input
   - Fetch issue details using `glab issue view`
   - Display issue title and description

3. **Determine branch name**
   - Fetch latest branches from remote using `git fetch --all --prune`
   - Search for existing branches with the issue number (e.g., `feature/123`, `issue-123`)
   - If no branch exists, create branch name from issue (e.g., `feature/123-feature-description`)

4. **Create Git Worktree**
    - Executes `scripts/create-git-worktree.sh` with the determined branch name.
    - This script handles the logic for creating the worktree.

5. **Initialize Spec-Kit**
    - Executes `scripts/init-spec-kit.sh` in the new worktree directory to set up the development environment.

6. **Create tmux Development Session**
    - Executes `scripts/create-tmux-session.sh` to create a named tmux session in the worktree directory. The session will be named `{issue_number}-develop`.







## Notes

- Worktrees are created in `../worktrees/` to keep the main project clean
- The command handles both issue URLs and issue numbers
- Uses `git fetch` to update branch list instead of `glab` for better reliability
- Automatically detects existing branches associated with the issue (supports `feature/{number}`, `issue-{number}` patterns)
- Creates descriptive branch names from issue title if no branch exists (format: `feature/{number}-{slug}`)
- Supports both local and remote branches
- Automatically creates a tmux session named `{issue-number}-develop` if tmux is installed
- Initializes spec-kit in the worktree directory before creating tmux session
- Automatically starts claude code in the tmux session for immediate development
