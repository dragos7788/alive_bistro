# Testing: Test-Runner, Play Functions, and Chromatic

## Play functions and interaction tests

Play functions simulate user interaction and assert on the result, inside a story:

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const SubmitsForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email'), 'test@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(canvas.getByText('Success')).toBeInTheDocument();
  },
};
```

Run these via `@storybook/test-runner`:
```
npx test-storybook
```
This checks functional behavior (does the form submit) — it does not check pixel-level appearance.

## Chromatic setup

1. Sign up at chromatic.com and link the repository, or generate a project token directly.
2. First run:
   ```
   npx chromatic --project-token=<token>
   ```
3. Store the token as `CHROMATIC_PROJECT_TOKEN` in CI secrets — never commit it.
4. Example GitHub Actions step:
   ```yaml
   - name: Publish to Chromatic
     uses: chromaui/action@latest
     with:
       projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
   ```

## Reviewing diffs

- Chromatic posts a status check on each PR listing visually changed stories.
- Accept intentional changes to update the baseline; investigate unexpected diffs before merging.
- Diffs accumulate per branch — merging without reviewing pending changes can silently update baselines.

## Handling flaky snapshots

Common causes and fixes:
- **Animations**: pause at the end via `parameters.chromatic.pauseAnimationAtEnd`, or disable via CSS in a decorator.
- **Timestamps/random data**: mock `Date.now()` or random generators at the story/decorator level so output is deterministic.
- **Non-deterministic third-party widgets** (maps, ads): exclude the story from snapshotting with `parameters.chromatic.disableSnapshot: true` and cover it functionally instead.

## Chromatic vs test-runner

| | Chromatic | test-runner |
|---|---|---|
| Checks | Pixel-level visual diffs | Functional behavior, render errors |
| Where it runs | Hosted, PR-integrated | Local or CI, no hosting needed |
| Baseline | Visual snapshot per story | None — pass/fail per assertion |

Use both: test-runner catches broken behavior, Chromatic catches unintended visual drift.