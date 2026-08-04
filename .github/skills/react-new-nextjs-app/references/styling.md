# Styling setup

Applies when the user selects a styling approach, or when conventions need clarifying. Tailwind is the CLI's built-in default option — no extra setup beyond the `--tailwind` flag.

If the request is ambiguous between two or more of these, stop and ask rather than picking one — see SKILL.md's Stop and ask section.

## Tailwind (default)

Included automatically with `create-next-app --tailwind`. Global styles live in `src/app/globals.css` with the Tailwind import already present. Remove unused boilerplate utility classes from the generated `page.tsx` rather than leaving them as dead weight.

## CSS Modules

No extra install — Next.js supports `*.module.css` out of the box, App Router or Pages Router.

Convention: one module per component, colocated:

```
src/components/Button/
├── Button.tsx
└── Button.module.css
```

Import as:

```ts
import styles from "./Button.module.css"
```

## styled-components / CSS-in-JS

```bash
npm install styled-components
npm install -D @types/styled-components   # TypeScript only
```

**Server Components caveat:** styled-components relies on React context and browser-only style injection, which conflicts with Server Components' rendering model. Any component using styled-components must be a Client Component (`"use client"`), and a registry pattern is needed to avoid style flashing during SSR. Follow the library's official Next.js App Router integration guide for the registry setup — don't skip it, since omitting it causes flash-of-unstyled-content in production.

Prefer Tailwind or CSS Modules over styled-components in the App Router unless the user specifically requests CSS-in-JS or the project already uses it.

## Choosing between options

- No stated preference → Tailwind (matches the CLI default, works cleanly with Server Components)
- Component-level style isolation without a utility-class approach → CSS Modules
- Existing codebase uses styled-components → keep it, but confirm the Client Component/registry tradeoff is acceptable
- Design system / brand consistency mentioned → ask whether Tailwind config extension or a component library is intended