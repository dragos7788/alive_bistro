---
name: react-new-vite-app
description: (cog-toolkit, React) Use it whenever the user wants to start a new React project, set up a React app, create a Vite app.
---

# React + Vite Scaffold

Scaffold a new React project using Vite's official CLI, then layer in the user's chosen options.

## Decision points

Resolve each of these before scaffolding. Use stated defaults when the user hasn't specified — **STOP AND ASK** for what's ambiguous or consequential.

| Decision | Default | Ask when |
|---|---|---|
| Language | TypeScript | User's intent is unclear and the project looks production-bound |
| Package manager | npm | A lockfile or existing project convention suggests otherwise |
| Styling | Plain CSS | User mentions design system, component library |
| Routing | None | App implies multiple pages/views |
| State management | None (React state) | App implies shared/global state across many components |

### Stop and ask

Some decisions materially change the project's shape and are expensive to undo. **STOP AND ASK** when:

- **Project name or target directory** is not given. Never invent a name or scaffold into the current directory without confirming.
- **TypeScript vs JavaScript** is ambiguous and the user describes something that sounds long-lived, shared, or team-facing (as opposed to a quick throwaway demo).
- **The target directory already contains files.** Never overwrite without explicit confirmation.
- **Multiple styling or state-management approaches are equally plausible** from the request (e.g., user says "make it pretty" — Tailwind vs. component library vs. plain CSS are all valid reads). Present the options briefly instead of picking one silently.
- **The user names a library or version that conflicts with defaults** (e.g., asks for Vite but pastes Create React App instructions). Flag the conflict before proceeding.

## Reference files

Load the relevant reference file only when that option is selected. Each is self-contained with install steps and config.

- `references/typescript.md` — TS config, strict mode, path aliases
- `references/styling.md` — Tailwind, CSS Modules, styled-components, plain CSS
- `references/routing.md` — react-router setup and patterns
- `references/state-management.md` — Zustand, Redux Toolkit, and when to skip both

## Workflow

### 1. Confirm decisions

Walk through the decision table above. Apply defaults silently; use **Stop and ask** for anything in that list.

### 2. Detect package manager

Check for existing lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) or an explicit user preference. Default to npm if nothing indicates otherwise.

### 3. Scaffold with the official CLI

Run Vite's create command with the correct template — don't hand-build the file tree:

```bash
npm create vite@latest <project-name> -- --template react-ts
```

Use `--template react` instead of `react-ts` for JavaScript. Substitute `pnpm create vite` or `yarn create vite` per the chosen package manager.

### 4. Install dependencies

```bash
cd <project-name>
npm install
```

### 5. Apply selected options

For each non-default choice (styling, routing, state management), open the matching reference file and follow its install/config steps. Apply them in this order: styling, then routing, then state management — later steps sometimes assume earlier ones are in place (e.g., router pages importing styled components).

### 6. Verify installed versions before using version-specific syntax

Vite and React APIs change between major versions. Check `package.json` after install rather than assuming a specific config API or flag is current:

```bash
cat package.json | grep -E '"(vite|react)":'
```

If a reference file's syntax looks outdated relative to the installed version, adapt it rather than applying it blindly.

### 7. Base project structure

A minimal scaffold (before any options are layered in) looks like:

```
project-name/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── assets/
├── public/
├── index.html
├── package.json
├── tsconfig.json          (TypeScript only)
├── vite.config.ts
└── eslint.config.js
```

### 8. Common config conventions

Apply regardless of chosen options:

- Keep `vite.config.ts` minimal — only add plugins the project actually uses.
- Enable ESLint's recommended React + hooks rules; don't disable rules without a stated reason.
- For TypeScript, default to `strict: true` in `tsconfig.json` unless the user asks for a looser setup (see `references/typescript.md`).
- Use `.env` / `.env.local` for environment variables, never commit secrets — add `.env.local` to `.gitignore` if not already present.

### 9. Verify the app boots

Before declaring the task done, confirm the app actually runs:

```bash
npm run build
```

A successful build is sufficient verification; don't leave a dev server running. If the build fails, fix the issue before reporting completion — don't hand back a broken scaffold.

### 10. Report to the user

Summarize: what was scaffolded, which options were applied, the final file tree, and the command to start development (`npm run dev`).

## Guidelines

- Use official CLI scaffolding (`npm create vite@latest`) — never hand-build the initial file tree.
- Don't add opinionated libraries (state management, component kits, CSS frameworks) without a clear user signal.
- Don't overwrite an existing project directory without confirmation.
- Keep decision-making in this file; keep variant-specific implementation detail in references.
- Prefer the fewest dependencies that satisfy the request — an app with no stated routing or state needs doesn't get a router or a store.
- If a chosen combination is unusual (e.g., Redux Toolkit with no routing on a one-page app), proceed anyway — the user's call, not a reason to push back, unless it looks like a misunderstanding worth a quick check.

## Checklist

- [ ] Project name and target directory confirmed with the user
- [ ] Target directory is empty or confirmed safe to scaffold into
- [ ] Language (TypeScript/JavaScript) resolved — asked if ambiguous and project seems long-lived
- [ ] Package manager detected or defaulted to npm
- [ ] Styling, routing, and state management choices resolved — asked if multiple equally plausible options existed
- [ ] Ran official Vite scaffold command with the correct template flag
- [ ] Installed dependencies
- [ ] Applied reference-file steps for each selected option, in order: styling, routing, state management
- [ ] Verified installed Vite/React versions before using version-specific config syntax
- [ ] Ran a build to confirm the app compiles without errors
- [ ] Reported final file tree, applied options, and the dev-server start command to the user