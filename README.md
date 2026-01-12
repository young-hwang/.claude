# Claude Code Configuration Repository

This repository manages global configuration and customization for [Claude Code](https://claude.com/claude-code).

## 📁 Project Structure

```
.claude/
├── CLAUDE.md                    # Global instructions (applied to all projects)
├── settings.json                # Global settings file
├── .gitignore                   # Git ignore list
│
├── commands/                    # Claude Code skills/commands
│   ├── common/                  # Common development commands
│   ├── git/                     # Git-related commands
│   ├── github/                  # GitHub integration commands
│   ├── gitlab/                  # GitLab integration commands
│   └── rapid-development/       # Rapid development workflows
│
├── plugins/                     # Plugin management
│   ├── marketplaces/            # Plugin marketplaces
│   ├── repos/                   # Plugin repositories
│   └── config.json              # Plugin configuration
│
├── hooks/                       # Claude Code hook scripts
└── scripts/                     # Utility scripts
```

## 🎯 Key Components

### 1. CLAUDE.md - Global Instructions
Defines rules and principles that Claude Code must follow across all projects:
- Code quality and standards
- File management rules
- Architecture respect
- Security and best practices

### 2. settings.json - Global Configuration
Settings that control Claude Code behavior:
- **cleanupPeriodDays**: File cleanup period (default: 20 days)
- **permissions**: Tool usage permissions
  - `allow`: List of tools that can be used without approval
  - `defaultMode`: Permission mode (bypassPermissions)
- **verbose**: Detailed logging output
- **output-format**: Output format (json)

### 3. Commands - Skills Library

#### 📦 Common Commands
Commands for general development tasks:
- `bug-fix` - Systematic bug fix workflow
- `refactor-simple` - Quick refactoring
- `review-general` - Code review
- `review-staged-unstaged` - Review staged/unstaged files
- `optimize` - Performance optimization
- `code_analysis` - Code analysis
- `clean` - Fix linting and formatting issues
- `debug-RCA` - Debug and root cause analysis
- `tdd` - Test-driven development workflow
- `run-ci` - Run CI checks and fix errors
- `todo` - Project todo management
- `prime` / `prime-core` - Load project context
- `create-docs` - Generate technical specifications
- `add-to-changelog` - Update CHANGELOG
- `update-docs` - Update documentation
- `release` - Prepare release
- `create-command` - Create new command
- `onboarding` - New developer onboarding analysis
- `five` - Five Whys root cause analysis

#### 🔧 Git Commands
Commands for Git operations:
- `commit` - Generate conventional commit messages
- `create-worktree` - Create Git worktree
- `conflict-resolver-general` - Resolve merge conflicts
- `smart-resolver` - Intelligent conflict resolution

#### 🐙 GitHub Commands
GitHub integration commands:
- `create-pr` - Create Pull Request
- `pr-review` - Multi-perspective PR review
- `create-docs` - Generate technical specs from GitHub issues

#### 🦊 GitLab Commands
GitLab integration commands:
- `create-mr` - Create Merge Request
- `pr-review` - Multi-perspective MR review
- `create-worktree` - Create worktree for GitLab issue
- `clean-worktree` - Cleanup worktree and tmux session
- `orchestrator-agent` - Orchestrate multi-agent development workflow
- `developer-agent` - Developer agent (typically invoked by orchestrator)
- `tester-agent` - Testing agent (typically invoked by orchestrator)

#### ⚡ Rapid Development
Experimental commands for rapid development:
- `hackathon-research` - Hackathon multi-option research
- `prp-*` - PRP (Parallel Research Planning) series

### 4. Plugins
Plugin system to extend Claude Code functionality

### 5. Hooks
Define custom behaviors for Claude Code events

## 🚀 Usage

### Running Skills
```bash
# Execute a skill in Claude Code
/skill-name

# Examples
/commit               # Create Git commit
/review-general       # Code review
/create-pr           # Create Pull Request
```

### Modifying Settings
Edit `settings.json` to change permissions, cleanup period, etc.

### Customizing Global Instructions
Modify `CLAUDE.md` to adjust how Claude Code behaves across all projects.

## 🤖 Multi-Agent Workflow

The multi-agent workflow system enables automated development using separate orchestrator, developer, and tester agents running in isolated tmux sessions.

### Architecture

The workflow consists of three specialized agents:
- **Orchestrator Agent**: Coordinates the entire workflow, monitors progress, and manages iterations
- **Developer Agent**: Implements features and fixes issues based on requirements and test feedback
- **Tester Agent**: Runs tests, analyzes results, and provides structured feedback

### Workflow Process

```
User: /orchestrator-agent <issue-number>
  ↓
Create Worktree + State Directory
  ↓
Launch Developer Agent (tmux session)
  ↓
Developer: Implement Feature
  ↓
Launch Tester Agent (tmux session)
  ↓
Tester: Run Tests
  ↓
Tests Passed?
  ├─ Yes → Commit + Create MR → Complete
  └─ No → Developer: Fix Issues → Retry (max 3 iterations)
```

### State Management

Agents communicate via JSON state files in `.workflow/` directory (gitignored):
- `workflow.json` - Overall workflow coordination
- `dev-status.json` - Developer progress and status
- `test-results.json` - Test outcomes and feedback
- `iteration-history.json` - Audit trail of all iterations
- `logs/` - Session logs and test output

### Tmux Session Naming

Sessions are named by role: `<issue-number>-<role>`
- `123-orchestrator` - Orchestrator monitoring session
- `123-developer` - Developer implementation session
- `123-tester` - Tester execution session

### Usage Example

```bash
# Start orchestrated workflow for GitLab issue #456
$ claude
> /orchestrator-agent 456

# Orchestrator automatically:
# 1. Creates worktree at ../worktrees/feature/456-*
# 2. Initializes .workflow/ state directory
# 3. Launches developer session (456-developer)
# 4. Waits for development completion
# 5. Launches tester session (456-tester)
# 6. Coordinates dev-test iteration cycles
# 7. Creates MR when all tests pass

# Observe agents in separate terminals (optional):
$ tmux attach -t 456-developer
$ tmux attach -t 456-tester

# After completion:
> /clean-worktree 456
```

### Manual Agent Usage

Agents can also be run manually for debugging or custom workflows:

```bash
# Run developer agent manually
$ cd ../worktrees/feature/456-*
$ claude
> /developer-agent 456

# Run tester agent manually
> /tester-agent 456
```

### Error Handling

The system handles common failure scenarios:
- **Developer timeout** (60 min) - Orchestrator exits gracefully, sessions remain for inspection
- **Test failures** - Up to 3 automatic retry iterations with structured feedback
- **Test timeout** (30 min) - Workflow fails with clear error messages
- **Max iterations exceeded** - Requires manual intervention
- **Missing dependencies** - Early validation with installation instructions

### State File Examples

**workflow.json**:
```json
{
  "issue_number": "456",
  "workflow_state": "testing",
  "current_iteration": 2,
  "max_iterations": 3,
  "sessions": {
    "orchestrator": "456-orchestrator",
    "developer": "456-developer",
    "tester": "456-tester"
  }
}
```

**dev-status.json**:
```json
{
  "status": "complete",
  "iteration": 2,
  "ready_for_testing": true,
  "files_modified": ["src/user.service.ts", "src/user.controller.ts"],
  "notes": "Implementation complete for iteration 2"
}
```

**test-results.json**:
```json
{
  "iteration": 2,
  "status": "passed",
  "test_summary": {"total": 25, "passed": 25, "failed": 0},
  "coverage": {"lines": 87.5},
  "feedback_for_developer": "All tests passed! Great work!"
}
```

### Supported Test Frameworks

The tester agent auto-detects and supports:
- **Node.js**: Jest, Vitest, Mocha (via `npm test`)
- **Java**: JUnit (via Gradle or Maven)
- **Python**: pytest
- **Rust**: cargo test

### Benefits

- **Automation**: Eliminates repetitive worktree creation, testing, and MR creation
- **Consistency**: Standardized development workflow across all issues
- **Traceability**: Complete audit trail in iteration history
- **Resilience**: State files enable recovery from crashes
- **Visibility**: Real-time monitoring via tmux sessions
- **Quality**: Automated testing ensures code quality before MR creation

### Technical Details

For complete implementation details and architecture decisions, see:
- `/Users/young/.claude/plans/jazzy-beaming-fog.md` (English)
- `/Users/young/.claude/multi-agent-workflow-ko.md` (Korean)

## 📝 Version Control Strategy

### Version-Controlled Files
- `CLAUDE.md` - Global instructions
- `settings.json` - Global settings
- `.gitignore` - Ignore list
- `commands/` - Skills definitions
- `plugins/config.json` - Plugin configuration
- `hooks/` - Hook scripts
- `scripts/` - Utility scripts

### Ignored Files
- `.anthropic/` - Authentication information
- `history.jsonl` - Conversation history
- `file-history/` - File change history
- `todos/` - Todo lists
- `projects/` - Project data
- `agents/` - Agent runtime data
- `session-env/` - Session environment
- `debug/` - Debug information
- `shell-snapshots/` - Shell snapshots
- `stats-cache.json` - Statistics cache
- `statsig/` - Statistics data
- `telemetry/` - Telemetry data
- `ide/` - IDE settings

## 🔒 Security Considerations

- The `.anthropic/` directory contains authentication information - never share it
- Do not include sensitive information like API keys, tokens, or passwords in config files
- Ensure `.gitignore` is properly configured before pushing to public repositories

## 🛠️ Maintenance

### Cleanup Period
Old files are automatically cleaned based on the `cleanupPeriodDays` setting in `settings.json` (default: 20 days).

### Backup Recommendations
Regular backups of important skills and settings are recommended:
- `CLAUDE.md`
- `settings.json`
- Entire `commands/` directory
- Custom `hooks/` and `scripts/`

## 📚 Resources

- [Claude Code Official Documentation](https://docs.anthropic.com)
- [Claude Code GitHub](https://github.com/anthropics/claude-code)

## 📄 License

This configuration repository is for personal use.

---

**Last Updated**: 2026-01-08
