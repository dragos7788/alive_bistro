# Addons

## Installed by default (`essentials`)

- Controls — auto-generated prop controls
- Actions — logs callback prop invocations
- Viewport — preview at different screen sizes
- Backgrounds — switch preview background color
- Docs — auto-generated docs page per component (via `tags: ['autodocs']`)

No install needed; these ship with `storybook init`.

## Commonly added

### `@storybook/addon-a11y`

```
npm install --save-dev @storybook/addon-a11y
```
Add to `.storybook/main.ts` addons array. Runs axe-core checks in a panel per story; surfaces violations without failing the build by default.

### `@storybook/addon-interactions`

```
npm install --save-dev @storybook/addon-interactions
```
Pairs with play functions (see `testing.md`) — shows step-by-step interaction playback in the Storybook UI for debugging.

### `@storybook/test-runner`

```
npm install --save-dev @storybook/test-runner
```
Runs every story as a Jest/Playwright-backed test in CI, executing any play functions and checking for render/console errors. Distinct from Chromatic — this checks functional behavior, not pixel diffs.

## Config pattern

All addons register in `.storybook/main.ts`:

```ts
export default {
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
};
```