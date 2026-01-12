---
description: Orchestrate multi-agent development workflow for GitLab issue with developer and tester agents
category: version-control-git
argument-hint: <gitlab_issue_url_or_number>
allowed-tools: Bash(glab *), Bash(git *), Bash(tmux *), Bash(jq *), Bash(chmod *), Read, Write
---

# GitLab Multi-Agent Workflow Orchestrator

Orchestrate a complete development workflow using separate orchestrator, developer, and tester agents in isolated tmux sessions.

## Command Usage

Provide a GitLab issue URL or issue number: $ARGUMENTS

## Workflow Overview

This command will:
1. Validate dependencies (glab, git, tmux, jq)
2. Create worktree and initialize workflow state
3. Launch orchestrator in dedicated tmux session
4. Orchestrator will manage developer and tester agents
5. Report orchestrator session name for monitoring

## Step 1: Validate Dependencies

```bash
# Check glab CLI installation
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

# Check glab authentication
if ! glab auth status &> /dev/null; then
    echo "Error: glab is not authenticated"
    echo "Please run: glab auth login"
    exit 1
fi

# Check tmux installation
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux is required for multi-agent workflow"
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install tmux"
    echo "  Linux:   sudo apt-get install tmux"
    echo ""
    exit 1
fi

# Check jq installation
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required for JSON state management"
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install jq"
    echo "  Linux:   sudo apt-get install jq"
    echo ""
    exit 1
fi
```

## Step 2: Parse Issue and Create Worktree

```bash
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
    echo "Examples:"
    echo "  /orchestrator-agent 123"
    echo "  /orchestrator-agent #123"
    echo "  /orchestrator-agent https://gitlab.com/org/project/-/issues/123"
    exit 1
fi

echo "════════════════════════════════════════════════════════"
echo "  GitLab Multi-Agent Workflow"
echo "════════════════════════════════════════════════════════"
echo ""

# Fetch issue details
echo "Fetching issue #$ISSUE_NUMBER..."
ISSUE_TITLE=$(glab issue view "$ISSUE_NUMBER" --json title -q '.title' 2>/dev/null)

if [ -z "$ISSUE_TITLE" ]; then
    echo "Error: Could not fetch issue #$ISSUE_NUMBER"
    echo "Please verify the issue exists and you have access."
    exit 1
fi

ISSUE_DESCRIPTION=$(glab issue view "$ISSUE_NUMBER" --json description -q '.description' 2>/dev/null)

echo "Issue: $ISSUE_TITLE"
echo ""

# Update branch list from remote
echo "Fetching latest branches from remote..."
git fetch --all --prune

# Check for existing branches related to this issue
EXISTING_BRANCH=$(git branch -a | grep -E "(feature[/-]${ISSUE_NUMBER}[^0-9]|feature[/-]${ISSUE_NUMBER}$)" | head -n 1 | sed 's/^[* ]*//' | sed 's/remotes\/origin\///' | xargs)

if [ -n "$EXISTING_BRANCH" ]; then
    echo "Found existing branch: $EXISTING_BRANCH"
    BRANCH_NAME="$EXISTING_BRANCH"
else
    # Create branch name from issue
    SLUG=$(echo "$ISSUE_TITLE" | iconv -t ascii//TRANSLIT | sed -r s/[^a-zA-Z0-9]+/-/g | sed -r s/^-+\|-+$//g | tr A-Z a-z | cut -c1-50)
    BRANCH_NAME="feature/${ISSUE_NUMBER}-${SLUG}"
    echo "Creating new branch: $BRANCH_NAME"
fi

# Create worktree in parent directory
WORKTREE_DIR="../worktrees/$BRANCH_NAME"
mkdir -p "../worktrees"

# Check if worktree already exists
EXISTING_WORKTREE=$(git worktree list | grep "$BRANCH_NAME" | awk '{print $1}')

if [ -n "$EXISTING_WORKTREE" ]; then
    echo "Warning: Worktree already exists at: $EXISTING_WORKTREE"
    WORKTREE_ABS_PATH=$(cd "$EXISTING_WORKTREE" && pwd)

    # Check if workflow is already running
    if [ -f "$WORKTREE_ABS_PATH/.workflow/workflow.json" ]; then
        CURRENT_STATE=$(jq -r '.workflow_state' "$WORKTREE_ABS_PATH/.workflow/workflow.json" 2>/dev/null)
        if [ "$CURRENT_STATE" != "complete" ] && [ "$CURRENT_STATE" != "failed" ]; then
            echo "Error: Workflow is already running for this issue (state: $CURRENT_STATE)"
            echo "Sessions:"
            jq -r '.sessions | to_entries[] | "  \(.key): \(.value)"' "$WORKTREE_ABS_PATH/.workflow/workflow.json"
            echo ""
            echo "To attach to a session: tmux attach -t <session-name>"
            echo "To force restart, first run: /clean-worktree $ISSUE_NUMBER"
            exit 1
        fi
    fi
else
    # Create new worktree
    if [ -d "$WORKTREE_DIR" ]; then
        echo "Warning: Directory exists at $WORKTREE_DIR but is not a registered worktree"
        echo "Removing directory and creating proper worktree..."
        rm -rf "$WORKTREE_DIR"
    fi

    # Check if branch exists locally or remotely
    if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
        echo "Creating worktree from existing local branch..."
        git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"
    elif git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
        echo "Creating worktree from remote branch..."
        git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"
    else
        echo "Creating new branch and worktree..."
        git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR"
    fi
fi

WORKTREE_ABS_PATH=$(cd "$WORKTREE_DIR" && pwd)
echo "✓ Worktree ready at: $WORKTREE_ABS_PATH"
echo ""
```

## Step 3: Initialize Workflow State

```bash
echo "Initializing workflow state..."

# Create workflow directory structure
mkdir -p "$WORKTREE_ABS_PATH/.workflow/logs"

# Get GitLab project info
REPO_INFO=$(glab repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown/unknown")

# Create workflow.json
cat > "$WORKTREE_ABS_PATH/.workflow/workflow.json" <<EOF
{
  "issue_number": "$ISSUE_NUMBER",
  "issue_url": "https://gitlab.com/$REPO_INFO/-/issues/$ISSUE_NUMBER",
  "issue_title": "$ISSUE_TITLE",
  "workflow_state": "initializing",
  "current_iteration": 0,
  "max_iterations": 3,
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sessions": {
    "orchestrator": "${ISSUE_NUMBER}-orchestrator",
    "developer": "${ISSUE_NUMBER}-developer",
    "tester": "${ISSUE_NUMBER}-tester"
  }
}
EOF

# Create initial dev-status.json
cat > "$WORKTREE_ABS_PATH/.workflow/dev-status.json" <<EOF
{
  "status": "not_started",
  "iteration": 0,
  "start_time": null,
  "end_time": null,
  "changes_made": [],
  "files_modified": [],
  "commit_sha": null,
  "ready_for_testing": false,
  "notes": "Waiting for developer agent to start"
}
EOF

# Create iteration history
cat > "$WORKTREE_ABS_PATH/.workflow/iteration-history.json" <<EOF
{
  "iterations": []
}
EOF

# Ensure .workflow is gitignored
if ! grep -q "^\.workflow/$" "$WORKTREE_ABS_PATH/.gitignore" 2>/dev/null; then
    echo ".workflow/" >> "$WORKTREE_ABS_PATH/.gitignore"
fi

echo "✓ Workflow state initialized"
echo ""
```

## Step 4: Launch Orchestrator in Tmux Session

```bash
ORCHESTRATOR_SESSION="${ISSUE_NUMBER}-orchestrator"

echo "Launching orchestrator in tmux session..."

# Check if orchestrator session already exists
if tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null; then
    echo "Error: Orchestrator session '$ORCHESTRATOR_SESSION' already exists"
    echo "To attach: tmux attach -t $ORCHESTRATOR_SESSION"
    echo "To kill: tmux kill-session -t $ORCHESTRATOR_SESSION"
    exit 1
fi

# Get absolute path to orchestrator script
CLAUDE_DIR="$HOME/.claude"
ORCHESTRATOR_SCRIPT="$CLAUDE_DIR/scripts/orchestrator-workflow.sh"

# Ensure script exists
if [ ! -f "$ORCHESTRATOR_SCRIPT" ]; then
    echo "Error: Orchestrator script not found at: $ORCHESTRATOR_SCRIPT"
    exit 1
fi

# Make script executable
chmod +x "$ORCHESTRATOR_SCRIPT"

# Create orchestrator tmux session and run the script
tmux new-session -d -s "$ORCHESTRATOR_SESSION" -c "$WORKTREE_ABS_PATH"

# Run orchestrator script in the session
tmux send-keys -t "$ORCHESTRATOR_SESSION" "bash '$ORCHESTRATOR_SCRIPT' '$ISSUE_NUMBER' '$WORKTREE_ABS_PATH'" C-m

echo "✓ Orchestrator launched in session: $ORCHESTRATOR_SESSION"
echo ""
```

## Step 5: Display Summary

```bash
echo "════════════════════════════════════════════════════════"
echo "  Workflow Started Successfully!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Issue: #$ISSUE_NUMBER - $ISSUE_TITLE"
echo "Worktree: $WORKTREE_ABS_PATH"
echo "Branch: $BRANCH_NAME"
echo ""
echo "Active Sessions:"
echo "  Orchestrator: tmux attach -t $ORCHESTRATOR_SESSION"
echo "  (Developer and Tester sessions will be created by orchestrator)"
echo ""
echo "Workflow State: $WORKTREE_ABS_PATH/.workflow/"
echo ""
echo "To monitor progress:"
echo "  tmux attach -t $ORCHESTRATOR_SESSION"
echo ""
echo "To view session list:"
echo "  tmux list-sessions | grep $ISSUE_NUMBER"
echo ""
echo "After completion, cleanup with:"
echo "  /clean-worktree $ISSUE_NUMBER"
echo ""
echo "════════════════════════════════════════════════════════"
```

## Notes

- Creates three independent tmux sessions:
  - `<issue>-orchestrator` - Coordinates the workflow
  - `<issue>-developer` - Implements features
  - `<issue>-tester` - Runs tests
- All sessions remain available for inspection after completion
- State files in `.workflow/` enable recovery from crashes
- Orchestrator automatically manages dev-test iteration cycles (max 3)
- All state files are gitignored for clean repositories

## Error Handling

The orchestrator handles these scenarios:
- Developer timeout (60 min) - exits gracefully, sessions remain
- Tester timeout (30 min) - exits with error, sessions remain
- Test execution errors - workflow fails, logs available
- Max iterations exceeded - workflow fails, requires manual fix
- Missing dependencies - early validation with install instructions
- Workflow already running - prevents duplicate runs

## Manual Recovery

If the orchestrator exits unexpectedly:

```bash
# Check workflow state
cat ../worktrees/feature/123-*/.workflow/workflow.json | jq

# Attach to orchestrator session
tmux attach -t 123-orchestrator

# Or manually attach to individual sessions
tmux attach -t 123-developer
tmux attach -t 123-tester

# Restart orchestrator if needed
/orchestrator-agent 123
```
