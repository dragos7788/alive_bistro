# TypeScript setup

Applies when the project is scaffolded with `--typescript` (default).

## tsconfig conventions

`create-next-app` generates a working `tsconfig.json` — don't replace it wholesale. Adjust strictness if needed:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Loosen only on explicit request (e.g., "quick prototype"). If loosened, note in the final report which checks were disabled and why.

## Path aliases

`create-next-app` sets up `@/*` pointing to `src/*` by default when scaffolded with `--import-alias "@/*"`. Use this alias for internal imports rather than long relative paths:

```ts
import { Button } from "@/components/Button"
```

Don't introduce a second aliasing scheme — one alias convention per project.

## Typing Server Components and Route Handlers

Server Components are typed like regular async functions — no special wrapper needed:

```tsx
export default async function Page() {
  const data = await getData()
  return <main>{/* ... */}</main>
}
```

Route Handlers use the framework's request/response types:

```ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: true })
}
```

## Converting an existing JS scaffold to TS

If the user starts with JavaScript and later asks to add TypeScript:

1. Rename `.jsx`/`.js` files to `.tsx`/`.ts`.
2. Run `npm install -D typescript @types/react @types/node` — Next.js will detect the change and prompt to create `tsconfig.json` on next `npm run dev`, or create it manually using the standard template.
3. Run `npm run build` to surface type errors, then fix them — don't leave `any` scattered through the codebase as a shortcut unless the user explicitly wants a fast, loose migration.

## Common type errors after scaffold

- `params` and `searchParams` in App Router pages are typed as `Promise` in recent Next.js versions — check the installed version before assuming the synchronous shape from older tutorials.
- Environment variables via `process.env` are typed as `string | undefined` — don't cast to `string` without a runtime check or a typed env-validation layer.