# Writing Stories

## CSF3 template

Always use this structure for new story files:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Category/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    // override auto-inferred controls here if needed
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { /* default props */ },
};
```

## Args and controls

- Define props via `args`, not inline JSX — this keeps the Controls panel interactive.
- Reuse args across stories with spread: `args: { ...Default.args, isLoading: true }`.
- Use `argTypes` to override an inferred control type (e.g. force a `select` for a string union prop).

**Example 1:**
Input: Button component with `variant: 'primary' | 'secondary' | 'danger'`
Output:
```tsx
argTypes: {
  variant: { control: 'select', options: ['primary', 'secondary', 'danger'] },
}
```

## Decorators

Use decorators for context wrapping shared across all or most stories of a component:

```tsx
const meta: Meta<typeof ComponentName> = {
  component: ComponentName,
  decorators: [(Story) => <ThemeProvider theme={defaultTheme}><Story /></ThemeProvider>],
};
```

Apply per-story decorators only when a specific story needs different context (e.g. a dark-theme variant).

## Covering states

For each component, consider stories for:
- Default / happy path
- Empty state (no data)
- Loading state
- Error state
- Disabled / read-only
- Long content / overflow (for layout-sensitive components)

Not every component needs all of these — match story count to actual behavioral branches in the component.

## CSF vs MDX

- Use CSF3 (`.stories.tsx`) to define the stories themselves.
- Use MDX (`.mdx`) only for narrative documentation pages (intros, usage guidelines) that reference existing CSF stories via `<Story of={...} />` — don't define new stories inside MDX files.