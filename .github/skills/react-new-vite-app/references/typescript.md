# TypeScript setup

Applies when the project uses the `react-ts` template.

## tsconfig conventions

Default to strict mode. In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  }
}
```

Loosen only on explicit request (e.g., "quick prototype, don't worry about strictness"). If loosened, note in the final report which checks were disabled and why.

## Path aliases

For `@/` imports pointing to `src/`, add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

And mirror it in `vite.config.ts`:

```ts
import path from "path"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})
```

Only add aliases if the user asks for them or the project has enough depth (nested folders) that relative imports would get unwieldy. Skip for small scaffolds.

## Converting an existing JS scaffold to TS

If the user starts with `--template react` and later asks to add TypeScript:

1. Rename `.jsx` files to `.tsx`, `.js` to `.ts`.
2. Add `typescript` and `@types/react`, `@types/react-dom` as dev dependencies.
3. Add a `tsconfig.json` (use the base react-ts template's version as reference, don't write one from scratch).
4. Update `vite.config.js` to `vite.config.ts`.
5. Run `npm run build` to surface type errors, then fix them — don't leave `any` scattered through the codebase as a shortcut unless the user explicitly wants a fast, loose migration.

## Common type errors after scaffold

- Missing `React` import isn't needed with the new JSX transform (Vite's default) — don't add it defensively.
- Event handler types: use `React.ChangeEvent<HTMLInputElement>` etc., not `any`.
- Vite env variables: type them via `src/vite-env.d.ts` (included by default in the react-ts template) rather than casting `import.meta.env` inline.