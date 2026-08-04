---
name: react-apply-hooks-patterns
description: (cog-toolkit, React) Common React hooks and best practices. Use this skill when writing, reviewing, refactoring, debugging, or architecting React components using hooks. It is framework-agnostic (the principles hold whether the app runs on Vite, Next.js, Remix, or plain React)
---

# React Hooks Patterns

## The Rules of Hooks

Two rules, both non-negotiable because React tracks hooks by call order, not by name:

1. **Call hooks only at the top level.** Never inside conditions, loops, or nested functions. If a hook sometimes runs and sometimes doesn't, the call order shifts between renders and React's internal state gets misaligned. To make a hook conditional, put the condition *inside* the hook, or split the component.
2. **Call hooks only from React functions** — components or other hooks, not regular JavaScript functions.

The `eslint-plugin-react-hooks` lint rules enforce both. Keep them on and trust them.

## useState

For local, render-driving values.

- **Lazy initialization**: if the initial value is expensive to compute, pass a function so it runs once instead of every render: `useState(() => expensiveInit())`, not `useState(expensiveInit())`.
- **Functional updates** when the next value depends on the previous: `setItems(prev => [...prev, item])`. This avoids stale-closure bugs and works correctly under batching.
- **Don't store derived values.** If it can be computed from other state/props, compute it in render.
- **Reset state with `key`, not effects.** To reset a component's state when some identity changes (e.g., switching to a different user), give the component a `key` tied to that identity. When the key changes, React unmounts the old instance and mounts a fresh one with clean state — no effect required. (Note this is a full remount, so it's best for lightweight components; for heavy children, reset the specific values instead.)

## useEffect

The most-misused hook. Internalize this: **an effect synchronizes your component with an external system.** If no external system is involved, you almost certainly don't need it.

**Legitimate uses** — subscribing to a store or event source, connecting to a server/socket, manually manipulating the DOM (focus, measurements), starting/stopping timers, integrating a non-React widget.

**Not effects** — these are the common mistakes:

- *Transforming data for rendering.* Do it during render. An effect that computes derived state forces an extra render pass and can loop.
- *Responding to a user event.* Put the logic in the event handler. The cause was a click, not a render.
- *Resetting/adjusting state when a prop changes.* Use a `key`, or compute the value during render.
- *Notifying a parent of a change.* Call the parent's callback from the same handler that caused the change, not from an effect watching the result.

**When you do write one:**

- **Always clean up** anything you start. Return a cleanup function that unsubscribes, closes, clears the timer, aborts the request. React runs cleanup before re-running the effect and on unmount; skipping it leaks and causes double-fires.
- **Get the dependency array right.** List every reactive value the effect reads. Don't lie to the linter to silence `exhaustive-deps` — a missing dependency means the effect runs with stale values. If a dependency changes too often, fix the *source* (memoize it, move it, or restructure) rather than omitting it.
- Expect effects to run twice in development under Strict Mode. That's intentional — it surfaces missing cleanup. Correct effects are idempotent across that.


Be careful of **memory leaks from listeners, timers, and subscriptions not cleaned up.**

```js
// Bad — all three accumulate indefinitely
useEffect(() => {
  window.addEventListener('resize', handler)
  const id = setInterval(poll, 5000)
  const sub = store.subscribe(update)
})

// Good — return a cleanup function
useEffect(() => {
  window.addEventListener('resize', handler)
  const id = setInterval(poll, 5000)
  const sub = store.subscribe(update)
  return () => {
    window.removeEventListener('resize', handler)
    clearInterval(id)
    sub.unsubscribe()
  }
}, [])
```

## useRef

A ref is a mutable box whose `.current` persists across renders **without** triggering a re-render when it changes.

- Use it for **non-rendering mutable values**: timer IDs, previous-value tracking, instance-like scratch state that the UI doesn't display.
- Use it to **reference DOM nodes** for imperative actions React doesn't model declaratively — focusing an input, measuring size, integrating a third-party DOM library.
- **Don't read or write `ref.current` during render** (except to lazily initialize it). Render must stay pure; ref mutations are side effects. Read/write refs in handlers and effects.
- If changing a value should update the UI, it's **state, not a ref.**

## useContext

For passing data to a deep subtree without drilling props — themes, current user, locale, a design-system config.

- Context solves *prop drilling*, not *state management*. It's a transport mechanism; the state still lives in some provider's `useState`/`useReducer`.
- **Every consumer re-renders when the context value changes.** Two consequences: (1) memoize the provider's `value` so it doesn't get a new reference every render and rerender all consumers needlessly; (2) split contexts by concern (a stable-config context separate from a frequently-changing one) so unrelated consumers don't rerender. See more in react-improve-performance skill.
- Don't reach for context for everything. For state shared by a couple of nearby components, lifting state is simpler. For large, complex, frequently-updated global state, a dedicated state library is often a better fit than hand-rolled context.

## useReducer

For state with **multiple sub-values that change together** or **complex transition logic**.

- Prefer it over several entangled `useState` calls when updates touch many fields at once or follow rules (e.g., a wizard, a form with interdependent fields, anything resembling a state machine).
- The reducer is a pure function `(state, action) => newState` — easy to test in isolation and to read as the single source of truth for how state can change.
- Pair with context to share both `state` and `dispatch` down a subtree without drilling, when warranted.

## Custom hooks

The primary tool for **reusing stateful logic**. When two components share the same `useState`/`useEffect` choreography, extract it.

- A custom hook is just a function starting with `use` that calls other hooks. It shares *logic*, not *state* — each component that calls it gets its own independent state.
- Name it for the concept it manages (`useDebouncedValue`, `useOnlineStatus`, `useFormField`), not for the hooks it happens to use internally.
- Keep each hook focused on one concern so it composes. A giant `useEverything` is as bad as a giant component.
- Custom hooks are how you keep components declarative: the component reads like *what* it shows, the hook handles *how* the data is obtained and kept current.

## useMemo and useCallback

These cache a value (`useMemo`) or a function identity (`useCallback`) across renders. They are **performance tools**, not correctness tools — code must be correct without them.

- Reach for them in three situations: an expensive computation you don't want to repeat every render; a value/function passed to a `React.memo` child where a fresh reference each render would defeat the memoization; or a value/function used in another hook's dependency array where referential stability matters.
- Otherwise, don't pre-emptively wrap everything — the bookkeeping has its own cost and clutters the code.
- **Major caveat:** the React Compiler (when enabled) automatically memoizes components and values, making most manual `useMemo`/`useCallback` unnecessary. Before hand-memoizing, check whether the project uses it. See react-improve-performance skill for more details.

## React 19 hooks
 
### useActionState — form actions with state
 
Replaces the useState + async handler pattern for form submissions.
 
```jsx
import { useActionState } from 'react';
 
async function submitComment(_prevState, formData) {
  const text = formData.get('text');
  const result = await postComment(text);
  return result.ok ? { status: 'success' } : { status: 'error', message: result.error };
}
 
function CommentForm() {
  const [state, dispatch, isPending] = useActionState(submitComment, { status: 'idle' });
 
  return (
    <form action={dispatch}>
      <textarea name="text" />
      <button disabled={isPending}>{isPending ? 'Posting…' : 'Post'}</button>
      {state.status === 'error' && <p role="alert">{state.message}</p>}
    </form>
  );
}
```
 
### useOptimistic — instant optimistic updates
 
```jsx
function CommentList({ comments }) {
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (current, newComment) => [...current, { ...newComment, sending: true }]
  );
 
  async function handleSubmit(text) {
    addOptimistic({ id: crypto.randomUUID(), text });  // instant UI update
    await submitComment(text);                          // real request in background
  }
 
  return <ul>{optimisticComments.map(c => <CommentItem key={c.id} comment={c} />)}</ul>;
}
```
 
### use() — read context or promises in render
 
```jsx
// Read context without a hook (works inside conditionals — rare valid case)
const theme = use(ThemeContext);
 
// Unwrap a promise — must be wrapped in Suspense
function UserProfile({ userPromise }) {
  const user = use(userPromise);   // suspends until resolved
  return <div>{user.name}</div>;
}
```
