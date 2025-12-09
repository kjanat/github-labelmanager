# GitHub Copilot Instructions

This document provides guidance for GitHub Copilot when working on the `github-labelmanager` repository.

## Project Overview

`github-labelmanager` is a tool for declaratively syncing GitHub issue labels from a YAML config file. It:

- Creates, updates, and deletes labels from a single config file
- Renames labels via aliases (preserves issue associations)
- Supports dry-run mode for safe previews
- Works as both CLI tool and GitHub Action
- Uses Deno runtime (not Node.js)

## Architecture

The project follows a clean architecture pattern with dependency injection:

```
src/
  adapters/
    client/          # GitHub API clients (base, actions, octokit)
    logger/          # Logging adapters (actions, console)
  client.ts          # LabelManager (high-level API with DI)
  config.ts          # Config loading and validation
  factory.ts         # Environment detection, service creation
  labels-model.ts    # Branded types (LabelName, LabelColor, LabelDescription)
  mod.ts             # Public API exports
  schema.ts          # Zod schemas for validation and JSON schema generation
  sync.ts            # Label sync orchestration
  testing.ts         # Test utilities
  types.ts           # Domain types
```

## Distribution

The project is distributed as:
- GitHub Action: `kjanat/github-labelmanager` (use `@v1` or specific version tags)
- JSR package: `jsr:@kjanat/github-labelmanager`
- NPM package: `npm:@kjanat/github-labelmanager`
- Docker image: `ghcr.io/kjanat/github-labelmanager`

## Development Commands

### Running the Tool
- Run: `deno task labels OWNER/REPO`
- Dry run: `deno task labels:dry-run OWNER/REPO`

### Development Workflow
- Type check: `deno check --all`
- Format: `deno fmt`
- Lint: `deno lint`
- Test: `deno task test`
- Build npm package: `deno task build`

### Configuration
- Default config: `.github/labels.yml` (YAML format)
- Entry point: `main.ts`
- Schema: `.github/labels.schema.json`

## Code Style and Conventions

### Runtime and Imports
- Use Deno runtime (not Node.js) - prefer Deno APIs
- Imports: JSR (`jsr:@std/*`) for stdlib, esm.sh for npm packages
- No Node.js-specific code or CommonJS patterns

### TypeScript Conventions
- Types: `interface` for shapes, `as const` for readonly objects
- Naming: camelCase (vars/funcs), PascalCase (types/classes)
- Explicit types preferred over inference in public APIs

### Error Handling
- Use try/catch blocks
- Type guards for Octokit errors
- Meaningful error messages for users

### Permissions
- Explicit Deno permission flags required (`--allow-net`, `--allow-read`, `--allow-env`)
- Document required permissions in code comments when adding new functionality

### Code Organization
- Barrel exports in `mod.ts` files
- Interface-based abstractions for testability
- Dependency injection for clients and loggers

## Testing Guidelines

### Test Location and Structure
- Tests: `__tests__/` directory
- Use `@std/assert` for assertions
- Mock GitHub clients using `MockGitHubClient` from `testing.ts`
- Use `NullLogger` for tests that don't need logging

### Running Tests
- Run all tests: `deno task test`
- Coverage: `deno task test:coverage`
- Tests require permissions: `-RWE` flags

### Test Patterns
- Unit tests for core logic
- Integration tests with mocked GitHub API
- Test both success and error paths
- Validate dry-run mode behavior

## Making Changes

### Before Committing
1. Run type check: `deno check --all`
2. Run linter: `deno lint`
3. Run formatter: `deno fmt`
4. Run tests: `deno task test`

### Code Quality
- Keep changes minimal and focused
- Maintain existing architecture patterns
- Update tests for new functionality
- Update documentation if APIs change
- Don't introduce Node.js dependencies

### Git Workflow
- Commit messages follow conventional commits
- Use meaningful commit messages
- Test changes before committing

## Common Pitfalls to Avoid

1. **Don't use Node.js APIs** - Use Deno equivalents
2. **Don't skip type checking** - Run `deno check --all` before committing
3. **Don't ignore linter warnings** - Fix or justify suppressions
4. **Don't break the build** - Ensure all tasks pass before committing
5. **Don't add unnecessary dependencies** - Prefer JSR packages over npm when possible

## Files to Be Aware Of

### Configuration Files
- `deno.json` - Deno configuration, tasks, dependencies
- `action.yml` - GitHub Action metadata
- `.github/labels.yml` - Example label configuration
- `.github/labels.schema.json` - JSON schema for label config

### Important Implementation Files
- `main.ts` - CLI entry point
- `src/client.ts` - LabelManager class (main API)
- `src/sync.ts` - Label synchronization logic
- `src/factory.ts` - Environment detection and service creation
- `src/config.ts` - Configuration loading and validation
- `src/schema.ts` - Zod schemas for validation and JSON schema generation
- `src/labels-model.ts` - Branded types for type-safe label properties

### Documentation
- `README.md` - Main documentation
- `AGENTS.md` - Additional agent instructions (git workflow)

## References

- [Deno Documentation](https://docs.deno.com/)
- [JSR Registry](https://jsr.io/)
- [Octokit REST API](https://octokit.github.io/rest.js/)
- [GitHub Actions Toolkit](https://github.com/actions/toolkit)

---

For additional git operation guidelines and requirements, see `AGENTS.md`.
