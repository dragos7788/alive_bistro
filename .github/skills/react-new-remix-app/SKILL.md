---
name: react-new-remix-app
description: (cog-toolkit, React) Use this skill whenever the user wants to start a new Remix project, set up a full-stack React app with file-based routing and loaders/actions, or bootstrap a frontend with server-side data loading built in.
---

# Remix Scaffold

Scaffold a modern Remix app using the current official CLI and conventions, then layer in the user's chosen options.

## What "modern Remix" means

Remix's routing, data loading, and SSR are now part of React Router v7 as "framework mode." A new Remix app today is a React Router v7 framework-mode app: it runs on Vite, uses the `react-router` package family (not `@remix-run/*`), and gets typed routes generated automatically. Scaffold this by default. Only fall back to classic `@remix-run/*` conventions if the user is explicitly extending an existing codebase that already uses them — don't introduce classic conventions into a brand-new project.

## When this applies

Trigger on requests to start a new Remix project, bootstrap a full-stack React app with file-based routing, or set up an app with server-side data loading via loaders and actions — regardless of whether the user says "Remix" explicitly. Also trigger when a user describes wanting nested routes with per-route data fetching, progressive enhancement via forms, or server-rendered React without picking a heavier framework.

Do not use this skill for:
- Pure client-side SPAs with no server data needs — a Vite scaffold is a better fit.
- Projects that explicitly want Next.js conventions (App Router, Server Components, `getServerSideProps`).
- Adding a single route or component to an existing Remix app — that's a normal edit task, not a scaffold.
- An existing codebase already on classic `@remix-run/*` packages that just needs a new feature — match its existing conventions instead of introducing framework-mode patterns.

## Decision points

Resolve each of these before scaffolding. Use stated defaults when the user hasn't specified — **STOP AND ASK** for what's ambiguous or consequential.

| Decision | Default | Ask when |
|---|---|---|
| Language | TypeScript | Ambiguous and project looks long-lived or team-facing |
| Package manager | npm | A lockfile or stated preference suggests otherwise |
| Styling | Tailwind | User mentions a design system, component library, or CSS-in-JS preference |
| Data loading | Built-in loaders/actions | User names a client-fetch library (unusual fit in Remix — flag it) |

### Stop and ask

Some decisions materially change the project's shape and are expensive to undo. Stop and ask the user directly (don't guess) when:

- **Project name or target directory** is not given. Never invent a name or scaffold into the current directory without confirming.
- **The target directory already contains files.** Never overwrite or scaffold into a non-empty directory without explicit confirmation.
- **Routing convention is ambiguous.** If the user describes React Router v6 SPA patterns (client-side `useNavigate`-centric routing, no server data loading) but also asks for "Remix" or "the latest React Router," these lead to different file structures — confirm file-based routing with loaders/actions is what they want before scaffolding.
- **The user references an existing `@remix-run/*` codebase.** This signals classic Remix conventions, not framework mode. Confirm whether they want the new project to match that codebase's conventions or start fresh on framework mode.
- **Data loading approach conflicts with a stated need.** E.g., the user wants a client-fetch library (SWR, React Query) alongside a request for "a typical Remix app" — these overlap awkwardly with loaders/actions; confirm which should be the primary data mechanism.
- **Multiple styling approaches are equally plausible** from the request. Present the options briefly instead of picking one silently.

For everything else — package manager, minor config, folder layout within `app/routes/` — proceed with the default and mention the assumption inline rather than pausing.

### Why these defaults

- **TypeScript by default**: route modules (loaders, actions, meta) benefit heavily from typed data flowing between server and client, and framework mode generates most of those types automatically. The maintenance cost is low for anything beyond a throwaway prototype.
- **Tailwind by default**: it's the path with the least extra plumbing on top of the framework-mode Vite setup — no additional server-rendering caveats to manage, unlike some CSS-in-JS libraries.
- **Built-in loaders/actions by default**: this is Remix's core value proposition. Reaching for a client-fetch library first undercuts the reason to pick Remix at all, so this default is deliberately sticky — flag it rather than swap silently.

## Reference files

Load the relevant reference file only when that option is selected. Each is self-contained with install steps and config.

- `references/typescript.md` — tsconfig conventions, path aliases, strictness, and typing loaders/actions with generated route types.
- `references/styling.md` — Tailwind setup via `@tailwindcss/vite`, CSS Modules as a zero-dependency alternative, and known friction points running CSS-in-JS libraries under server rendering.

## Workflow

### 1. Confirm decisions

Walk through the decision table above. Apply defaults silently; use **Stop and ask** for anything in that list.

### 2. Detect package manager

Check for existing lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) or an explicit user preference. Default to npm if nothing indicates otherwise.

### 3. Scaffold with the official CLI

Use the current React Router CLI — don't hand-build the file tree and don't use the older `create-remix` command for new projects:

```bash
npx create-react-router@latest <project-name>
```

The CLI prompts for TypeScript vs JavaScript and whether to install dependencies. Pass flags to skip prompts where the choice is already resolved:

| Flag | Purpose |
|---|---|
| `--no-install` | Skip automatic dependency install |
| `--no-git-init` | Skip git repo initialization |
| `--package-manager <pm>` | Force npm/pnpm/yarn/bun instead of auto-detecting |

Substitute `pnpm create react-router` or `yarn create react-router` per the chosen package manager if not using `--package-manager`.

### 4. Install dependencies

The CLI installs dependencies automatically unless `--no-install` was passed. If additional packages are needed for selected options (styling, data-fetching libraries), install them next:

```bash
cd <project-name>
npm install <additional-packages>
```

### 5. Apply selected options

For each non-default choice (styling, data loading), open the matching reference file and follow its install/config steps. Apply styling before touching data-loading conventions, since styling setup rarely interacts with route logic.

### 6. Verify installed versions before using version-specific syntax

Check `package.json` after install rather than assuming a specific API is current:

```bash
cat package.json | grep -E '"(react-router|@react-router|react)":'
```

If the project unexpectedly contains `@remix-run/*` packages instead of `react-router`/`@react-router/*`, the CLI produced a classic-Remix layout — confirm with the user whether that's intended before writing route code, since the two conventions are not drop-in compatible.

### 7. Base project structure

```
project-name/
├── app/
│   ├── routes/
│   │   └── home.tsx
│   ├── root.tsx
│   ├── routes.ts
│   ├── entry.client.tsx
│   └── entry.server.tsx
├── public/
├── package.json
├── react-router.config.ts
├── tsconfig.json          (TypeScript only)
└── vite.config.ts
```

`routes.ts` declares the route tree explicitly in framework mode rather than relying purely on filename conventions — prefer it for anything beyond a couple of routes, since it keeps the URL structure visible in one place.

### 7a. Example route module

New routes should follow the loader/action/component pattern rather than fetching data in `useEffect`:

```tsx
import type { Route } from "./+types/item";

export async function loader({ params }: Route.LoaderArgs) {
  const item = await getItem(params.id);
  return { item };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  await updateItem(formData);
  return { ok: true };
}

export default function ItemRoute({ loaderData }: Route.ComponentProps) {
  const { item } = loaderData;
  return (
    <form method="post">
      <input name="name" defaultValue={item.name} />
      <button type="submit">Save</button>
    </form>
  );
}
```

Generated `Route` types come from `react-router typegen`, which the dev server and build both run automatically. If types look stale after adding a route, restart the dev server rather than assuming a bug in the route itself.

### 7b. Error boundaries

Export an `ErrorBoundary` from a route to handle both thrown responses (e.g. a loader's 404) and unexpected exceptions scoped to that route segment, rather than letting errors bubble to a generic root-level page:

```tsx
import { isRouteErrorResponse, useRouteError } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <p>{error.status} {error.statusText}</p>;
  }
  return <p>Something went wrong.</p>;
}
```

Add this to routes with meaningful failure modes (data-dependent detail pages, form submissions) rather than every route by default — a blanket boundary on every file adds noise without adding safety for routes that can't realistically fail.

### 7c. Progressive enhancement

The `Form` component works without client-side JavaScript by default — submissions post to the server and the page re-renders with fresh loader data. Preserve this where practical:

- Use `<Form>` from `react-router` for standard navigational submissions rather than manually wiring `onSubmit` handlers with `fetch`.
- Reach for `useFetcher` only when a submission should not trigger a full navigation (e.g. a like button, inline edit) — it's the escape hatch, not the default.
- Avoid disabling a form's native submission behavior (e.g. `event.preventDefault()` followed by manual `fetch`) unless there's a concrete reason; doing so silently drops the no-JS fallback the framework provides for free.

### 8. Common config conventions

Apply regardless of chosen options:

- Keep `vite.config.ts` minimal — only add options the project actually needs.
- Colocate loaders and actions with the routes they serve; avoid a separate top-level data layer unless the app has shared fetching logic across many routes.
- For TypeScript, default to `strict: true` unless the user asks for a looser setup (see `references/typescript.md`).
- Use `.env` for environment variables, never commit secrets — confirm it's in `.gitignore`.
- Prefer loaders for reads and actions for writes over client-side `fetch` calls, unless the user has explicitly chosen a client-fetch library.
- Declare routes explicitly in `routes.ts` rather than relying only on filename conventions once the route tree grows past a handful of routes.

Default `package.json` scripts from the CLI template, unchanged unless the user has a reason to customize them:

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server with HMR |
| `npm run build` | Production build (client + server bundles) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Run typegen + `tsc` without emitting (TypeScript projects) |

### 9. Verify the app builds

Before declaring the task done, confirm the app actually builds — dev mode can hide server-side and build-time errors:

```bash
npm run build
```

If the build fails, fix the issue before reporting completion — don't hand back a broken scaffold. Don't leave a dev server running as the sole verification step.

For any routes added beyond the default template, do a quick manual smoke test:

- Loader-backed routes return the expected data shape.
- Any form using an `action` submits without a console error and reflects the expected result.
- Dynamic segments resolve correctly for at least one real value.

## Troubleshooting

- **`create-react-router` fails or is unavailable**: confirm the package name and network access; don't fall back to hand-building the tree.
- **Build succeeds but styles don't apply**: confirm the styling reference's Vite plugin (e.g. `@tailwindcss/vite`) is registered in `vite.config.ts` — a common miss when adding styling after initial scaffold.
- **Type errors on `loader`/`action`**: usually stale generated types after adding or renaming a route — restart the dev server so `react-router typegen` re-runs.
- **`npm run build` passes but `npm run dev` throws a hydration mismatch**: usually server/client output differs due to non-deterministic values (e.g. `Date.now()`, random IDs) rendered directly in a component body — move such values into a loader or client-only effect.

## Guidelines

- Use `create-react-router` — never hand-build the initial file tree, and don't reach for the older `create-remix` command for new projects.
- Default every new project to React Router v7 framework mode; only match classic `@remix-run/*` conventions when extending an existing codebase that already uses them.
- Don't add a data-fetching library or state manager without a clear user signal; built-in loaders/actions cover most needs.
- Keep loaders and actions colocated with their routes.
- Declare routes in `routes.ts` once the app has more than a handful of routes.
- Verify with `npm run build`, not just `npm run dev`, since server-only errors don't always surface in dev mode.
- Keep decision-making and workflow in this file; keep variant-specific implementation detail in references.

## Checklist

- [ ] Project name and target directory confirmed with the user
- [ ] Target directory is empty or confirmed safe to scaffold into
- [ ] Routing convention confirmed if the request had conflicting signals (SPA-style vs file-based loaders/actions)
- [ ] Confirmed framework mode vs classic Remix if the user referenced an existing `@remix-run/*` codebase
- [ ] Language, package manager, styling resolved
- [ ] Data-loading approach resolved — asked if a client-fetch library was implied alongside Remix conventions
- [ ] Ran `create-react-router` with the correct flags
- [ ] Applied reference-file steps for each selected option, in order: styling, then data-loading conventions
- [ ] Verified installed package family (`react-router` vs `@remix-run/*`) before using version-specific syntax
- [ ] Ran a full build to confirm no server-side or build-time errors