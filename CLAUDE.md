# CLAUDE Global Rules

This file provides universal guidance to Claude Code (claude.ai/code) when working with any codebase.

## Golden Rule

When unsure about implementation details, ALWAYS ask the developer.

## Core Principles

### Code Quality & Standards
- **Follow existing conventions**: Always analyze and mimic the project's existing code style, naming conventions, and architectural patterns
- **Maintain consistency**: Use the same libraries, frameworks, and patterns already established in the codebase
- **Security first**: Never introduce code that exposes secrets, keys, or sensitive information
- **No assumptions**: Never assume libraries are available - always check package.json, pom.xml, requirements.txt, etc.

### Development Approach
- **Understand before changing**: Read and analyze existing code structure before making modifications
- **Incremental changes**: Make small, focused changes rather than large refactoring unless explicitly requested
- **Test awareness**: Understand the testing approach (unit, integration, e2e) before making changes
- **Documentation respect**: Don't create documentation files unless explicitly requested

## File Management Rules

### Reading & Analysis
- **Read first**: Always use Read tool to understand file contents before editing
- **Context matters**: Look at neighboring files, imports, and dependencies to understand patterns
- **Architecture awareness**: Understand the project's architectural layers and boundaries

### Editing Guidelines
- **Preserve formatting**: Maintain exact indentation, spacing, and line endings as shown in Read output
- **Prefer editing**: Always prefer editing existing files over creating new ones
- **Atomic changes**: Make complete, working changes that don't break the codebase
- **No comments**: Don't add code comments unless explicitly requested

### File Creation Rules
- **Avoid creation**: Only create new files when absolutely necessary for the task
- **No proactive docs**: Never create README.md, documentation files, or similar unless explicitly requested
- **Follow structure**: If creating files, follow the project's existing directory structure and naming conventions

## Architecture Respect

### Clean Architecture
- **Layer boundaries**: Respect architectural layers (domain, application, infrastructure)
- **Dependency direction**: Follow dependency inversion principles
- **Port/Adapter pattern**: Understand and maintain hexagonal architecture if present

### Design Patterns
- **Recognize patterns**: Identify existing design patterns (Strategy, Factory, Repository, etc.)
- **Consistent implementation**: Follow the same patterns when adding new features
- **DDD principles**: Respect Domain-Driven Design boundaries if implemented

## Code Analysis

### Before Making Changes
1. **Identify the architecture**: Understand if it's monolithic, modular, microservices, etc.
2. **Check dependencies**: Review package managers and dependency injection configurations
3. **Understand testing**: Look for test files and testing frameworks in use
4. **Review build tools**: Check build scripts (Gradle, Maven, npm, etc.)

### Pattern Recognition
- **Repository patterns**: JPA repositories, cache repositories, etc.
- **Service layers**: Application services, domain services, infrastructure services
- **Configuration patterns**: Properties, YAML, environment variables
- **Error handling**: Exception patterns, error codes, validation approaches

## Technology Agnostic Guidelines

### Language-Specific Awareness
- **Java**: Understand Spring framework usage, annotation patterns, package structure
- **Python**: Check for Django/Flask patterns, virtual environments, requirements
- **JavaScript/TypeScript**: Understand module systems, package.json scripts, framework patterns
- **C#**: Understand .NET patterns, project structure, NuGet dependencies

### Build System Integration
- **Gradle**: Understand multi-module projects, task dependencies
- **Maven**: Understand POM structure, profiles, phases
- **npm/yarn**: Understand scripts, workspaces, dependencies vs devDependencies
- **Docker**: Understand containerization patterns and multi-stage builds

## Quality Assurance

### Create Test Case
- Never touch the test code
- Never change the API names or parameters
- Never migrate data on your own

### Testing Integration
- **Test discovery**: Find and understand existing test patterns
- **Test execution**: Know how to run tests (unit, integration, e2e)
- **Test data**: Understand test data setup and teardown patterns
- **Mocking**: Understand mocking frameworks and patterns in use

### Code Quality Tools
- **Linting**: Understand and run project linters (ESLint, SonarQube, Checkstyle)
- **Formatting**: Use project formatters (Prettier, Spotless, Black)
- **Static analysis**: Understand code quality gates and standards
- **Architecture validation**: Respect ArchUnit or similar architectural constraints

## Communication & Efficiency

### Task Management
- **Use TodoWrite**: For complex multi-step tasks, create and maintain todo lists
- **Progress tracking**: Mark todos as in-progress and completed in real-time
- **One task focus**: Only one todo should be in-progress at any time

### Tool Usage Optimization
- **Parallel execution**: Use multiple tool calls in single messages when possible
- **Efficient searching**: Use appropriate search tools (Glob, Grep, Task) based on need
- **Context preservation**: Maintain context across tool calls within the same task

### Error Handling
- **Graceful degradation**: Handle tool failures and provide alternatives
- **Clear communication**: Explain what went wrong and next steps
- **Recovery strategies**: Suggest ways to resolve issues or work around problems

## Project Integration

### Environment Awareness
- **Development setup**: Understand local development requirements
- **Configuration management**: Respect environment-specific configurations
- **Dependency management**: Understand version constraints and compatibility

### CI/CD Awareness
- **Build pipelines**: Understand how code is built and deployed
- **Quality gates**: Respect automated quality checks and gates
- **Deployment patterns**: Understand deployment strategies and environments

## Security & Best Practices

### Security Guidelines
- **No secrets in code**: Never commit API keys, passwords, or sensitive data
- **Input validation**: Understand and maintain input validation patterns
- **Authentication/Authorization**: Respect existing security patterns
- **Dependency security**: Be aware of security implications of dependencies

### Performance Considerations
- **Caching patterns**: Understand and maintain caching strategies
- **Database patterns**: Respect database design and query patterns
- **Resource management**: Understand memory and resource usage patterns
- **Monitoring**: Respect logging and monitoring patterns

---

## Universal Application

These rules apply to any project regardless of:
- Programming language
- Framework choice
- Architecture pattern
- Project size
- Domain/business context

The goal is to be a helpful, consistent, and respectful collaborator in any codebase while maintaining quality and architectural integrity.