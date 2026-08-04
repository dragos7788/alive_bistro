---
applyTo: '**'
description: "Documentation standards — code comments, README, ADR, CHANGELOG, living docs"
---

> ⚠️ **Customize for your team.** This is a template. Define documentation requirements, review criteria, and maintenance practices that fit your project workflow. Delete this file if your team doesn't need it.

# Documentation Standards
## Code-Level
- Comment **why**, not **what**. Code is self-explanatory through naming.
- Use XML/JSDoc comments for all public/exported functions: what it does, params, return value.
- Remove commented-out code before committing.
## Project-Level
- Every project: README with purpose, prerequisites, setup, run, test, environment variables.
- **ADR** mandatory for decisions affecting scalability, security, data model, or cross-team integration.
- **CHANGELOG**: Keep a Changelog format (Added, Changed, Fixed, Removed) for every release.
- Architecture diagrams: text-based (Mermaid, PlantUML) in version control.
## Living Documentation
- If code change modifies API behavior, documentation updated in same PR.
- **Definition of Done**: task NOT done until docs updated, README reflects changes, CHANGELOG added.
- Avoid vague terms ("should", "usually"). Use deterministic: "must", "must not", "always", "never".
