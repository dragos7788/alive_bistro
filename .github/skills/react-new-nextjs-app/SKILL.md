---
name: react-new-nextjs-app
description: (cog-toolkit, React) Use this skill whenever the user wants to start a new Next.js project, set up a full-stack React app, create an app with server-side rendering, or bootstrap a frontend with routing and API routes built in — even without the word "scaffold."
---

# Next.js Scaffold

Scaffold a new Next.js project using the official CLI, then layer in the user's chosen options.

## Decision points

Resolve each of these before scaffolding. Use stated defaults when the user hasn't specified — **STOP AND ASK** for what's ambiguous or consequential.

| Decision | Default | Ask when |
|---|---|---|
| Router | App Router | User references Pages Router, `getServerSideProps`, or an older codebase |
| Language | TypeScript | Ambiguous and project looks long-lived or team-facing |
| Package manager | npm | A lockfile or stated preference suggests otherwise |
| Styling | Tailwind | User mentions a design system, component library, or CSS-in-JS preference |
| Linter | ESLint | User names Biome or wants a faster/unified lint+format toolchain |
| React Compiler | Off | User asks for automatic memoization or mentions performance-sensitive re-renders |
| Data fetching library | SWR | App has complex mutation flows or user names React Query |
| Rendering strategy | Framework default (mixed) | User has explicit static-export, SSR-only, or ISR requirements |

### Stop and ask

Stop and ask the user directly (don't guess) when:

- **Project name or target directory** is not given. Never invent a name or scaffold into the current directory without confirming.
- **The target directory already contains files.** Never overwrite or scaffold into a non-empty directory without explicit confirmation.
- **App Router vs Pages Router is ambiguous.** If the user pastes Pages-Router-style code (`getServerSideProps`, `pages/api/`) but also asks for "the latest Next.js," these are structurally different — confirm which one before scaffolding, since mixing them causes real bugs, not just style inconsistency.
- **Rendering strategy conflicts with a stated need.** E.g., the user wants real-time or frequently-changing data but also asks for static export (`output: "export"`) — these are incompatible; flag the conflict and ask which takes priority.
- **Multiple styling or data-fetching approaches are equally plausible** from the request. Present the options briefly instead of picking one silently.

For everything else — package manager, minor config, folder layout within `app/` — proceed with the default and mention the assumption inline rather than pausing.

## Reference files

Load the relevant reference file only when that option is selected. Each is self-contained with install steps and config.

- `references/typescript.md` — tsconfig conventions, path aliases, strictness
- `references/styling.md` — Tailwind, CSS Modules, styled-components/CSS-in-JS caveats with Server Components
- `references/data-fetching.md` — Route Handlers, SWR, React Query

## Workflow

### 1. Confirm decisions

Walk through the decision table above. Use **Stop and ask** for anything in that list.

### 2. Detect package manager

Check for existing lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) or an explicit user preference. Default to npm if nothing indicates otherwise.

### 3. Scaffold with the official CLI

Run Next.js's create command — don't hand-build the file tree:

```bash
npx create-next-app@latest <project-name> \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

Adjust flags per resolved decisions: drop `--typescript` for JavaScript, drop `--tailwind` if a different styling option was chosen, swap `--eslint` for Biome if requested, use `--no-app` only if Pages Router was explicitly confirmed. The CLI also prompts for React Compiler opt-in during interactive setup — accept the resolved default (off unless requested) if scaffolding non-interactively. Substitute `pnpm create next-app` or `yarn create next-app` per the chosen package manager.

If the user is fine with fully standard settings, the CLI's "recommended defaults" prompt (TypeScript, ESLint, Tailwind, App Router) is an acceptable non-interactive equivalent to the explicit flags above.

### 4. Install dependencies

The CLI installs dependencies automatically. If additional packages are needed for selected options (a data-fetching library), install them next:

```bash
cd <project-name>
npm install <additional-packages>
```

### 5. Apply selected options

For each non-default choice (styling, data fetching), open the matching reference file and follow its install/config steps. Apply in this order: styling, then data fetching — data-fetching setup sometimes assumes styling/layout structure is already in place.

### 6. Verify installed versions before using version-specific syntax

Next.js APIs change meaningfully between major versions (e.g., App Router conventions, `next.config.js` options, caching defaults). Check `package.json` after install rather than assuming a specific config API is current:

```bash
cat package.json | grep -E '"(next|react)":'
```

If a reference file's syntax looks outdated relative to the installed version, adapt it rather than applying it blindly.

### 7. Base project structure (App Router default)

```
project-name/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
├── public/
├── next.config.js
├── package.json
├── tsconfig.json          (TypeScript only)
├── eslint.config.js       (or biome.json if Biome was chosen)
└── AGENTS.md              (CLI default; keep or remove per user preference)
```

### 8. Common config conventions

Apply regardless of chosen options:

- Keep `next.config.js` minimal — only add options the project actually needs (image domains, redirects, etc.).
- Enable the framework's recommended ESLint config (`next/core-web-vitals`), or the equivalent Biome config if chosen; don't disable rules without a stated reason.
- Lint via the project's `lint` script rather than a `next lint` subcommand — recent Next.js versions run ESLint 9 directly through the script instead of a built-in CLI command.
- Turbopack is the default dev/build bundler — don't add manual Webpack configuration unless the project has a stated need Turbopack doesn't cover.
- For TypeScript, default to `strict: true` unless the user asks for a looser setup (see `references/typescript.md`).
- Mark Client Components explicitly with `"use client"` only where interactivity or browser APIs require it — default to Server Components otherwise. Note in the final report which files are client-side and why.
- Use `.env.local` for environment variables, never commit secrets — confirm it's in `.gitignore` (Next.js includes this by default).

### 9. Verify the app builds

Before declaring the task done, confirm the app actually builds — dev mode can hide SSR and build-time errors:

```bash
npm run build
```

If the build fails, fix the issue before reporting completion — don't hand back a broken scaffold. Don't leave a dev server running as the sole verification step.

### 10. Report to the user

Summarize: router type, which options were applied, the final file tree, any Client Component boundaries introduced, and the command to start development (`npm run dev`).

## Guidelines

- Use `create-next-app` — never hand-build the initial file tree.
- Default to App Router; use Pages Router only on explicit request or to match an existing codebase.
- Don't add a data-fetching library or a state manager without a clear user signal.
- Keep Server vs Client Component boundaries explicit and minimal — pushing `"use client"` higher than necessary loses the framework's main benefit.
- Verify with `npm run build`, not just `npm run dev`, since server-only errors don't always surface in dev mode.
- Keep decision-making and workflow in this file; keep variant-specific implementation detail in references.

## Checklist

- [ ] Project name and target directory confirmed with the user
- [ ] Target directory is empty or confirmed safe to scaffold into
- [ ] Router (App vs Pages) resolved — asked if the request had conflicting signals
- [ ] Language, package manager, styling, linter (ESLint/Biome) resolved
- [ ] React Compiler opt-in resolved (default off) if performance-sensitive re-renders were mentioned
- [ ] Data fetching approach resolved — asked if the app needs complex mutation flows or names a library
- [ ] Ran `create-next-app` with the correct flags
- [ ] Applied reference-file steps for each selected option, in order: styling, data fetching
- [ ] Verified installed Next.js/React versions before using version-specific config syntax
- [ ] Ran a full build to confirm no SSR/build-time errors
- [ ] Reported final file tree, applied options, Client Component boundaries, and the dev-server start command