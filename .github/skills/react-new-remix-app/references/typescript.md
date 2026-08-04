# TypeScript setup for a modern Remix app

## tsconfig conventions

The `create-react-router` TypeScript template ships a working `tsconfig.json`. Keep these settings unless the user has a stated reason to change them:

```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["node", "vite/client"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "target": "ES2022",
    "strict": true,
    "allowJs": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "rootDirs": [".", "./.react-router/types"],
    "paths": {
      "~/*": ["./app/*"]
    },
    "include": [
      "**/*.ts",
      "**/*.tsx",
      ".react-router/types/**/*"
    ],
    "noEmit": true
  }
}
```

The `.react-router/types` inclusion is what makes generated per-route types available; it's populated automatically the first time `npm run dev` or `npm run build` runs.

## Strictness

Default to `strict: true`. If the user asks for a looser setup (e.g. migrating a large JS codebase incrementally):

- Keep `strict: false` but turn on `strictNullChecks` individually — it catches the most common runtime bugs (undefined loader data) with the least migration friction.
- Avoid disabling `noImplicitAny` project-wide; scope `// @ts-expect-error` or targeted `any` to the specific files under migration instead.

## Path aliases

The `~/*` alias mapping to `./app/*` is the standard convention. Keep it unless the user's existing codebase already standardizes on something else — don't introduce a second alias convention into a fresh project without reason.

## Typing loaders and actions

Use the generated per-route types rather than hand-writing return-type interfaces — they're derived directly from the loader/action implementation, so they can't drift out of sync:

```tsx
import type { Route } from "./+types/item";

export async function loader({ params }: Route.LoaderArgs) {
  const item = await getItem(params.id);
  return { item };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { item } = loaderData;
  // `item` is typed from the loader's return value
}
```

Generated types require `react-router typegen` to have run at least once (the dev server and build both trigger this automatically) — if types appear stale after adding a new route, restart the dev server rather than assuming a bug in the route itself. Running `npm run typecheck` also triggers typegen before invoking `tsc`.

Avoid manually importing `LoaderFunctionArgs`/`ActionFunctionArgs` style types for new route files — the generated `Route.LoaderArgs` / `Route.ActionArgs` / `Route.ComponentProps` cover the same needs with less manual upkeep.