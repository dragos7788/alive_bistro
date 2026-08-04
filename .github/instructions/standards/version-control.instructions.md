---
applyTo: '**'
description: "Version control standards — commits, PRs, branching, dependencies"
---

> ⚠️ **Customize for your team.** This is a template. Define commit conventions, branching strategy, and PR requirements that match your development workflow. Delete this file if your team doesn't need it.

# Version Control Standards
## Commit Messages
- Conventional format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Add `!` for breaking changes: `feat!: remove legacy API`
- Reference ticket: `feat(auth): add refresh token (TASK-123)`
- Subject under 50 chars. Imperative mood: "Add" not "Added".
## Pull Requests
- Include: **What** (summary), **Why** (motivation/ticket), **How to test** (verification steps).
- One task per PR. Mixed-scope PRs must be split.
- Group related code and test changes into single PR.
## Branching
- Feature branches for new work. Main/master always deployable. Delete after merge.
## Dependencies
- Prefer well-maintained, popular libraries. Minimize dependency count.
- Check for security vulnerabilities regularly. Pin major versions, allow minor/patch.
## Code Review
- Check: correctness, test coverage, security, performance, readability, documentation.
- Be constructive. Suggest improvements with examples. Approve when standards met.
