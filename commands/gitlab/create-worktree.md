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

1. **Check glab CLI installation**
   - Verify glab is installed and authenticated
   - If not installed, provide installation instructions and stop

2. **Extract and validate issue**
   - Parse issue number from URL or direct number input
   - Fetch issue details using `glab issue view`
   - Display issue title and description

3. **Determine branch name**
   - Fetch latest branches from remote using `git fetch --all --prune`
   - Search for existing branches with the issue number (e.g., `feature/123`, `issue-123`)
   - If no branch exists, create branch name from issue (e.g., `feature/123-feature-description`)

4. **Create worktree, tmux session, and initialize spec-kit**
    - Execute external script to create the worktree and session.
    - The script handles checking for existing worktrees, creating the branch if needed, and setting up the tmux environment.

5. **Provide next steps**
    - The script will output the final status and instructions.

## Example Implementation

```bash
# Step 1: Check glab installation
if ! command -v glab &> /dev/null; then
    echo "Error: glab CLI is not installed"
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install glab"
    echo "  Linux:   See https://gitlab.com/gitlab-org/cli#installation"
    echo "  Windows: scoop install glab"
    echo ""
    echo "After installation, authenticate with: glab auth login"
    exit 1
fi

# Check authentication
if ! glab auth status &> /dev/null; then
    echo "Error: glab is not authenticated"
    echo "Please run: glab auth login"
    exit 1
fi

# Step 2: Extract issue number
ISSUE_INPUT="$ARGUMENTS"

# Handle different input formats
if [[ "$ISSUE_INPUT" =~ /-/issues/([0-9]+) ]]; then
    # Full URL format
    ISSUE_NUMBER="${BASH_REMATCH[1]}"
elif [[ "$ISSUE_INPUT" =~ ^#?([0-9]+)$ ]]; then
    # Issue number format (#123 or 123)
    ISSUE_NUMBER="${BASH_REMATCH[1]}"
else
    echo "Error: Invalid issue format. Provide URL or issue number."
    exit 1
fi

# Step 3: Fetch issue details
echo "Fetching issue #$ISSUE_NUMBER..."
ISSUE_TITLE=$(glab issue view "$ISSUE_NUMBER" --json title -q '.title')

if [ -z "$ISSUE_TITLE" ]; then
    echo "Error: Could not fetch issue #$ISSUE_NUMBER"
    exit 1
fi

echo "Issue: $ISSUE_TITLE"

# Step 4: Determine branch name
# Update branch list from remote
echo "Fetching latest branches from remote..."
git fetch --all --prune

# Check for existing branches related to this issue
# Search for branches containing the issue number (e.g., feature/123, issue-123, 123-feature, etc.)
EXISTING_BRANCHES=$(git branch -a | grep -E "(feature[/-]${ISSUE_NUMBER}[^0-9]|feature[/-]${ISSUE_NUMBER}$|issue[-_]${ISSUE_NUMBER}|${ISSUE_NUMBER}[-_])" | head -n 1 | sed 's/^[* ]*//' | sed 's/remotes\/origin\///')

if [ -n "$EXISTING_BRANCHES" ]; then
    # Remove any whitespace
    BRANCH_NAME=$(echo "$EXISTING_BRANCHES" | xargs)
    echo "Found existing branch: $BRANCH_NAME"
else
    # Create branch name from issue in feature/{issue-number}-{slug} format
    SLUG=$(echo "$ISSUE_TITLE" | iconv -t ascii//TRANSLIT | sed -r s/[^a-zA-Z0-9]+/-/g | sed -r s/^-+\|-+$//g | tr A-Z a-z | cut -c1-50)
    BRANCH_NAME="feature/${ISSUE_NUMBER}-${SLUG}"
    echo "No existing branch found. Suggested branch name: $BRANCH_NAME"
fi

# Step 5: Execute worktree creation script
# The script is assumed to be in the `scripts` directory of the project root
SCRIPT_PATH="./scripts/create-gitlab-worktree.sh"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: Worktree creation script not found at $SCRIPT_PATH"
    exit 1
fi

# Execute the script, passing the determined parameters
bash "$SCRIPT_PATH" "$BRANCH_NAME" "$ISSUE_NUMBER" "$ISSUE_TITLE"
```

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
