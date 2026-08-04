---
applyTo: '**/*.{jsx,tsx}'
description: "React and TypeScript/JSX/TSX development standards"
---

# React Development Best Practices

These guidelines extend the general standards in `copilot-instructions.md`.
If a React-specific rule conflicts with a general rule, prefer the React rule.

## React Mental Model
Follow these core principles on every React task. If a piece of code violates one of these, it's usually the root cause of rendering or performance issues:

1. **Treat state as immutable** — Never mutate state or props in place. Produce new objects/arrays so React can detect changes and renders stay predictable.
2. **Data flows down, events flow up** — Avoid prop drilling. Colocate state as close as possible to where it is used. When a prop is threaded through multiple layers, lift state, use composition, or introduce a context.
3. **Derive, don't synchronize** — If a value can be computed, compute it during rendering. Never copy props or other state into state and use effects to sync them.
4. **Effects reconcile, event handlers decide** — Use `useEffect` only to synchronize with external systems (network, DOM, subscriptions). Do not use it for user event handling or component logic.
5. **Composition over configuration** — Build UI out of small modular elements, passing JSX as props or children rather than introducing large sets of boolean control flags.

## Component Organization & Naming
- **Single Component per File** — Export components with named exports. Use default exports exclusively for dynamic page routes.
- **Naming Conventions**:
  - Components: `PascalCase` matching the file name (`UserCard.tsx`).
  - Hooks: Prefix with `use` (`useAuth.ts`).
  - Event Handlers: Props should be `onSomething`, implementations should be `handleSomething`.
  - Booleans: Prefix with `is`/`has`/`should` (`isOpen`, `hasError`).
- **Short Complexity** — If a component grows past ~150 lines, split it into smaller sub-components or extract hooks.

## State Management Rules
- Keep server state (fetched data) separate from client/UI state.
- **Decision Table**:
  | Scale | Solution |
  |---|---|
  | Local UI state | `useState` / `useReducer` |
  | Shared across a subtree | `useContext` + custom hook |
  | Complex async & caching | TanStack Query (React Query) / SWR |
  | Global client state | Zustand (simple) or Redux Toolkit (complex) |
- Use `useReducer` when state transitions are complex or multiple state fields depend on each other.

## Hooks Standards
- **useState** — Use functional updates (`setCount(c => c + 1)`) when the next state depends on the previous state.
- **useEffect** — Avoid premature optimization. Keep each effect focused on a single responsibility. Always return cleanups for timers, event listeners, or subscriptions.
- **useCallback / useMemo** — Only apply after profiling has identified real performance issues, or when passing stable references down to memoized child components.
- **useRef** — Use for storing DOM references or mutable values that shouldn't trigger re-renders.

## Concurrent Features (React 18+)
- **useTransition** — Mark non-urgent updates as interruptible when high-frequency state changes trigger heavy calculations or list updates (e.g., search filtering). Keep controlled inputs urgent and instant.
- **useDeferredValue** — Defer rendering of values that come from props or context that you don't control. Combine with `React.memo` to skip unnecessary intermediate renders.

## Performance Optimization
- Wrap expensive subtree components in `React.memo` only if parent re-renders are frequent and child props are stable.
- Avoid inline functions, objects, and array literals in JSX unless the performance impact is negligible.
- Always use **stable, unique IDs** for `key` props in lists. Do not use array index keys for reorderable or filterable lists.
- Leverage `React.lazy` and `Suspense` of chunk bundles at organic boundaries (routes, heavy modal overlays).
- Avoid barrel files that inhibit tree-shaking; import directly from source files where appropriate.

## Error Boundaries
- Implement class-based Error Boundaries (or use `react-error-boundary`) wrapped around critical route nodes, forms, or async subtrees to prevent a single component crash from breaking the whole application.
- Always provide an interactive reset trigger to allow recovering from the failure state.

## Related Instructions
- **General practices**: See root `copilot-instructions.md`
