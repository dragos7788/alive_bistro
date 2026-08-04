---
name: react-apply-design-patterns
description: (cog-toolkit, React) React design patterns, prop design, component architecture, custom hooks, state management, performance, and data fetching — with explicit do's, don'ts, and common mistake fixes. Trigger for any question about React architecture, structuring components, prop design, when to split components, ref usage, controlled vs uncontrolled, memoization, or data fetching strategy. Also use for reviews of existing React code, refactoring advice.
---

# React Design Patterns

Guiding principle: **the smallest unit should own its state, logic, and rendering — then compose upward.** Every decision below follows from that.

---

## 1. Component Architecture

### When to split a component

Split when the component has more than one independent reason to re-render, a subtree **is reused in two or more places**, internal logic obscures the render output, or a section needs its own loading or error boundary.

**Do not** split just to reduce line count. A 100-line component with clear sections and purpose is better than five 30-line components with confusing data flow.

### Composition over configuration

```jsx
// Bad — grows a new prop every time a consumer needs a variation
<Modal title="X" body="..." showClose footerContent={<Btn/>} headerColor="red" />

// Good — slots let consumers own content without changing the API
<Modal>
  <Modal.Header>X</Modal.Header>
  <Modal.Body>...</Modal.Body>
  <Modal.Footer><Btn /></Modal.Footer>
</Modal>
```

### Compound components

Use for UI primitives where siblings share internal state (tabs, accordions, selects, steppers). Manage shared state via a private context — never export it. Expose actions (`setActive`, `toggle`), not raw state setters.

```jsx
const TabsCtx = createContext(null)

function useTabs() {
  const ctx = useContext(TabsCtx)
  if (!ctx) throw new Error('useTabs must be used inside <Tabs>')
  return ctx
}

function Tabs({ defaultValue, children }) {
  const [active, setActive] = useState(defaultValue)
  return <TabsCtx.Provider value={{ active, setActive }}>{children}</TabsCtx.Provider>
}

Tabs.Trigger = function Trigger({ value, children }) {
  const { active, setActive } = useTabs()
  return <button aria-selected={active === value} onClick={() => setActive(value)}>{children}</button>
}
```

---

## 2. Prop Design

### Forward refs and set displayName on reusable primitives

```jsx
// Arrow function — React can't infer the name, DevTools shows ForwardRef
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />)

// Named function — React infers "Input" automatically, no displayName needed
const Input = forwardRef(function Input(props, ref) {
  return <input ref={ref} {...props} />
})
```

Without `displayName`, React DevTools shows `ForwardRef`, unless you name the inner function instead of using an arrow function.
**STOP AND WAIT** — present the options and ask: "Should I proceed adding `displayName` props?"

---

## 3. Custom Hooks

**Do**:
- name hooks `use*`;
- return only what the caller needs;
- return a tuple or stable primitives — never a plain object literal.

**Don't**:
- Do not call hooks conditionally or inside loops;
- Do not build a hook to avoid prop drilling (that is composition's job);
- Do not use a hook to share static config (use a constant).

```jsx
// Bad — new object reference on every call triggers re-render loops in consumers
function useCounter() {
  const [n, setN] = useState(0)
  return { n, inc: () => setN(c => c + 1) }  // new object every render
}

// Good — inc is stable via useCallback
function useCounter() {
  const [n, setN] = useState(0)
  const inc = useCallback(() => setN(c => c + 1), [])
  return [n, inc]
}
```

---

## 4. Refs

Two uses — keep them distinct.

**DOM access**: read a node imperatively (focus, measure, scroll, animations).
```jsx
const inputRef = useRef(null)
// Later: inputRef.current?.focus()
```

**Instance variable**: a mutable value that must not trigger re-render.
```jsx
const prevIdRef = useRef(id)
useEffect(() => { prevIdRef.current = id }, [id])
```

**Do**: use refs for values you read but do not synchronize on.
**Don't**: read `ref.current` as a source of truth inside render — that is state's job.

---

## 5. State Management

Decision ladder — start at the top, stop when solved:

```
local to one component       → useState / useReducer
shared between siblings      → lift to common parent
needed by a distant subtree  → context (stable values) or external store
server / async state         → React Query / SWR / server components
```

### Context

Context is for values that change infrequently across a wide subtree: theme,
locale, auth user, feature flags.

```jsx
// Bad — any keystroke re-renders every context consumer
const FormCtx = createContext({ values, setValues })

// Good — split by update frequency
const AuthCtx  = createContext(null)    // changes on login/logout only
const ThemeCtx = createContext('light') // changes rarely
```

**Do**:
- memoize context values — `useMemo(() => ({ user, logout }), [user])`.
- pair context with `useReducer` for complex state machines.

**Don't**:
- Do not store fast-changing values (form state, mouse position) in context.
- Do not replace a data-fetching library's cache with context.

---

## 7. Data Fetching

Use React Query or SWR over raw `useEffect`. They handle caching, deduplication, background refresh, error/loading states, and race conditions automatically.

```jsx
// Bad — manual, no caching, race condition risk
useEffect(() => { fetchUser(id).then(setUser) }, [id])

// Good
const { data: user, isPending, error } = useQuery({
  queryKey: ['user', id],
  queryFn:  () => fetchUser(id)
})
```

When raw `useEffect` is unavoidable, add a cleanup flag:
```jsx
useEffect(() => {
  let cancelled = false
  fetchUser(id).then(d => { if (!cancelled) setUser(d) })
  return () => { cancelled = true }
}, [id])
```

**Server components** (Next.js App Router / Remix): fetch on the server, no client waterfall, secrets never reach the browser. Push `'use client'` as far down the tree as possible — parent shells stay as server components.

---

## 8. Common Mistakes

| Mistake | Fix |
|---|---|
| Derived state in `useState` | Compute inline or with `useMemo`; never mirror props into state |
| `undefined` initial value on a controlled input | Initialize to `''`; switching modes mid-lifecycle throws and loses DOM state |
| Stale closure in `useEffect` | Add the missing dep; use a `ref` for values you read but don't sync on |
| `key={Math.random()}` | New key every render remounts the element; use stable IDs |
| Context re-renders all consumers on every parent render | Memoize the context value; split large contexts by update frequency |
| Index as key for mutable lists | Use `item.id`; index breaks reconciliation on reorder or insert |
| Unguarded async state update after unmount | Return a cleanup that sets a `cancelled` flag |
| Hook returning a plain object literal | New reference every call; return a tuple or memoize the object |
| `forwardRef` missing `displayName` | DevTools shows `ForwardRef`; set `Component.displayName` explicitly |

---

## Quick Reference

**Split** when a subtree re-renders independently, is reused, or logic hides the render — not to hit a line-count target.
**Props**: use PropTypes shapes for variant-dependent props; forward refs and set `displayName` on reusable primitives.
**Hooks**: one responsibility, `use*` prefix, return a tuple not an object literal, never conditional.
**State ladder**: local → lift → context (stable values only) → external store → server.
**Performance**: profile first; `React.memo` + `useCallback` only when rendering is expensive and props are stable; stable keys, never index for mutable lists.
**Data**: React Query or SWR over raw `useEffect`; server components for zero-client-cost fetching in Next / Remix.
**Refs**: DOM access or mutable instance variable — never as a source of truth in render.

---

## Quick checklist
 
Before considering React code done, sanity-check it against this.
 
- No effect that could be an event handler or a render-time calculation
- Every effect that subscribes/opens something has matching cleanup
- List items keyed by stable IDs, never array index (unless the list is static and never reordered)
- State updates are immutable;
- Components are small and single-purpose; complexity is handled by composition, not prop flags
- Reusable stateful logic is extracted into custom hooks, not duplicated
- Hooks are called unconditionally at the top level (Rules of Hooks)
- The component is accessible: semantic elements, labels, keyboard operability