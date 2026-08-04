---
name: toolkit-instrumentation
description: >
  Generation copilot for instrumenting L3/L4 instructions and T1-T4 skills when adopting the toolkit in a real project.
  Use iteratively: first adoption, then periodic updates as project evolves.
  Guides data source collection, fragments skills into focused modules, generates dense agent-optimized content.
  Trigger: instrument toolkit, generate skills, adopt toolkit, update skills, create domain skill, create patterns skill.
---

# Toolkit Instrumentation Copilot

## Purpose
Orchestrate creation and maintenance of project-specific layers (L3, L4) and skills (T1-T4).
Operates in two modes: **guided** (interactive with developer) and **autonomous** (repo-scan only).
Can run once for initial adoption or periodically to update/extend skills as the project grows.

## Design Philosophy: Instructions vs Skills

### The Two Mechanisms

Project knowledge is delivered via two fundamentally different mechanisms:

| Mechanism | When loaded | Token cost | Contains |
|-----------|-------------|------------|----------|
| **Instructions** (L1–L4) | Every interaction | Permanent (≤655 lines total) | Steering rules the AI must always follow |
| **Skills** (T1–T4) | Only when an agent requests | Zero until invoked | Knowledge base for specific tasks |

### Why Both? (The Split Principle)

If all project knowledge were on-demand (skills only), an agent generating code wouldn't know the framework, DB, or folder structure without first loading a skill. That's an extra step, extra tokens, and risks wrong code if the agent skips it.

**Instructions (L3) = permanent steering.** The AI always starts with minimum viable project context.
**Skills (T1-T3) = knowledge base on request.** Deep details loaded only when the task requires them.

### Decision Rule

> "If the AI doesn't know this, will it generate WRONG code in EVERY interaction?"
> - **YES** → L3 instruction (always-loaded, ≤80 lines)
> - **NO, only for specific tasks** → Skill (on-demand, 50-150 lines per module)

### The Project Knowledge Split

```
Project-Specific Knowledge
├── L3 Instructions (ALWAYS loaded, ≤80 lines)
│   → "Rules of the game" — framework, DB, structure, 5-10 hard rules
│   → Analogy: sheet pinned on office wall (always visible)
│
└── Skills T1-T3 (ON-DEMAND, loaded only when needed)
    → T1 Patterns: how code looks (skeletons, conventions)
    → T2 Domain: what the business does (entities, workflows, rules)
    → T3 Repo: what's in the repo (services, endpoints, connections)
    → Analogy: internal wiki (opened only when needed)
```

### What Belongs Where

| In L3 Instructions (always) | In Skills (on-demand) |
|-----------------------------|----------------------|
| "Spring Boot 3.2, Java 17" | Full controller skeleton with annotations |
| "PostgreSQL + JPA/Hibernate" | All entity details and relationships |
| "Vertical Slice: `Features/{Feature}/`" | Complete service inventory with endpoints |
| "Never LocalDateTime, always Instant" | Order state machine: DRAFT→ACTIVE→DONE |
| "No business logic in controllers" | Test fixtures and factory patterns |
| "See `skills/patterns-*/`" | Business workflows with all steps |

### Overflow Rule
If any L3 section exceeds budget → extract detail into a skill, keep only 1-line summary + pointer in L3.

---

## Execution Modes

### Mode A: Full Adoption (first time)
Sequence: L3 → T3 (autonomous) → T2 (guided) → T1 (guided+scan) → T4 (derived) → L4 → SKILLS-MAP update.

### Mode B: Incremental Update
Target specific tier. Ask: "Which tier to update? What new information is available?"
Skip tiers that are already adequate. Add new skill modules or extend existing ones.

## Skill Authoring Rules
1. **Fragment into modules** — one concept per SKILL.md file (~50-150 lines). Split large topics into subfolder skills.
2. **No whitespace padding** — skills are consumed by agents, not humans. No decorative spacing, no empty sections.
3. **Dense information** — every line must carry useful signal. Use tables, flat lists, inline references.
4. **No duplication across tiers** — each fact lives in exactly one place. Cross-reference with `See skills/{tier-prefix}-{name}/`.
5. **Frontmatter required** — `name:` and `description:` in YAML. Description must contain trigger keywords for skill discovery.
6. **Token budget** — individual skill file: 50-150 lines. If exceeding 150 lines, split into sub-modules.
7. **No generic advice** — only project-specific facts. Generic rules belong in L1/L2 instructions.

## File Naming Convention
- Flat structure with tier prefix: `patterns-{name}/`, `domain-{name}/`, `repo-{name}/`, `handbook-{agent}/`
- VS Code discovers skills only at `skills/{folder}/SKILL.md` (one level deep) — no nested grouping folders
- File always `SKILL.md` inside the folder
- Sub-modules (reference files loaded explicitly): `handbook-code-generation/references/patterns-dotnet.md`

---

# TIER INSTRUMENTATION GUIDES

---

## T3 — Repo Inventory (Autonomous)

**Agent can generate this tier fully autonomously by scanning the codebase.**

### Procedure
1. Scan project structure: `find . -name "*.java" -o -name "*.py" -o -name "*.cs" | head -200`
2. Identify modules/services by directory structure, entry points, route registrations
3. Map endpoints: controllers, handlers, lambdas, gRPC services
4. Identify inter-service connections: HTTP clients, queue publishers/consumers, event handlers
5. Identify shared utilities, middleware, infrastructure code

### Output Structure
```
skills/
├── repo-service-inventory/SKILL.md    — all modules/services with purpose, entry point, endpoints
├── repo-api-surface/SKILL.md          — all public endpoints with request/response contracts
└── repo-infrastructure/SKILL.md       — databases, queues, caches, cloud resources, environments
```

### Data Sources (autonomous)
- Directory tree structure
- Controller/handler files (route annotations, endpoint definitions)
- Configuration files (application.yml, appsettings.json, docker-compose, terraform)
- Package dependencies (pom.xml, *.csproj, requirements.txt, package.json)
- Database migration files or ORM model definitions

### Module Template
```markdown
---
name: repo-{module-name}
description: >
  {Module} inventory — services, endpoints, dependencies, connections.
  Use when navigating codebase or understanding service boundaries.
---
# {Module} Inventory
## Services
| Service | Location | Purpose | Entry Point |
|---------|----------|---------|-------------|
## Endpoints
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
## Dependencies
| Dependency | Type | Purpose |
|------------|------|---------|
## Connections
[service-A] → [service-B]: protocol, purpose
```

### Fragmentation Rules
- <5 services: single `repo-service-inventory/SKILL.md`
- 5-15 services: split into `repo-service-inventory/SKILL.md` (overview) + `repo-service-inventory/{service-name}.md` per service
- >15 services: group by domain into separate `repo-{domain}/SKILL.md` folders

---

## T2 — Business Domain (Guided)

**Requires developer input. Agent guides the conversation to extract domain knowledge.**

### Interview Protocol
Ask the developer these questions in sequence. Accept answers as text, links to docs, wiki pages, Confluence, or existing documentation files.

#### Phase 1: Overview
1. "What does this system do in 2-3 sentences? Who are the main users/actors?"
2. "What are the 3-5 main business domains/subdomains?" (suggest from code if possible)
3. "Are there external systems this integrates with? What role do they play?"

#### Phase 2: Per-Subdomain Deep Dive
For each subdomain identified:
4. "What are the core entities in {subdomain}? What are their key attributes?"
5. "What are the main workflows/processes? Any state machines?"
6. "What business rules constrain operations? (validation, authorization, limits)"
7. "What are the common failure scenarios and how should they be handled?"

#### Phase 3: Data Sources to Request
- Database schema (ERD, migration files, or model definitions)
- API documentation (Swagger/OpenAPI specs, Postman collections)
- Business requirement documents, user stories, acceptance criteria
- Wiki pages describing business processes
- Existing README or architecture documents
- Sequence diagrams or workflow diagrams

### Output Structure
```
skills/
├── domain-overview/SKILL.md              — system purpose, actors, entity map, subdomain index
├── domain-{subdomain-1}/SKILL.md         — entities, workflows, rules for subdomain 1
├── domain-{subdomain-2}/SKILL.md         — entities, workflows, rules for subdomain 2
└── domain-{subdomain-N}/SKILL.md         — one per major subdomain (max 6-8)
```

### Module Template
```markdown
---
name: domain-{subdomain}
description: >
  {Subdomain} domain — {entity names}, {key operations}, {business rules}.
  Use when working on {which modules/features this covers}.
---
# {Subdomain} Domain
## Entities
| Entity | Storage | Key Attributes | Status Values |
|--------|---------|----------------|---------------|
## Workflows
### {Workflow Name}
Trigger: {what starts it}
Steps: 1. → 2. → 3. → ...
Output: {result}
Rules: {constraints}
## Business Rules
- Rule 1: condition → consequence
- Rule 2: condition → consequence
## Relationships
{Entity A} →[relation] {Entity B}: cardinality, FK
## Cross-References
- Implementation: See `repo-{service}/SKILL.md`
- Patterns: See `patterns-{relevant}/SKILL.md`
```

### Fragmentation Rules
- Always create `domain-overview/SKILL.md` first (index + system summary)
- One SKILL.md per bounded context / subdomain: `domain-{subdomain}/SKILL.md`
- If a subdomain exceeds 150 lines, split: `domain-{subdomain}/SKILL.md` (summary) + `domain-{subdomain}/{topic}.md` (details)
- Database schema details: only include columns/types if they carry business semantics (status enums, computed fields, constraints). Don't list every column.

---

## T1 — Coding Patterns (Guided + Scan)

**Agent scans existing code for patterns but needs developer confirmation and gap-filling.**

### Procedure
1. **Scan**: identify recurring patterns in controllers/handlers, services, repositories, tests
2. **Present findings**: "I found these patterns in your code: [list]. Confirm or correct?"
3. **Ask for gaps**: "Are there patterns you enforce that aren't visible in code yet? (new conventions, planned migrations)"

### Interview Protocol
1. "What is the standard request→response pipeline? (middleware, validation, handler, response mapping)"
2. "How do you access the database? (pattern name, base classes, transaction boundaries)"
3. "How do you handle errors? (exception types, Result pattern, HTTP status mapping)"
4. "How do you write tests? (framework, fixtures, mocking strategy, naming convention)"
5. "Are there patterns for external integrations? (HTTP clients, message queues, caching)"

### Data Sources to Request
- Example controller/handler files (best-written ones the developer is proud of)
- Test files showing the testing approach
- Base classes, shared utilities, middleware code
- Code review comments that enforce patterns
- Team coding guidelines or style guides (if any)

### Output Structure
```
skills/
├── patterns-{framework}/SKILL.md           — handler/controller + service + repo patterns
├── patterns-testing/SKILL.md               — test infrastructure, fixtures, conventions
└── patterns-integrations/SKILL.md          — external service patterns (optional)
```

### Module Template
```markdown
---
name: patterns-{framework}
description: >
  {Framework} coding patterns — controller setup, service layer, DB access,
  error handling, DTOs. Use when writing new code or reviewing for compliance.
---
# {Framework} Patterns
## Request Pipeline
Middleware → Validation → Handler → Service → Repository → Response mapping
## Controller/Handler Pattern
[Annotated code example showing the standard structure]
## Service Layer Pattern
[How services are structured, what they receive/return]
## Database Access Pattern
[Repository/DAO pattern, transaction handling, query conventions]
## DTO/Model Conventions
[How request/response models are defined, where they live]
## Error Handling
| Exception/Error | HTTP Status | When |
|----------------|-------------|------|
## Logging
[Logger initialization, what to log at which level]
```

### Fragmentation Rules
- One framework = one skill file (unless >150 lines): `patterns-{framework}/SKILL.md`
- Testing always separate: `patterns-testing/SKILL.md`
- If multiple frameworks (frontend + backend): separate `patterns-{framework}/SKILL.md` per framework
- Integration patterns: separate `patterns-integrations/SKILL.md` only if >3 external integrations

---

## T4 — Agent Handbooks (Derived)

**Generated from L3 + T1-T3 knowledge. Agent derives project-specific rules per agent workflow.**

### Procedure
1. After T1-T3 are populated, derive T4 by mapping project knowledge to each agent's workflow
2. For each agent, ask: "What project-specific rules should {agent} follow that differ from generic behavior?"
3. Generate handbook with project-specific checklist items, pitfalls, examples

### Interview Protocol (per agent)
1. "What mistakes have been made in {workflow} that you want to prevent? (e.g., wrong timestamp type, missing validation)"
2. "Are there project-specific steps that MUST be followed? (e.g., always add audit log, always update OpenAPI spec)"
3. "What are the top 3 pitfalls a new developer hits when doing {workflow}?"

### Data Sources
- Past code review comments (recurring feedback = handbook rule)
- Bug reports caused by pattern violations
- Onboarding notes from new team members
- "Things I wish I knew" from experienced developers

### Output Structure
```
skills/
├── handbook-bug-detective/SKILL.md
├── handbook-code-generation/SKILL.md
├── handbook-code-reviewer/SKILL.md
├── handbook-feature-scaffolder/SKILL.md
├── handbook-unit-testing-generator/SKILL.md
└── handbook-code-documentation/SKILL.md
```

### Module Template
```markdown
---
name: handbook-{agent}
description: >
  Project-specific {agent workflow} rules for {project}. Overrides generic
  behavior with project-mandatory patterns, pitfalls, and checklists.
---
# {Agent} — Project Rules
## Mandatory Steps
1. Step specific to this project
2. Another mandatory step
## Project Checklist
- [ ] Check 1 (with why)
- [ ] Check 2 (with why)
## Common Pitfalls
| Pitfall | Why | Correct Approach |
|---------|-----|-----------------|
## Project-Specific Examples
[Real code snippets from this project showing correct patterns]
```

### Fragmentation Rules
- One handbook per agent: `handbook-{agent}/SKILL.md` (usually fits in one file)
- If handbook exceeds 150 lines: split into `handbook-{agent}/SKILL.md` (core rules) + `handbook-{agent}/examples.md` (code examples)
- Not all agents need handbooks — only those with project-specific deviations

---

## L3 — Project Instructions (Guided)

**Auto-loaded on every interaction. Must be concise (<80 lines). Only mandatory rules.**

### What Belongs in L3 (and ONLY here)

| Information | Example | Why always-loaded? |
|-------------|---------|-------------------|
| Runtime + version | "Spring Boot 3.2, Java 17" | AI must ALWAYS know what it generates for |
| DB + ORM | "PostgreSQL + JPA/Hibernate" | Otherwise generates wrong data access code |
| Folder structure (1-2 lines) | "Vertical Slice: `Features/{Feature}/`" | Must know where to place new files |
| 5-10 non-negotiable rules | "Never LocalDateTime, always Instant" | If broken = bug or PR rejection |
| Skills pointer | "see `skills/patterns-spring-boot/`" | Tells agents where to find details |

### What Does NOT Belong in L3

| Information | Goes to | Why not L3? |
|-------------|---------|-------------|
| Full code skeletons with annotations | **T1** `patterns-{name}/` | Too verbose; needed only when writing that code |
| Entity details, workflows, rules | **T2** `domain-{name}/` | Too specific; needed only for that domain |
| Service list with all endpoints | **T3** `repo-{name}/` | Large, changes often; load only when navigating |
| Agent-specific checklists | **T4** `handbook-{agent}/` | Only relevant when that agent is active |
| Language-wide conventions | **L2** `tech/{lang}.md` | Already auto-loaded, don't duplicate |

### Interview Protocol
1. "What is your runtime/framework and version?"
2. "What database + ORM/access layer?"
3. "What is the project directory structure?"
4. "What are your 5-10 non-negotiable coding rules?" (things that MUST be followed regardless of context)

### Data Sources
- Existing README or CONTRIBUTING.md
- Team coding standards document
- CI/CD lint rules and config
- Code review recurring comments

### Output File
`instructions/project/project-base.instructions.md`

### Template
```markdown
---
applyTo: '**/*.{ext}'
description: "Project essentials — mandatory rules for this repository"
---
# Project Essentials
## Architecture
- Runtime: {framework version}
- Database: {db + access layer}
- Structure: {source layout}
## Mandatory Rules
### {Rule Category 1}
{2-3 bullet points}
### {Rule Category 2}
{2-3 bullet points}
## Skills Reference
- Patterns: `skills/patterns-{name}/`
- Domain: `skills/domain-{name}/`
- Repo: `skills/repo-{name}/`
```

### Constraints
- MAX 80 lines (auto-loaded = token cost on every interaction)
- Only rules that apply to ALL code in the repo
- No examples (those go in T1 patterns)
- No domain knowledge (goes in T2)
- No per-agent rules (goes in T4)

---

## L4 — Personal Preferences (Self-authored)

**Developer writes this themselves. Agent can offer a template and suggest sections.**

### Prompt to Developer
"What personal preferences do you have that differ from team standards? Consider:
- Communication language and verbosity
- Workflow preferences (plan first? test first? iterative?)
- Code style overrides (line length, quote style, naming preferences)
- Tool preferences (test runner flags, linter configs)
- Things you always forget and want the agent to remind you"

### Output File
`instructions/personal/personal-preferences.instructions.md`

### Constraints
- Single file only (auto-loaded everywhere)
- MAX 40 lines (personal overrides should be few)
- Only differences from L1-L3 (if you agree with defaults, don't repeat them)

---

# ORCHESTRATION WORKFLOW

## Initial Adoption Sequence

```
Step 1: [GUIDED] Generate L3 — ask runtime, db, structure, mandatory rules
Step 2: [AUTONOMOUS] Generate T3 — scan repo, map services/endpoints/dependencies
Step 3: [GUIDED] Generate T2 — interview for domain knowledge, accept external docs
Step 4: [GUIDED+SCAN] Generate T1 — scan for patterns, confirm with developer
Step 5: [DERIVED] Generate T4 — derive from L3+T1-T3, ask for pitfalls
Step 6: [GUIDED] Generate L4 — offer template, developer fills in preferences
Step 7: [AUTONOMOUS] Update SKILLS-MAP.md — regenerate index with all new skills
```

## Incremental Update Triggers
- "New subdomain added" → add T2 skill module
- "New service/module created" → update T3 inventory
- "Recurring code review comment" → add to T4 handbook
- "New integration pattern" → add to T1 patterns
- "Framework version upgrade" → update T1 + L3
- "New team member onboarding issues" → expand T2 overview + T4 pitfalls

## Update Procedure
1. Ask: "What changed? (new feature area, new service, new pattern, recurring issue)"
2. Identify which tier(s) to update
3. Read existing skill files in that tier
4. Generate delta (new module or append to existing)
5. Present changes for confirmation
6. Update SKILLS-MAP.md if new files were created

---

# DATA SOURCE REFERENCE

## What to Ask For — Per Tier

| Tier | Agent Can Scan | Developer Must Provide |
|------|---------------|----------------------|
| T1 Patterns | Existing code patterns, test structure, base classes | Conventions not yet in code, planned changes, "golden example" files |
| T2 Domain | Entity names from DB/models, enum values, relationships | Business meaning, workflows, rules, actor descriptions, failure handling |
| T3 Repo | All of it (directory structure, configs, endpoints, deps) | Corrections, undocumented services, planned deprecations |
| T4 Handbooks | Common patterns from T1-T3 | Past mistakes, review comments, onboarding pain points, team conventions |
| L3 Project | Framework from configs, structure from tree | Non-negotiable rules, version constraints, architectural decisions |
| L4 Personal | Nothing | Everything (personal preferences only the developer knows) |

## Accepted Source Formats
- Direct text answers in chat
- File paths in the repo (agent reads them)
- URLs to Confluence/wiki pages (agent fetches content)
- Swagger/OpenAPI spec files
- Database migration files or ERD images
- Jira/issue tracker links for business requirements
- Copy-pasted code review comments
- Architecture Decision Records (ADRs)

---

# VALIDATION

After generating skills, verify:
1. Each skill file has valid YAML frontmatter with `name:` and `description:`
2. No skill exceeds 150 lines
3. No duplication between tiers (fact lives in one place only)
4. SKILLS-MAP.md is updated with new entries
5. Cross-references between skills use correct relative paths
6. L3 file is under 80 lines
7. L4 file is under 40 lines
8. All generated content is project-specific (no generic advice)
