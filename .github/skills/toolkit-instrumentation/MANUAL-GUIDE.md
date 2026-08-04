# Toolkit Instrumentation — Manual Guide

How to instrument L3, L4 instructions and T1–T4 skills when adopting this toolkit in a real project.
For automated generation, use `toolkit-instrumentation/SKILL.md` with an agent.

---

## Big Picture

```
Instructions (auto-loaded every interaction)      Skills (on-demand, loaded by agents when needed)
┌──────────────────────────────────────────────────┐      ┌──────────────────────────────────────────────────┐
│ L1 — Generic         copilot-instr.md            │      │ T1 — Patterns     skills/patterns-{name}/       │
│ L1 — Standards       standards/*.md              │      │ T2 — Domain       skills/domain-{name}/         │
│ L2 — Language        tech/{lang}.md              │      │ T3 — Repo         skills/repo-{name}/           │
│ L3 — Project         project/*.md                │      │ T4 — Handbooks    skills/handbook-{agent}/      │
│ L4 — Personal        personal/*.md               │      │                                                  │
└──────────────────────────────────────────────────┘      └──────────────────────────────────────────────────┘
Layers loaded in sequence; later layers can override earlier ones.     Each fact lives in exactly ONE tier.
Auto-loaded = token cost every time.               On-demand = loaded only when relevant.
```

**What's already generic (copy as-is):** L1, L1-Standards, L2, agents, use-case instructions
**What you create per project:** L3, L4, T1, T2, T3, T4, SKILLS-MAP

---

## Design Philosophy: Instructions vs Skills

### The Two Mechanisms

The toolkit splits project knowledge across **two fundamentally different delivery mechanisms**:

| Mechanism | When loaded | Token cost | Purpose |
|-----------|-------------|------------|---------|
| **Instructions** (L1–L4) | Every single interaction | Permanent (≤655 lines total) | Steering — rules the AI must always follow |
| **Skills** (T1–T4) | Only when an agent requests them | Zero until invoked | Knowledge base — details needed for specific tasks |

### Why both? Why not just skills (on-demand)?

If ALL project knowledge were on-demand, an agent generating code wouldn't know:
- What framework to use (Spring Boot? .NET? Django?)
- Which ORM pattern to follow
- Where to place new files
- What timestamp type is mandatory

...without **first** loading a skill. That's an extra step, extra tokens, and risks the agent generating wrong code if it skips the skill.

**L3 (instructions) solves this:** The AI starts every interaction already knowing the minimum viable project context. For deeper details, it goes to skills.

### The Split Visualized

```
Project-Specific Knowledge
├── L3 Instructions (ALWAYS loaded, ≤80 lines)
│   → "Rules of the game"
│   → Framework, DB, structure, 5-10 hard rules
│   → Analogy: the sheet pinned on the office wall (you always see it)
│
└── Skills T1-T3 (ON-DEMAND, loaded only when needed)
    → T1 Patterns: how code looks (skeletons, conventions with examples)
    → T2 Domain: what the business does (entities, workflows, rules)
    → T3 Repo: what's in the repo (services, endpoints, connections)
    → Analogy: the internal wiki (you open it only when you need it)
```

### Decision Principle

> **Ask yourself:** "If the AI doesn't know this, will it generate WRONG code in EVERY interaction?"
> - **YES** → put it in L3 (instructions, always-loaded)
> - **NO, only for specific tasks** → put it in a skill (on-demand)

### What belongs WHERE

| In L3 Instructions (always) | In Skills (on-demand) |
|-----------------------------|----------------------|
| Runtime: "Spring Boot 3.2, Java 17" | Full controller skeleton with annotations |
| DB: "PostgreSQL + JPA/Hibernate" | All entity details and relationships |
| Structure: "Vertical Slice `Features/{Feature}/`" | Full service inventory with endpoints |
| Rule: "Never LocalDateTime, always Instant" | Order state machine: DRAFT→ACTIVE→DONE |
| Rule: "No business logic in controllers" | Test fixtures and factory patterns |
| Where to find skills: "see `skills/patterns-*/`" | Business workflows with all steps |

---

## Recommended Order

| Step | What | Mode | Time |
|------|------|------|------|
| 0 | Copy toolkit skeleton, clean agents | Manual | 5 min |
| 1 | Write L3 — Project Instructions | Manual | 15 min |
| 2 | Generate T3 — Repo Inventory | Manual or Agent | 15-30 min |
| 3 | Write T2 — Domain Knowledge | Manual | 30-60 min |
| 4 | Write T1 — Coding Patterns | Manual | 20-40 min |
| 5 | Write T4 — Agent Handbooks | Manual | 20-30 min |
| 6 | Write L4 — Personal Preferences | Manual | 5 min |
| 7 | Update SKILLS-MAP.md | Manual | 10 min |

---

## Step 0: Copy Skeleton & Clean Up

### Copy the toolkit folder
```bash
cp -r /path/to/toolkit/.github/ /path/to/new-repo/.github/
```

### Remove project-specific skills (they belong to the source project)
```bash
cd /path/to/new-repo/.github/skills
# Remove any project-specific skills from the source (keep handbook-*, patterns-*, toolkit-instrumentation)
rm -rf domain-* repo-*
# patterns-project-structure/ is generic — keep it
```

### Remove `model:` from agent files
If agents specify a fixed model that isn't available in a target environment, they can become unavailable. Remove the `model:` line:

```bash
cd /path/to/new-repo/.github/agents
for f in *.agent.md; do sed -i '' '/^model:/d' "$f"; done
```

---

## Step 1: L3 — Project Instructions

**File:** `instructions/project/project-base.instructions.md`
**Token budget:** MAX 80 lines (auto-loaded on every interaction)

### Why L3 Exists

L3 answers: "What does the AI need to know ALWAYS about this project to avoid generating wrong code?"

Think of it as the "badge" — the 10 sentences you'd tell a new developer in the first 5 minutes so they don't make fundamental mistakes. Without L3, the AI would generate generic code that doesn't match your project's conventions.

### What goes here (and ONLY here)

| Information | Example | Why always-loaded? |
|-------------|---------|-------------------|
| Runtime + version | "Spring Boot 3.2, Java 17" | AI must ALWAYS know what it generates for |
| DB + ORM | "PostgreSQL + JPA/Hibernate" | Otherwise generates wrong data access code |
| Folder structure (1-2 lines) | "Vertical Slice: `Features/{Feature}/`" | Must know where to place new files |
| 5-10 non-negotiable rules | "Never LocalDateTime, always Instant" | If broken = bug or PR rejection |
| Skills pointer | "see `skills/patterns-spring-boot/`" | Tells agents where to find details |

### What does NOT go here (goes to skills instead)

| Information | Goes to | Why not L3? |
|-------------|---------|-------------|
| Full controller skeleton with annotations | **T1** `patterns-{framework}/` | Too verbose; needed only when writing that type of code |
| Entity details, DB columns, status enums | **T2** `domain-{name}/` | Too specific; needed only when working on that domain |
| Complete service list with all endpoints | **T3** `repo-{name}/` | Large and changes often; load only when navigating |
| Agent-specific checklists and pitfalls | **T4** `handbook-{agent}/` | Only relevant when that agent is active |
| Language-wide conventions | **L2** `tech/{lang}.md` | Already auto-loaded via L2, don't duplicate |
| Universal best practices | **L1** `standards/*.md` | Already auto-loaded via L1, don't duplicate |

### Overflow rule

If any section of L3 exceeds its budget → extract the detail into a skill and keep only a 1-line summary + pointer in L3.

### How to fill it

1. **Set `applyTo`** to your primary language:
   - Python: `'**/*.py'`
   - Java: `'**/*.{java,xml,gradle}'`
   - .NET: `'**/*.{cs,csproj}'`
   - Multi-language: `'**'`

2. **Architecture section** — answer these:
   - Runtime/framework and version?
   - Database + ORM/access layer?
   - DTO pattern (Records, Pydantic, data classes)?
   - Source directory structure?

3. **Mandatory Rules section** — define 5-10 non-negotiable rules. Categories to consider:
   - Handler/Controller pattern
   - Database access pattern
   - Timestamp format and timezone handling
   - Logging (library, level conventions)
   - Error handling (exception types, status mapping)
   - Import/using order

4. **Skills Reference** — point to T1–T4 folders

### Example: Spring Boot project

```markdown
---
applyTo: '**/*.{java,xml,gradle}'
description: "Project essentials — mandatory rules"
---
# Project Essentials
## Architecture
- Runtime: Spring Boot 3.2, Java 17
- Database: PostgreSQL 15 via JPA/Hibernate
- DTOs: Records in `dto/` packages
- Structure: `src/main/java/com/company/{module}/`
## Mandatory Rules
### Controllers
- @RestController + @RequestMapping, return ResponseEntity<>
- No business logic in controllers
### Database
- Extend JpaRepository<Entity, ID>, custom queries via @Query
- Never inject EntityManager in services
### Timestamps
- Use Instant, store as TIMESTAMPTZ, never LocalDateTime
### Logging
- @Slf4j on every class, include correlation IDs
### Error Handling
- @ControllerAdvice for global exceptions
- Custom exceptions extend RuntimeException
## Skills Reference
- Patterns: `skills/patterns-spring-boot/`
- Domain: `skills/domain-*/`
- Repo: `skills/repo-*/`
```

### Example: .NET Minimal API project

```markdown
---
applyTo: '**/*.{cs,csproj}'
description: "Project essentials — mandatory rules"
---
# Project Essentials
## Architecture
- Runtime: .NET 8 Minimal API
- Database: SQL Server via EF Core
- DTOs: Records in `Contracts/`
- Structure: Vertical Slice `Features/{Feature}/`
## Mandatory Rules
### Endpoints
- app.MapGet/MapPost in endpoint classes, group by feature
- Return Results.Ok() / Results.NotFound()
### Database
- Use IDbContextFactory<AppDbContext> for scoped contexts
- Migrations in `Infrastructure/Persistence/Migrations/`
### Timestamps
- DateTimeOffset everywhere, datetimeoffset(7) in SQL Server
### Logging
- ILogger<T> via constructor, structured with LoggerMessage.Define
### Error Handling
- Result<T> pattern for service returns
- Global exception middleware for unhandled errors
## Skills Reference
- Patterns: `skills/patterns-dotnet-minimal-api/`
- Domain: `skills/domain-*/`
```

---

## Step 2: T3 — Repo Inventory

**Folder:** `skills/repo-*/`
**Purpose:** What services/modules exist, what they do, their endpoints and connections.
**This tier can be generated autonomously** by an agent scanning the codebase.

### Structure

```
skills/
├── repo-service-inventory/SKILL.md       — all modules with purpose + entry points
├── repo-api-surface/SKILL.md             — all endpoints with contracts (optional)
└── repo-infrastructure/SKILL.md          — databases, queues, caches (optional)
```

For small projects (<5 services), a single `repo-service-inventory/SKILL.md` is enough.
For large projects (>15 services), group by domain: `repo-{domain}/SKILL.md`.

### How to write it

1. List all modules/services from the directory structure
2. For each: purpose (1 line), entry point file, public endpoints
3. Map dependencies: what calls what, sync vs async
4. List shared utilities and middleware

### Template

```markdown
---
name: repo-service-inventory
description: >
  Service inventory — all N modules, endpoints, dependencies, connections.
  Use when navigating codebase or understanding service boundaries.
---
# Service Inventory
## Overview
| # | Module | Purpose | Entry Point |
|---|--------|---------|-------------|
| 1 | UserService | User CRUD + auth | src/services/user/ |
| 2 | OrderService | Order lifecycle | src/services/order/ |

## Module Details
### 1. UserService
- Location: `src/services/user/`
- Endpoints: GET /api/users/{id}, POST /api/users, PUT /api/users/{id}
- Dependencies: Database (users), EmailService, AuthService
- Called by: API Gateway, OrderService (validation)

### 2. OrderService
[same format]

## Connections
UserService → EmailService (async)
OrderService → UserService (sync, validation)
OrderService → PaymentService (sync)

## Shared Utilities
| Utility | Location | Used By |
|---------|----------|---------|
| AuthMiddleware | src/middleware/auth.py | All controllers |
| DateUtils | src/utils/dates.py | OrderService, ReportService |
```

---

## Step 3: T2 — Business Domain

**Folder:** `skills/domain-*/`
**Purpose:** What the system does from a business perspective — entities, workflows, rules.
**Requires human knowledge** — an agent can extract entity names from code but not business meaning.

### Structure

```
skills/
├── domain-overview/SKILL.md          — MANDATORY: system purpose, actors, entity map
├── domain-{subdomain-1}/SKILL.md     — one per major business area
├── domain-{subdomain-2}/SKILL.md
└── domain-{subdomain-N}/SKILL.md     — max 6-8 subdomains
```

### How to write it

**Start with overview (always):**
1. What does the system do? (2-3 sentences)
2. Who are the main actors/users?
3. What are the core entities?
4. What are the main workflows?
5. How do subdomains relate?

**Then per subdomain:**
1. Core entities with key attributes and status values
2. Workflows with triggers, steps, and outcomes
3. Business rules (conditions → consequences)
4. Entity relationships with cardinality
5. Cross-references to repo skills (which service implements this)

### Where to get the information
- Database schema / ERD / migration files
- API docs (Swagger/OpenAPI)
- Business requirement docs, user stories
- Wiki pages about business processes
- Conversations with domain experts
- Existing README or architecture docs

### Template: Overview

```markdown
---
name: domain-overview
description: >
  Business domain overview — system purpose, actors, entities, workflows.
  Start here for any feature work requiring business context.
---
# Domain Overview
## System Purpose
[2-3 sentences: what it does, for whom, what problem it solves]
## Actors
| Actor | Role | Interacts With |
|-------|------|----------------|
## Core Entities
| Entity | DB Table | Purpose | Key Attributes |
|--------|----------|---------|----------------|
## Main Workflows
1. **{Workflow 1}**: trigger → step → step → outcome
2. **{Workflow 2}**: trigger → step → outcome
## Subdomain Index
| Subdomain | Skill | Covers |
|-----------|-------|--------|
| Orders | domain-orders | Order lifecycle, state machine, pricing |
| Users | domain-users | Registration, roles, permissions |
```

### Template: Subdomain

```markdown
---
name: domain-{subdomain}
description: >
  {Subdomain} — {entity names}, {operations}, {rules}.
  Use when working on {modules/features this covers}.
---
# {Subdomain}
## Entities
| Entity | Table | Key Columns | Status Values |
|--------|-------|-------------|---------------|
## Workflows
### {Workflow Name}
Trigger: {what starts it}
Steps: 1 → 2 → 3
Rules: {constraints that apply}
Output: {result}
## Business Rules
- {condition} → {consequence}
- {condition} → {consequence}
## Relationships
{Entity A} → {Entity B}: one-to-many via FK
## Cross-References
- Implementation: `repo-{service}/SKILL.md`
- Patterns: `patterns-{relevant}/SKILL.md`
```

### Fragmentation guide
- Always start with `domain-overview/SKILL.md`
- One SKILL.md per bounded context (orders, users, payments, etc.): `domain-{name}/SKILL.md`
- If a subdomain exceeds ~150 lines, split into sub-files:
  `domain-orders/SKILL.md` (summary) + `domain-orders/state-machine.md` (detail)
- Only include DB columns that carry business semantics (status enums, constraints, computed fields)

---

## Step 4: T1 — Coding Patterns

**Folder:** `skills/patterns-*/`
**Purpose:** How code is written in this project — handler patterns, DB access, DTOs, testing.
**Semi-autonomous:** Agent can scan existing code for patterns, developer confirms and fills gaps.

### Structure

```
skills/
├── patterns-{framework}/SKILL.md         — handler, service, repo patterns
├── patterns-testing/SKILL.md             — test framework, fixtures, mocking strategy
└── patterns-integrations/SKILL.md        — external API clients, queues, cache (optional)
```

### How to write it

1. Find 2-3 "golden examples" — the best-written controller, service, test in your project
2. Extract the pattern: what's the structure, what's mandatory, what varies per use case
3. Write as pattern with annotated code blocks — not the full file, just the skeleton

### What to include per pattern
- **Controller/Handler:** annotations, routing, request validation, response mapping
- **Service:** constructor injection, transaction boundaries, what it returns
- **Repository/DAO:** base class, query conventions, pagination pattern
- **DTOs:** where they live, how they're defined, mapping conventions
- **Error handling:** exception types, how they map to HTTP status codes
- **Logging:** logger init, log levels per event type

### Template

```markdown
---
name: patterns-{framework}
description: >
  {Framework} patterns — controller, service, repository, DTOs, error handling.
  Use when writing new code or reviewing for compliance.
---
# {Framework} Patterns
## Request Pipeline
Middleware → Validation → Handler → Service → Repository → Response mapping
## Controller Pattern
```java  (or python, csharp)
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService service;
    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> getById(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```
## Service Pattern
[annotated skeleton]
## Repository Pattern
[annotated skeleton]
## DTO Conventions
[where they live, naming, mapping]
## Error Mapping
| Exception | HTTP Status | When |
|-----------|-------------|------|
```

### Testing patterns (separate file)

```markdown
---
name: patterns-testing
description: >
  Test infrastructure — framework, fixtures, mocking, naming, structure.
  Use when writing or reviewing tests.
---
# Testing Patterns
## Framework
{pytest / JUnit 5 / xUnit} + {Mockito / Mock / Moq}
## Test Structure
```
tests/
├── unit/           — isolated, no DB, no network
├── integration/    — with DB/containers
└── conftest.py     — shared fixtures (or equivalent)
```
## Naming Convention
{test_methodName_expectedBehavior_whenCondition} or equivalent
## Fixture Pattern
[how shared setup works — conftest, @BeforeEach, IClassFixture]
## Mocking Strategy
- Mock at boundaries (external services, DB)
- Don't mock internal classes
- Use {factory pattern} for test data
## AAA Structure
Arrange: [setup pattern]
Act: [call pattern]
Assert: [assertion library + conventions]
```

---

## Step 5: T4 — Agent Handbooks

**Folder:** `skills/handbook-{agent}/`
**Purpose:** Project-specific rules that modify how each agent works on THIS project.
**Derived:** Build from L3 + T1-T3 knowledge + lessons learned.

The generic handbooks already exist in the toolkit. You **extend** them with project-specific additions.

### Which agents need project handbooks?

| Agent | Needs handbook when... |
|-------|----------------------|
| **code-generation** | You have project-specific file creation steps, DI registration, naming rules |
| **code-reviewer** | You have project-specific checks (timestamp type, transaction annotations, etc.) |
| **unit-testing-generator** | Your test setup is non-trivial (fixtures, factories, test containers) |
| **feature-scaffolder** | Your feature folder structure is specific (vertical slice, module-based) |
| **bug-detective** | You have known pitfalls (timezone bugs, cache issues, concurrency) |
| **code-documentation** | You have documentation templates or specific doc conventions |

### How to write it

1. Think about the last 5 code reviews — what recurring comments did you make?
2. Think about the last 3 bugs — what caused them? What should agents check for?
3. What does a new developer get wrong in the first week?

Each answer becomes a handbook rule.

### Template

```markdown
---
name: handbook-{agent}
description: >
  Project-specific {workflow} rules for {project}. Overrides generic
  behavior on conflict. Read FIRST before applying generic rules.
---
# {Agent} — Project Rules
## Mandatory Steps
1. {Project-specific step not in generic instructions}
2. {Another mandatory step}
## Checklist
- [ ] {Check with rationale}
- [ ] {Check with rationale}
## Pitfalls
| Pitfall | Why | Correct Approach |
|---------|-----|------------------|
| Using DateTime instead of Instant | Timezone bugs in prod | Always Instant + TIMESTAMPTZ |
| Missing @Transactional on writes | Data inconsistency | All write services need it |
## Examples
[1-2 real code snippets from the project showing correct patterns]
```

### What NOT to put in handbooks
- Generic agent workflow (already in the generic SKILL.md)
- Domain knowledge (belongs in T2)
- Code patterns (belongs in T1)
- Mandatory rules for all code (belongs in L3)

---

## Step 6: L4 — Personal Preferences

**File:** `instructions/personal/personal-preferences.instructions.md`
**Token budget:** MAX 40 lines

### What goes here
Only things that **differ** from L1–L3. If you agree with the defaults, leave sections commented out. An empty L4 is perfectly fine.

### Sections to consider
- **Communication:** preferred language, verbosity level
- **Workflow:** plan first? test first? incremental?
- **Code Style Overrides:** line length, quote style, naming preferences
- **Review Preferences:** severity table first? inline comments?
- **Tool Preferences:** test runner flags, linter configs
- **Personal Gotchas:** things you keep forgetting

### Example

```markdown
---
applyTo: '**'
description: "Personal developer coding preferences"
---
# Personal Preferences
## Communication
- Preferred language: Romanian
- Verbosity: concise, no boilerplate explanations
## Workflow
- Always show a plan before implementing changes with >3 files
- Run tests after every code change
## Code Style Overrides
- Max line length: 120
## Tool Preferences
- Use pytest -x --tb=short
```

---

## Step 7: Update SKILLS-MAP.md

After creating all skills, update `skills/SKILLS-MAP.md` to index them.

### Sections to update
1. **All Skills** tables under T1, T2, T3 — replace "(empty — populate per project)" with actual entries
2. **Skill File Tree** — update with actual folder structure
3. **When to Use Which Skill** — update with real skill names
4. **Agent → Skill Loading Matrix** — confirm which agents load which skills

Use the existing SKILLS-MAP.md structure as template — don't change the format, just fill in project-specific entries.

---

## Fragmentation Rules (All Tiers)

| Rule | Rationale |
|------|-----------|
| One concept per SKILL.md file | Agents load specific skills, not entire tiers |
| 50–150 lines per file | Token budget — too small = overhead, too large = waste |
| If >150 lines, split into sub-files | Main SKILL.md = summary, extra `.md` files = detail |
| No duplication across tiers | Each fact lives in ONE place, cross-reference the rest |
| No whitespace padding | Skills are for agents — dense content, no decorative spacing |
| Tables over prose | Faster to parse, less tokens, more structured |
| Code examples: skeleton only | Show structure, not full implementation |

---

## Incremental Updates

Skills are living documents. Update them when:

| Trigger | Action |
|---------|--------|
| New service/module added | Add to T3 inventory |
| New business subdomain | Add T2 skill module |
| Recurring code review comment | Add to T4 handbook as pitfall/rule |
| New integration pattern | Add to T1 patterns or create new module |
| Framework upgrade | Update T1 + L3 |
| New developer struggles with something | Expand T2 overview or T4 pitfalls |
| Database schema change | Update T2 entities + T3 if new service |

### How to update
1. Open the relevant skill file
2. Add new information in the appropriate section
3. If the file exceeds 150 lines, split into sub-modules
4. Update SKILLS-MAP.md if new files were created

---

## What Goes Where — Decision Matrix

| Information type | Where it goes | Why |
|-----------------|--------------|-----|
| "Always use Instant for timestamps" | **L3** | Mandatory rule for all code |
| "An Order goes through DRAFT→ACTIVE→COMPLETED" | **T2 domain** | Business knowledge |
| "OrderService is at src/services/order/" | **T3 repo** | Codebase navigation |
| "Controllers must use @RestController + ResponseEntity" | **T1 patterns** | How to write code |
| "Code reviewer must check for @Transactional on writes" | **T4 handbook** | Agent-specific rule |
| "I prefer Romanian responses" | **L4 personal** | Individual preference |
| "Use async/await for all I/O in Python" | **L2 language** | Language standard (generic) |
| "Keep functions under 20 lines" | **L1 generic** | Universal best practice |
