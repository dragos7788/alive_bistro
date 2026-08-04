---
applyTo: '**'
description: "Clean architecture — layers, dependency rule, DDD, feature organization"
---

> ⚠️ **Customize for your team.** This is a template. Keep practices that match your project structure, remove or modify those that don't. Delete this file if your team doesn't need it.

# Clean Architecture Standards
## Core Principles
- **Dependency Rule**: External concerns (DB, UI, API) → Use Cases → Entities. Business logic never imports infrastructure.
- **Hexagonal**: External systems interact through Ports (interfaces) and Adapters.
- **Separation of Concerns**: Each layer/module manages a single concern.
- **DDD**: For complex logic, use Bounded Contexts. Each context owns its data.
## Layer Responsibilities
- **API/Presentation**: HTTP requests/responses, input validation, auth checks, DTO mapping. No business logic.
- **Application/Use Cases**: Orchestrate domain objects, workflows, define interfaces for infrastructure.
- **Domain**: Business entities, rules, invariants. No dependencies on other layers. Framework-agnostic.
- **Infrastructure**: Implements data access, external APIs, messaging. Implements interfaces from Application.
- **Shared**: Cross-cutting utilities, constants. No business logic.
## Dependency Flow
```
API → Application → Domain
  ↓         ↓
Infrastructure
```
- Domain must not reference any other layer.
- Application references Domain only.
- Infrastructure implements interfaces from Application and Domain.
- Use dependency injection to wire implementations.
## Project Organization
- Organize by feature (`features/users/`), not by type (`controllers/`, `services/`).
- Shared utilities in `shared/` or `common/`.
## When Creating New Features
1. Start with domain entities and rules
2. Define use cases and application services
3. Define required interfaces/ports
4. Create infrastructure implementations
5. Add API endpoints
6. Write tests for each layer
