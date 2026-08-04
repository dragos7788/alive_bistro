# Styling setup for a modern Remix app

## Tailwind (default)

Install and wire up via the Vite plugin:

```bash
npm install tailwindcss @tailwindcss/vite
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
});
```

`app/app.css` (imported once in `app/root.tsx`):

```css
@import "tailwindcss";
```

`app/root.tsx`:

```tsx
import styles from "./app.css?url";

export const links = () => [{ rel: "stylesheet", href: styles }];
```

No `tailwind.config.js` is required for basic usage with the Vite plugin; only add one if the user needs custom theme tokens, plugins, or content-path overrides.

## CSS Modules (zero-dependency alternative)

Works out of the box with Vite — no install needed. Name files `*.module.css` and import directly:

```tsx
import styles from "./route.module.css";

export default function Route() {
  return <div className={styles.container}>...</div>;
}
```

Good default when the user wants no styling dependency at all, or is porting a codebase that already uses CSS Modules.

## CSS-in-JS libraries (styled-components, Emotion, etc.)

These need extra configuration to work correctly under server-side rendering — server-rendered HTML must include the extracted styles, or the client hydrates against a flash of unstyled content. Two things to set up, not just the library install:

1. **A `vite-plugin-*` counterpart if one exists** (e.g. `vite-plugin-styled-components`) for consistent class name generation between server and client builds.
2. **Style extraction in `entry.server.tsx`** — collect the library's style sheet during the render pass and inject it into the response head before streaming, rather than relying on client-side injection alone.

Flag this extra setup cost to the user before proceeding if they've named a CSS-in-JS library — it's a heavier lift than Tailwind or CSS Modules for a fresh scaffold, and confirm they still want it once they understand the tradeoff.

## Choosing between them

| Approach | Best when |
|---|---|
| Tailwind | No stated preference; fastest path to a styled UI |
| CSS Modules | User wants zero styling dependencies or is matching an existing CSS Modules codebase |
| CSS-in-JS | User explicitly names a library (styled-components, Emotion, vanilla-extract) or is porting an existing app that uses one |

Don't introduce a component library (e.g. Chakra, MUI) unless the user asks for one by name — scaffolding should stay unopinionated about UI components beyond the styling mechanism itself.