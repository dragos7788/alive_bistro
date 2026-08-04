---
name: react-migrate-legacy
description: (cog-toolkit, React) Strategies and best practices for working with legacy codebases - class components, lifecycle methods, HOCs, render props - especially when migrating from older versions of React. It is framework-agnostic (the principles hold whether the app runs on Vite, Next.js, Remix, or plain React).
---

## Migrating Legacy Codebases

Modernizing an older React codebase is almost always done **incrementally**, NOT everything at once. This file covers both the *how* (pattern-by-pattern conversions) and the *how-to-do-it-safely* (sequencing).

## Strategy: migrate incrementally

Class and function components interoperate freely — they can render each other and share props — so you do **not** need to convert everything at once.

- **Leaf-first.** Start with small, self-contained leaf components (no children depend on them). They're low-risk, build team familiarity, and don't require touching shared state plumbing.
- **Convert on contact.** Adopt a rule that any component you touch for a feature or bug gets modernized as part of that work. The codebase improves continuously without a dedicated "migration project" that competes with shipping.
- **Don't rewrite for its own sake.** A stable, working class component that nobody touches **is not** a priority. Migrate where it unlocks new patterns, fixes bugs, or removes friction.
- **One concern at a time.** Convert the component first, *then* (separately) refactor its logic. Mixing a mechanical conversion with a behavioral refactor in one change makes regressions hard to localize.
- **Context API over legacy Redux** for new shared state; migrate Redux incrementally using Redux Toolkit slices
- **Replace HOCs and render props** with custom hooks where they wrap stateful logic
- **Avoid mixing paradigms** in the same component — finish the conversion before merging
- Add `eslint-plugin-react-hooks` early; it will surface unsafe patterns during migration

## Class component → function + hooks

The core mapping:

- `this.state` and `this.setState` → one or more `useState` (or `useReducer` for entangled state).
- `this.props` → the destructured function parameters.
- instance methods → functions defined inside the component (or `useCallback` only where referential stability is actually needed).
- instance fields that aren't rendered (caches, timer IDs, the previous value of something) → `useRef`.
- `render()`'s return → the function body's return.

A class storing several related state fields and updating them together is often a better fit for `useReducer` than a pile of `useState` calls.

## Lifecycle methods → hooks

Resist a literal one-to-one translation — that's how unnecessary effects get introduced. Translate by *intent*:

- `componentDidMount` for **subscriptions/external sync** → `useEffect(() => { ... return cleanup }, [])`. But if the mount logic was really just initializing derived data, do it in render or with `useState` init instead — not every `componentDidMount` should become an effect.
- `componentDidUpdate` reacting to a prop/state change → usually **not** an effect. If it was deriving state, derive during render; if it was responding to an event, move it to the handler. Only genuine external synchronization belongs in an effect (with the changed values in the dependency array).
- `componentWillUnmount` → the **cleanup function** returned from the relevant `useEffect`.
- `componentDidMount` + `componentDidUpdate` doing the same sync → a single `useEffect` with the right dependencies, which is exactly the pattern hooks were designed to unify.

## HOCs and render props → custom hooks

Higher-order components (`withAuth(Component)`) and render props were the pre-hooks ways to share stateful logic. Custom hooks can replace both.

- `withAuth(Component)` → a `useAuth()` hook the component calls directly.
- `<DataLoader render={...}>` → a `useData()` hook returning the same values.

The logic inside the HOC/render-prop usually transitions into the hook with little change; what disappears is the wrapping and prop-injection. Convert the consumer to call the hook, then check if the wrapper can be deleted.

## Legacy context → modern context

Pre-16.3 legacy context (`getChildContext`, `contextTypes`) is deprecated. Move to `createContext` + a provider, with consumers reading via `useContext`. Apply the modern context cautions while you're at it: memoize the provider value and split contexts by update frequency so the migration doesn't introduce a re-render problem.

## Clean up effects

Look for state that's just mirroring props/other state, and effects that should be event handlers or render-time derivations. Older code is dense with these because class lifecycles encouraged them. Removing them makes the converted component simpler and faster, not just "modern." The `eslint-plugin-react-you-might-not-need-an-effect` rules can flag candidates mechanically.

## PropTypes and typing

Keep `PropTypes` for runtime prop validation where it's already providing value; don't strip it out as part of a hooks migration unless asked.

## Detecting and updating deprecated dependencies

- **Detect**: run `npm outdated` (or `pnpm outdated` / `yarn outdated`) to list packages with newer major/minor/patch versions, and `npx depcheck` to catch unused dependencies and undeclared-but-imported ones — run `depcheck` per app/package in a monorepo, since root-level scans often miss workspace-scoped imports.
- **Identify true deprecations vs. staleness**: an explicit `npm deprecate` warning during install (maintainer-flagged, package abandoned or replaced) is more urgent than a plain version lag — prioritize migrating off deprecated packages even if they still pass `npm outdated` checks with no newer version listed.

Approval Checkpoint *(mandatory)*
**STOP AND WAIT.** Before major dependency bumps, build a plan with the previous findings and confirm with the user before updating. Ask:
> "Does this plan match your project requirements? Shall I proceed?"

- **Update safely**: use `npx npm-check-updates` (`ncu -u`) to bump `package.json` ranges in bulk, then reinstall and run the full test suite before committing — for Next.js and Remix, also re-run a production build (`next build` / `remix vite:build`) since major dependency bumps (React, router, bundler plugins) can break SSR or route conventions that unit tests won't catch; for Vite, re-check `vite.config` plugin compatibility, since Vite's plugin API changes faster across major versions than webpack's.

## Safeguards

- **Lean on tests.** Behavior-focused tests are the safety net: if they test what the user sees rather than internals, a class→function conversion shouldn't change them. Where coverage is thin on a component you're about to convert, add a characterization test *first*.
- **Keep changes small and reviewable.** One component (or one tight cluster) per change, conversion separated from refactor. Small diffs make regressions obvious and reverts easy.
- **Verify behavior, not just compilation.** It compiling and rendering isn't proof it's equivalent — check the interactions, edge cases, and cleanup (a missing effect cleanup is a classic migration leak).
- **Migrate the riskiest shared state plumbing last,** after the team is fluent and the leaf components are done.
