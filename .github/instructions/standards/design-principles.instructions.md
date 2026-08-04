---
applyTo: '**'
description: "Design principles — SOLID, structural patterns, determinism"
---

> ⚠️ **Customize for your team.** This is a template. Keep principles that match your engineering culture, remove or modify those that don't. Delete this file if your team doesn't need it.

# Design Principles
## SOLID
- **SRP**: Each class/module/function has one responsibility and one reason to change.
- **OCP**: Open for extension, closed for modification. Use abstractions to add functionality without altering tested code.
- **LSP**: Subtypes fully substitutable for base types. No unexpected exceptions in overrides.
- **ISP**: Prefer multiple small, cohesive interfaces over one large interface.
- **DIP**: High-level modules depend on abstractions, not low-level modules. Use dependency injection.
## Logic Economy
- **DRY**: Every piece of knowledge has a single representation. Identical logic → extract to shared utility.
- **KISS**: Choose the simplest solution. No complex patterns when a simple conditional suffices.
- **YAGNI**: Implement only what is needed now. No features "just in case."
- **Fail Fast**: Report errors immediately at system boundaries. Inside domain, prefer explicit error modeling.
## Structural Principles
- **Separation of Concerns**: UI, business logic, and data access never mixed in the same file/function.
- **Law of Demeter**: Only communicate with direct collaborators. Avoid chained calls.
- **Tell, Don't Ask**: Don't query object state to make external decisions. Tell the object what to do.
- **Composition over Inheritance**: Avoid hierarchies deeper than 2 levels. Inject behaviors as dependencies.
- **Loose Coupling**: Use interfaces/DI to make modules testable and replaceable.
- **Layered Dependency Rule**: infrastructure → use cases → domain entities. Business logic never imports from infrastructure.

### Determinism
Same input produces same output. Avoid hidden state, implicit globals, and time-dependent logic.
Every function must be predictable from its signature alone.

---

## Stability & Extensibility

### No Unsolicited Refactoring
Do not modify working code unless the task explicitly requires it.
Observe problems → document in notes → let the decision-maker decide.

### Extend, Don't Modify
Add new functionality through new modules/functions. Connect to existing code through interfaces.
Modify existing code only when the task explicitly requires it.

---

## API Design

### Contract First
Define the API contract before coding: method, path, request/response schema, status codes, error format.

### REST Conventions
- GET (read), POST (create → 201), PUT/PATCH (update), DELETE (→ 204).
- Never GET for mutations, never POST for reads.

### Error Envelope
Single consistent error format:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### Idempotency
Every state-changing endpoint must be idempotent. Retries must not produce duplicates.
