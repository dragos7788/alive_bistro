---
name: react-handle-storybook
description: Use this skill when setting up Storybook in a React project, writing or fixing component stories (.stories.tsx/jsx), configuring addons, setting up visual regression testing (Chromatic or similar), or debugging Storybook build/config issues. Trigger on mentions of "Storybook", ".stories" files, "component explorer", "visual regression", "Chromatic", "isolate this component", or requests to document/showcase React components visually — even if the user doesn't say "Storybook" explicitly.
---

# Storybook for React

Set up Storybook, write stories, configure addons, and wire up visual regression testing for React projects built with Vite, Next.js, or Remix.

## When to use this skill

Use for:
- Installing Storybook into a new or existing React app
- Writing, fixing, or reviewing `.stories.tsx`/`.stories.jsx` files
- Configuring addons (a11y, interactions, viewport, docs)
- Setting up or debugging Chromatic / visual regression testing
- Diagnosing Storybook build or config errors

Do not use for:
- Full end-to-end testing (Playwright/Cypress user flows) — Storybook's test-runner covers component-level interaction tests only

## Detection step

Before making changes, check the project state:

1. Does `.storybook/` already exist? If yes, read `main.ts`/`main.js` to see current config rather than re-initializing.
2. Check `package.json` for `@storybook/*` packages and their versions.
3. Identify the framework: look for `vite.config.*` (Vite), `next.config.*` (Next.js), or `remix.config.*` / `vite.config.*` with Remix plugin (Remix).
4. Check TypeScript vs JavaScript (`tsconfig.json` presence).
5. Check if Chromatic is already wired into CI: look for `chromatic.yml`/`.github/workflows/*chromatic*` and a `CHROMATIC_PROJECT_TOKEN` reference.

Skip re-running steps that are already in place — e.g. don't re-init Storybook if `.storybook/` exists and looks healthy.

## Setup workflow

1. Run `npx storybook@latest init`. It detects the framework and installs the matching `@storybook/<framework>` package.
2. Verify the generated `.storybook/main.ts` matches the project's actual framework and bundler — the auto-detection occasionally guesses wrong in monorepos.
3. Apply framework-specific setup from `references/setup.md`:
   - **Vite**: confirm builder is `@storybook/builder-vite`; wire up path aliases via `vite-tsconfig-paths` if the app uses `@/` imports.
   - **Next.js**: confirm `@storybook/nextjs` is the framework package (not the generic `react-vite` one); this handles `next/image`, `next/font`, and routing mocks automatically.
   - **Remix**: use `@storybook/react-vite` with Remix-specific mocking for loader/action data, since most Remix components read route data that doesn't exist in isolation.
4. Only consult `references/setup.md` for the framework actually in use — no need to read all three sections.

## Story-writing conventions

Always use CSF3 (Component Story Format 3):

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Click me', variant: 'primary' },
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
};
```

Guidelines:
- One story file per component, colocated: `Button.tsx` + `Button.stories.tsx`.
- Cover meaningful states (default, loading, error, disabled, empty) — not just the default render.
- Prefer `args` over hardcoded JSX inside the story body; this keeps controls functional in the Storybook UI.
- Use `decorators` for wrapping context (theme providers, routers) rather than duplicating wrapper JSX in every story.

See `references/writing-stories.md` for args/controls patterns, decorator examples, and MDX vs CSF guidance.

## Addon guidance

Default-installed by `storybook init`: `essentials` (controls, actions, viewport, backgrounds, docs).

Commonly added separately:
- `@storybook/addon-a11y` — accessibility checks per story
- `@storybook/addon-interactions` — debug play-function test steps
- `@storybook/test-runner` — run stories as automated tests in CI

See `references/addons.md` for install commands and config snippets.

## Visual regression testing with Chromatic

Every committed story is a potential visual test case — Chromatic snapshots each story and flags pixel diffs on future runs. Story coverage directly determines regression coverage, so treat "add a story" and "add a visual test" as the same action.

Setup:
1. `npx chromatic --project-token=<token>` for a first manual run.
2. Store the token as a CI secret (`CHROMATIC_PROJECT_TOKEN`), never commit it.
3. Add a CI step that runs on PRs; Chromatic posts a check with any visual diffs.

Workflow:
- Review diffs in the Chromatic UI per PR. Accept intentional changes; investigate unexpected ones before merging.
- Handle flaky snapshots at the source: mock dates/random data, pause animations via `parameters.chromatic.pauseAnimationAtEnd`, or exclude non-deterministic stories with `parameters.chromatic.disableSnapshot`.
- Chromatic (hosted, PR-integrated, pixel-diffing) is distinct from the local test-runner (interaction/play-function assertions) — don't conflate the two when a user asks for "testing."

See `references/testing.md` for CI YAML examples and troubleshooting flaky diffs.

## Common failure modes

- Story not appearing in sidebar: check `stories` glob in `.storybook/main.ts` matches the file's location.
- Controls not generating from TypeScript props: confirm `@storybook/addon-docs` and the TS docgen (`react-docgen-typescript`) are configured.
- Next.js `next/image` or `next/font` breaking in stories: confirm `@storybook/nextjs` is installed, not the generic Vite/webpack framework package.
- Remix stories crashing on render: loader/action data isn't mocked — wrap with a decorator providing the expected route data.
- MDX vs CSF confusion: use CSF3 for stories themselves; reserve MDX for narrative docs pages, not for defining stories.
- Chromatic false positives: usually non-deterministic content (timestamps, random IDs, animations) — fix at the source rather than repeatedly re-accepting diffs.

## Verification step

After setup or story changes, confirm success rather than assuming the file alone is sufficient:
1. Run `storybook dev` and check the story renders without console errors.
2. Run `storybook build` to confirm production build succeeds.
3. For visual regression work, confirm a Chromatic build completes and captures a baseline.