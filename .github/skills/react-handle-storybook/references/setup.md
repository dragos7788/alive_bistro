# Storybook Setup by Framework

Contents:
- Vite
- Next.js
- Remix

Read only the section matching the project's detected framework.

## Vite

1. `npx storybook@latest init` — auto-detects Vite and installs `@storybook/react-vite`.
2. Confirm `.storybook/main.ts` has:
   ```ts
   framework: { name: '@storybook/react-vite', options: {} }
   ```
3. If the app imports via aliases (e.g. `@/components/Button`), add `vite-tsconfig-paths` to `.storybook/main.ts`:
   ```ts
   import tsconfigPaths from 'vite-tsconfig-paths';
   export default {
     viteFinal: (config) => {
       config.plugins?.push(tsconfigPaths());
       return config;
     },
   };
   ```
4. Tailwind/PostCSS: import the global stylesheet in `.storybook/preview.ts` so utility classes apply inside stories.

## Next.js

1. `npx storybook@latest init` — should detect Next.js and install `@storybook/nextjs`. If it installs the generic `@storybook/react-vite` instead, replace it manually:
   ```
   npm install --save-dev @storybook/nextjs
   ```
   and update `framework.name` in `.storybook/main.ts`.
2. `@storybook/nextjs` auto-mocks `next/image`, `next/font`, and `next/router`/`next/navigation`. Don't hand-roll mocks for these.
3. App Router vs Pages Router: components using App Router server-only APIs (e.g. `cookies()`, `headers()`) can't render in Storybook directly — extract the client-rendered UI into a separate component and story that instead.
4. If using `next/font` with a custom config, verify the font loads in the story preview; if not, check `staticDirs` in `main.ts` includes the `public/` folder.

## Remix

1. `npx storybook@latest init`, or manually install `@storybook/react-vite` if Remix uses Vite as its bundler (Remix v2+ default).
2. Remix components frequently call `useLoaderData()`, `useActionData()`, or `useFetcher()` — these throw outside a Remix route context. Mock them with a decorator:
   ```tsx
   import { createRemixStub } from '@remix-run/testing';

   export const decorators = [
     (Story) => {
       const RemixStub = createRemixStub([{ path: '/', Component: Story }]);
       return <RemixStub />;
     },
   ];
   ```
3. For components depending on specific loader data, pass it via the stub's route `loader` function per-story rather than globally, so each story can simulate different data states.
4. If styles are missing, confirm the app's root stylesheet is imported in `.storybook/preview.ts`.