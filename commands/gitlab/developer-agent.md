---
description: Developer agent that implements features and responds to test feedback
category: version-control-git
argument-hint: <issue_number>
allowed-tools: Bash(git *), Bash(glab *), Bash(jq *), Read, Write, Edit, Glob, Grep, Task
---

# GitLab Developer Agent

Implement feature development in response to GitLab issue requirements and test feedback.

## Command Usage

Provide issue number: $ARGUMENTS

## Overview

This agent runs in its own tmux session and communicates via state files in `.workflow/` directory. It:
1. Loads issue context and any previous test feedback
2. Implements the feature or fixes issues
3. Signals completion via state files
4. Waits for test results
5. Creates MR on success or re-implements on failure

## Step 1: Validate Environment

Check workflow is initialized:

```bash
ISSUE_NUMBER="$ARGUMENTS"
WORKFLOW_FILE=".workflow/workflow.json"
DEV_STATUS_FILE=".workflow/dev-status.json"

if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "Error: Workflow not initialized"
    echo "This agent should be launched by the orchestrator."
    echo "To start a new workflow, run: /orchestrator-agent $ISSUE_NUMBER"
    exit 1
fi

# Verify we're in a worktree
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required for state management"
    echo "Install with: brew install jq (macOS) or sudo apt-get install jq (Linux)"
    exit 1
fi
```

## Step 2: Load Context

Read workflow state and issue details:

```bash
echo "════════════════════════════════════════════════════════"
echo "  Developer Agent - Issue #$ISSUE_NUMBER"
echo "════════════════════════════════════════════════════════"
echo ""

# Load workflow metadata
ISSUE_URL=$(jq -r '.issue_url' "$WORKFLOW_FILE" 2>/dev/null)
ISSUE_TITLE=$(jq -r '.issue_title' "$WORKFLOW_FILE" 2>/dev/null)
CURRENT_ITERATION=$(jq -r '.current_iteration' "$WORKFLOW_FILE" 2>/dev/null || echo "1")
MAX_ITERATIONS=$(jq -r '.max_iterations' "$WORKFLOW_FILE" 2>/dev/null || echo "3")
WORKFLOW_STATE=$(jq -r '.workflow_state' "$WORKFLOW_FILE" 2>/dev/null)

echo "Issue: $ISSUE_TITLE"
echo "URL: $ISSUE_URL"
echo "Iteration: $CURRENT_ITERATION of $MAX_ITERATIONS"
echo "Workflow State: $WORKFLOW_STATE"
echo ""

# Fetch full issue details
echo "Fetching issue requirements..."
echo "────────────────────────────────────────────────────────"
glab issue view "$ISSUE_NUMBER"
echo "────────────────────────────────────────────────────────"
echo ""

# Check for test feedback from previous iteration
if [ -f ".workflow/test-results.json" ]; then
    PREV_TEST_STATUS=$(jq -r '.status' ".workflow/test-results.json" 2>/dev/null)
    PREV_TEST_ITERATION=$(jq -r '.iteration' ".workflow/test-results.json" 2>/dev/null)

    if [ "$PREV_TEST_STATUS" = "failed" ] && [ "$PREV_TEST_ITERATION" = "$((CURRENT_ITERATION - 1))" ]; then
        echo "⚠️  Previous Test Failures Detected (Iteration $PREV_TEST_ITERATION):"
        echo "────────────────────────────────────────────────────────"
        echo ""

        # Show failure summary
        FAILED_COUNT=$(jq -r '.test_summary.failed' ".workflow/test-results.json" 2>/dev/null || echo "0")
        TOTAL_COUNT=$(jq -r '.test_summary.total' ".workflow/test-results.json" 2>/dev/null || echo "0")
        echo "Failed: $FAILED_COUNT out of $TOTAL_COUNT tests"
        echo ""

        # Show specific failures
        if [ "$FAILED_COUNT" != "0" ]; then
            echo "Failed Tests:"
            jq -r '.failures[] | "  ❌ \(.test_name)\n     File: \(.file)\n     Error: \(.error_message)\n"' ".workflow/test-results.json" 2>/dev/null
        fi

        # Show feedback
        echo "Feedback from Tester:"
        jq -r '.feedback_for_developer' ".workflow/test-results.json" 2>/dev/null
        echo ""
        echo "────────────────────────────────────────────────────────"
        echo ""
        echo "Your task: Fix the above issues and ensure all tests pass."
        echo ""
    fi
fi
```

## Step 3: Update Development Status

Signal development start:

```bash
echo "Starting development work..."

# Update dev-status.json
jq --arg iter "$CURRENT_ITERATION" \
   --arg time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.status = "in_progress" |
    .iteration = ($iter | tonumber) |
    .start_time = $time |
    .end_time = null |
    .ready_for_testing = false |
    .notes = "Development in progress"' \
   "$DEV_STATUS_FILE" > "$DEV_STATUS_FILE.tmp" && \
   mv "$DEV_STATUS_FILE.tmp" "$DEV_STATUS_FILE"

echo "✓ Development status: IN PROGRESS"
echo ""
```

## Step 4: Implement Solution

**This is where you (Claude) implement the feature:**

```markdown
## Implementation Phase

You are now implementing the solution for Issue #$ISSUE_NUMBER.

### Your Task:
{ISSUE_TITLE}

### Requirements:
- Implement all functionality described in the issue above
- If this is iteration {CURRENT_ITERATION} > 1, address all test failures shown above
- Follow existing code patterns in the project (analyze with Glob/Read tools)
- Write clean, maintainable code following CLAUDE.md principles
- Add proper error handling

### Important Constraints:
- **DO NOT write tests** - that's the tester agent's responsibility
- **DO NOT commit yet** - wait for test results first
- Focus only on implementation code
- Keep changes focused on the issue requirements

### Process:
1. **Explore**: Use Glob and Read tools to understand project structure
2. **Plan**: Identify which files need to be created or modified
3. **Implement**: Use Edit/Write tools to make changes
4. **Validate**: Ensure code follows project conventions

### Guidelines:
- Read existing code before making changes
- Maintain consistent naming and style
- Don't over-engineer - keep it simple
- If unclear, the issue description is your source of truth

Begin implementation now.
```

---

**After you complete the implementation**, proceed to the next step.

## Step 5: Signal Completion

Update status when implementation is complete:

Once you have finished implementing the solution, run these commands to signal completion:

```bash
echo ""
echo "════════════════════════════════════════════════════════"
echo "  Implementation Complete"
echo "════════════════════════════════════════════════════════"
echo ""

# Collect modified files
MODIFIED_FILES=$(git status --porcelain | awk '{print $2}' | jq -R . | jq -s .)
FILE_COUNT=$(echo "$MODIFIED_FILES" | jq 'length')

echo "Files modified: $FILE_COUNT"
git status --short

echo ""

# Create change summary
CHANGES_SUMMARY="["
FIRST=true
for file in $(git status --porcelain | awk '{print $2}'); do
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        CHANGES_SUMMARY="${CHANGES_SUMMARY},"
    fi
    CHANGES_SUMMARY="${CHANGES_SUMMARY}\"Modified $file\""
done
CHANGES_SUMMARY="${CHANGES_SUMMARY}]"

# Update dev-status.json with completion
jq --argjson files "$MODIFIED_FILES" \
   --argjson changes "$CHANGES_SUMMARY" \
   --arg time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   --arg notes "Implementation complete for iteration '$CURRENT_ITERATION'. Ready for testing." \
   '.status = "complete" |
    .end_time = $time |
    .files_modified = $files |
    .changes_made = $changes |
    .ready_for_testing = true |
    .notes = $notes' \
   "$DEV_STATUS_FILE" > "$DEV_STATUS_FILE.tmp" && \
   mv "$DEV_STATUS_FILE.tmp" "$DEV_STATUS_FILE"

echo "✓ Development status updated: COMPLETE"
echo "✓ Ready for testing: YES"
echo ""
echo "Waiting for tester agent to run tests..."
echo "(This may take a few minutes)"
echo ""
```

## Step 6: Wait for Test Results

Monitor test-results.json for outcomes:

```bash
echo "Monitoring test results..."
echo ""

MAX_WAIT=45  # minutes
POLL_INTERVAL=30  # seconds
ELAPSED=0

while [ $ELAPSED -lt $((MAX_WAIT * 60)) ]; do
    if [ -f ".workflow/test-results.json" ]; then
        TEST_STATUS=$(jq -r '.status' ".workflow/test-results.json" 2>/dev/null)
        TEST_ITERATION=$(jq -r '.iteration' ".workflow/test-results.json" 2>/dev/null)

        # Only process results for current iteration
        if [ "$TEST_ITERATION" = "$CURRENT_ITERATION" ]; then
            if [ "$TEST_STATUS" = "passed" ]; then
                echo ""
                echo "════════════════════════════════════════════════════════"
                echo "  ✓ All Tests Passed!"
                echo "════════════════════════════════════════════════════════"
                echo ""

                # Show test summary
                jq -r '.test_summary | "Total Tests: \(.total)\nPassed: \(.passed)\nFailed: \(.failed)"' ".workflow/test-results.json"
                echo ""

                COVERAGE=$(jq -r '.coverage.lines' ".workflow/test-results.json" 2>/dev/null)
                if [ "$COVERAGE" != "null" ] && [ -n "$COVERAGE" ]; then
                    echo "Code Coverage: ${COVERAGE}%"
                    echo ""
                fi

                # Proceed to commit and MR creation
                break

            elif [ "$TEST_STATUS" = "failed" ]; then
                echo ""
                echo "════════════════════════════════════════════════════════"
                echo "  ✗ Tests Failed"
                echo "════════════════════════════════════════════════════════"
                echo ""

                # Show failures
                jq -r '.test_summary | "Total Tests: \(.total)\nPassed: \(.passed)\nFailed: \(.failed)"' ".workflow/test-results.json"
                echo ""

                echo "Failed Tests:"
                jq -r '.failures[] | "  ❌ \(.test_name)\n     \(.error_message)\n"' ".workflow/test-results.json" 2>/dev/null

                echo ""
                echo "Feedback:"
                jq -r '.feedback_for_developer' ".workflow/test-results.json"
                echo ""

                if [ "$CURRENT_ITERATION" -ge "$MAX_ITERATIONS" ]; then
                    echo "Maximum iterations reached. Workflow will fail."
                    echo "Manual intervention required."
                    exit 1
                fi

                echo "────────────────────────────────────────────────────────"
                echo "The orchestrator will start iteration $((CURRENT_ITERATION + 1))."
                echo "Please fix the issues above when prompted."
                echo "────────────────────────────────────────────────────────"

                # Reset status for rework (orchestrator will update iteration)
                jq '.status = "not_started" | .ready_for_testing = false' \
                   "$DEV_STATUS_FILE" > "$DEV_STATUS_FILE.tmp" && \
                   mv "$DEV_STATUS_FILE.tmp" "$DEV_STATUS_FILE"

                exit 0

            elif [ "$TEST_STATUS" = "error" ]; then
                echo ""
                echo "✗ Test Execution Error"
                echo ""
                echo "There was an error running the tests."
                echo "Check the tester session or logs for details."
                echo ""

                jq '.status = "blocked"' "$DEV_STATUS_FILE" > "$DEV_STATUS_FILE.tmp" && \
                   mv "$DEV_STATUS_FILE.tmp" "$DEV_STATUS_FILE"

                exit 1
            fi
        fi
    fi

    # Show periodic updates
    if [ $((ELAPSED % 60)) -eq 0 ] && [ $ELAPSED -gt 0 ]; then
        echo "[$(date +%H:%M:%S)] Still waiting for tests... (${ELAPSED}s elapsed)"
    fi

    sleep $POLL_INTERVAL
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

if [ $ELAPSED -ge $((MAX_WAIT * 60)) ]; then
    echo ""
    echo "Error: Test timeout after $MAX_WAIT minutes"
    echo "Check tester session: tmux attach -t ${ISSUE_NUMBER}-tester"
    exit 1
fi
```

## Step 7: Create Commit and MR

When tests pass, commit changes and create MR:

```bash
echo "Creating commit and merge request..."
echo ""

# Stage all changes
git add .

# Create commit message
COMMIT_MESSAGE=$(cat <<EOF
Implement ${ISSUE_TITLE}

Resolves #${ISSUE_NUMBER}

Changes made:
$(jq -r '.changes_made[]?' "$DEV_STATUS_FILE" | sed 's/^/- /')

Iterations: ${CURRENT_ITERATION}
Test Status: All tests passed
Coverage: $(jq -r '.coverage.lines // "N/A"' ".workflow/test-results.json" 2>/dev/null)%

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)

# Commit
git commit -m "$COMMIT_MESSAGE"

COMMIT_SHA=$(git rev-parse HEAD)
echo "✓ Commit created: $COMMIT_SHA"
echo ""

# Update dev-status with commit SHA
jq --arg sha "$COMMIT_SHA" '.commit_sha = $sha' \
   "$DEV_STATUS_FILE" > "$DEV_STATUS_FILE.tmp" && \
   mv "$DEV_STATUS_FILE.tmp" "$DEV_STATUS_FILE"

# Push branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Pushing branch: $CURRENT_BRANCH"
git push -u origin "$CURRENT_BRANCH"
echo ""

# Create MR
echo "Creating merge request..."
echo ""

# Build MR body
MR_BODY=$(cat <<EOF
## Summary

This MR implements: ${ISSUE_TITLE}

Resolves #${ISSUE_NUMBER}

## Changes

$(jq -r '.changes_made[]?' "$DEV_STATUS_FILE" | sed 's/^/- /')

## Test Results

- **Total Tests**: $(jq -r '.test_summary.total' ".workflow/test-results.json")
- **Passed**: $(jq -r '.test_summary.passed' ".workflow/test-results.json")
- **Failed**: $(jq -r '.test_summary.failed' ".workflow/test-results.json")
- **Coverage**: $(jq -r '.coverage.lines // "N/A"' ".workflow/test-results.json")%

## Development Process

- **Iterations**: ${CURRENT_ITERATION}
- **Development Time**: $(jq -r '.start_time' "$DEV_STATUS_FILE") to $(jq -r '.end_time' "$DEV_STATUS_FILE")
- **Automated Testing**: ✓ Passed

## Test Plan

All automated tests have passed. Manual verification steps:
- [ ] Review code changes
- [ ] Verify feature works as expected
- [ ] Check for edge cases

---

🤖 Generated with [Claude Code](https://claude.com/claude-code) Multi-Agent Workflow
EOF
)

# Create MR using glab
glab mr create \
    --title "Implement ${ISSUE_TITLE}" \
    --description "$MR_BODY" \
    --label "automated,claude-code" \
    --fill

MR_URL=$(glab mr list --author=@me --state=opened --limit=1 --json webUrl -q '.[0].webUrl')

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✓ Merge Request Created!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "MR URL: $MR_URL"
echo ""
echo "Next steps:"
echo "  1. Review the MR"
echo "  2. Merge when ready"
echo "  3. Cleanup: /clean-worktree $ISSUE_NUMBER"
echo ""
echo "Development workflow complete!"
echo "════════════════════════════════════════════════════════"
```

## Manual Mode

If running this agent manually (not via orchestrator):

```bash
# Ensure you're in a worktree with .workflow/ directory
cd ../worktrees/feature/123-something

# Run developer agent
claude
/developer-agent 123

# After making changes, manually update status:
jq '.status = "complete" | .ready_for_testing = true | .files_modified = ["src/file.ts"]' \
   .workflow/dev-status.json > .workflow/dev-status.json.tmp && \
   mv .workflow/dev-status.json.tmp .workflow/dev-status.json
```

## Notes

- Runs in dedicated tmux session: `<issue>-developer`
- Communicates via `.workflow/dev-status.json` and `.workflow/test-results.json`
- Does NOT write tests (tester's responsibility)
- Commits only after tests pass
- Supports iterative fixes based on test feedback
- Clear separation between implementation and testing phases

## Error Recovery

If this agent crashes or exits unexpectedly:

```bash
# Check current status
cat .workflow/dev-status.json | jq

# Resume development by re-running
claude
/developer-agent 123

# Or manually fix issues and update state files
```
