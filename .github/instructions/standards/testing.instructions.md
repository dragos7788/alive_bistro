---
applyTo: '**'
description: "Testing standards — TDD, AAA, coverage, naming, boundary analysis"
---

> ⚠️ **Customize for your team.** This is a template. Define coverage targets, naming conventions, and testing strategy that match your project. Delete this file if your team doesn't need it.

# Testing Standards
## Testing Pyramid
- ~70% unit tests (fast, isolated). ~20% integration (boundary crossings). ~10% E2E (critical paths only).
## TDD Cycle
1. **RED**: Write failing test defining expected behavior.
2. **GREEN**: Write minimum code to pass.
3. **REFACTOR**: Clean up while keeping green.
## Test Structure (AAA)
- **Arrange**: Set up data and dependencies.
- **Act**: Execute code under test.
- **Assert**: Verify expected outcome.
- One assert group per test. Keep sections visually separated.
## Test Naming
- Descriptive: `MethodName_Scenario_ExpectedBehavior`. A failing name must tell what broke.
## Unit Test Rules
- Every public function: at least one test.
- Deterministic — no hidden external dependencies.
- Mock only what is slow or external. Never mock class under test.
- Test behavior (outputs), not implementation (internal calls).
## Boundary Value Analysis
For every input, test: lower boundary, upper boundary, mid-range, invalid types, null, empty collections.
## Parameterized Tests
If copy-pasting test changing only input → convert to data-driven/parameterized.
## Bug Fix Rule
Write failing test reproducing bug FIRST. Then fix. The test = permanent regression guard.
## Coverage
- Meaningful coverage of logic paths. Critical paths (auth, payments) MUST have tests.
- Do NOT test: framework internals, trivial getters, generated code.
## When Generating Code
- New/modified business logic → also produce corresponding tests.
- Follow existing test framework and folder structure in the repo.
