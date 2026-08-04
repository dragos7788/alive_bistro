# Styling setup

Applies when the user selects a styling approach other than plain CSS, or when plain CSS conventions need clarifying.

If the request is ambiguous between two or more of these (e.g., "make it look modern" could mean Tailwind or a component library), stop and ask rather than picking one — see SKILL.md's Stop and ask section.

## Tailwind CSS

```bash
npm install tailwindcss @tailwindcss/vite
```

In `vite.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()]
})
```

In `src/index.css` (or equivalent entry stylesheet):

```css
@import "tailwindcss";
```

Remove default boilerplate CSS from `App.css` once Tailwind is active — don't leave both systems fighting over the same elements.

## CSS Modules

No extra install — Vite supports `*.module.css` out of the box.

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

## styled-components

```bash
npm install styled-components
npm install -D @types/styled-components   # TypeScript only
```

Colocate styled definitions with components, or use a `styles.ts` file per component for larger components. Don't scatter styled-component definitions into a single global file — defeats the colocation benefit.

## Plain CSS (default)

Keep global styles in `src/index.css`, component-specific overrides in per-component `.css` files imported directly. Don't introduce a naming convention (BEM, etc.) unless the user asks — keep it simple for a scaffold.

## Choosing between options

- Design system / brand consistency mentioned → Tailwind or a component library (ask which)
- "Keep it simple" / small app → plain CSS
- Team already uses a convention → match it, ask if unstated
- Component-level style isolation is a stated concern → CSS Modules or styled-components