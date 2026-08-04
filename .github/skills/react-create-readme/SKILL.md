---
name: react-create-readme
description: (cog-toolkit, React) Use this skill whenever a user asks to create, write, generate, or improve a README file for a React, Next.js, Remix, or Vite project.
---

# Create README

## Task

1. Analyze the entire project and workspace structure
2. Create a comprehensive and well-structured README.md file
3. Ensure the README is informative, and easy to read


## Guidelines

### Structure

Include these sections as appropriate:

```markdown
# Project Name

Brief, compelling description (1-2 sentences)

## Features

- Key feature 1
- Key feature 2
- Key feature 3

## Prerequisites

List required tools and versions. Use exact versions, nothing assumed.

## Getting Started

### Installation

Step-by-step installation instructions

### Configuration

Configuration options and environment variables

### Running the Application

Commands to run the app locally

List the available scripts. For example:

```md
| Script              | Description                        |
|---------------------|------------------------------------|
| `npm run dev`       | Start dev server at localhost:3000 |
| `npm run build`     | Production build                   |
| `npm test`          | Run unit tests                     |
| `npm run lint`      | ESLint + Prettier check            |
| `npm run type-check`| TypeScript without emitting        |
```

## Project Structure

High-level folder structure explanation

### Running Tests

Include if the project has testing config

### Code Quality

Linting, formatting, and type checking commands

## Architecture

High-level architecture diagram and layer overview

## Deployment
Include CI/CD pipeline, platform-specific steps. Link to platform docs rather than duplicating them.

### Content Rules

Before writing, collect as much as you can. If files are available:

- Read `package.json` — name, description, scripts, dependencies, engines
- Scan `src/` structure — routing, state management, key modules
- Check for `.env.example`, `docker-compose.yml`, CI config (`.github/workflows/`)
- Note the framework: plain React, Next.js (App Router vs Pages), Remix, Vite

### Writing Rules

**Do:**
- Use actual project commands, not generic placeholders
- Call out gotchas inline where they occur (`# required — app won't start without this`)
- Use tables for env vars and scripts
- Link to external docs instead of duplicating them
- Ensure all links are valid
- Note which Node/package manager version is expected
- Keep the README concise and focused

**Don't:**
- Do NOT open with "Welcome to [Project]! This is an exciting..." — lead with what it does
- Do NOT list every npm package as part of the stack
- Do NOT assume a tech stack — detect it from the project files
- Do NOT include sections for features that don't exist
