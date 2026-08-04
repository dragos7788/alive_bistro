# TanStack Query (React Query): extended examples

## Current (v5)

### Worked SSR example: Next.js App Router (dehydrate / HydrationBoundary)

Prefetch on the server inside a Server Component, dehydrate the cache, and hand it to a Client Component via `HydrationBoundary`.

```tsx
// TypeScript — app/todos/page.tsx (Server Component, no "use client")
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { TodoList } from "./todo-list"
import { todoKeys, fetchTodos } from "./queries"

export default async function TodosPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: todoKeys.all,
    queryFn: fetchTodos,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TodoList />
    </HydrationBoundary>
  )
}
```

```tsx
// TypeScript — app/todos/todo-list.tsx (Client Component)
"use client"
import { useQuery } from "@tanstack/react-query"
import { todoKeys, fetchTodos } from "./queries"

export function TodoList() {
  // Reuses the prefetched, dehydrated data — no extra request on mount.
  const { data } = useQuery({ queryKey: todoKeys.all, queryFn: fetchTodos })
  return <ul>{data?.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}
```

```jsx
// JavaScript: drop the `Todo[]`/return-type annotations on `fetchTodos` and the query result — the prefetch/dehydrate/HydrationBoundary structure is identical.
```

The `QueryClient` must be created fresh per request on the server (as above, inline in the page component or via a per-request factory) — never reuse a module-level singleton across requests, or one user's cache can leak into another's response.

### Worked SSR example: Next.js Pages Router (dehydrate + _app HydrationBoundary)

```tsx
// TypeScript — pages/todos.tsx
import { dehydrate, QueryClient } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { todoKeys, fetchTodos } from "../lib/queries"

export const getServerSideProps: GetServerSideProps = async () => {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ queryKey: todoKeys.all, queryFn: fetchTodos })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}

export default function TodosPage() {
  // useQuery here picks up the hydrated cache from _app.tsx.
  const { data } = useQuery({ queryKey: todoKeys.all, queryFn: fetchTodos })
  return <ul>{data?.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}
```

```tsx
// TypeScript — pages/_app.tsx
import { HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AppProps } from "next/app"
import { useState } from "react"

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={pageProps.dehydratedState}>
        <Component {...pageProps} />
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
```

```jsx
// JavaScript: drop `GetServerSideProps` and `AppProps` type imports/annotations — the rest is unchanged.
```

### Suspense hooks

```tsx
// TypeScript
import { useSuspenseQuery } from "@tanstack/react-query"

function Todos() {
  // `data` is never undefined at the type level — no isLoading check needed.
  const { data } = useSuspenseQuery({ queryKey: todoKeys.all, queryFn: fetchTodos })
  return <ul>{data.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}

// Wrap with <Suspense fallback={...}><Todos /></Suspense> in the parent.
```

```jsx
// JavaScript: identical — the only thing v5's Suspense hooks add over JS is a type-level guarantee, so there's no code difference at all.
```

### Prefetching multiple infinite-query pages

```tsx
await queryClient.prefetchInfiniteQuery({
  queryKey: todoKeys.all,
  queryFn: ({ pageParam }) => fetchTodos({ cursor: pageParam }),
  initialPageParam: 0,
  pages: 3, // prefetch the first 3 pages instead of just the first
})
```

```js
// JavaScript: drop the `pageParam` destructure's implicit type — no other change.
```

### Limiting stored infinite-query pages

```ts
useInfiniteQuery({
  queryKey: todoKeys.all,
  queryFn: fetchPage,
  initialPageParam: 0,
  getNextPageParam: (last) => last.nextCursor,
  getPreviousPageParam: (first) => first.previousCursor, // required for bi-directional maxPages
  maxPages: 5,
})
```

```js
// JavaScript: identical.
```

### useMutationState — shared mutation status across components

```tsx
import { useMutationState } from "@tanstack/react-query"

function PendingTodoCount() {
  const pendingMutations = useMutationState({
    filters: { mutationKey: ["addTodo"], status: "pending" },
  })
  return <span>{pendingMutations.length} saving...</span>
}
```

```js
// JavaScript: identical.
```

---

## Legacy (v4 and earlier)

### Old hook call signature (pre-v5 overloads)

Before v5 removed overloads, `useQuery` could be called with positional arguments instead of a single options object:

```ts
// v4 and earlier — positional arguments still worked
useQuery(["todos"], fetchTodos, { staleTime: 5000 })

// v5 — object form is the only supported form
useQuery({ queryKey: ["todos"], queryFn: fetchTodos, staleTime: 5000 })
```

If the installed version is v4 or earlier, either form may appear in the existing codebase — match the codebase's existing style rather than introducing the v5-only object form inconsistently, unless asked to migrate.

### Manual optimistic updates (pre-v5 pattern, still valid in v4)

v5's simplified `variables`-based approach doesn't exist pre-v5 — use the full manual cache-patch pattern:

```ts
// v4
const queryClient = useQueryClient()

useMutation(addTodoRequest, {
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries(["todos"])
    const previous = queryClient.getQueryData(["todos"])
    queryClient.setQueryData(["todos"], (old) => [...(old ?? []), newTodo])
    return { previous }
  },
  onError: (_err, _newTodo, context) => {
    queryClient.setQueryData(["todos"], context.previous)
  },
  onSettled: () => queryClient.invalidateQueries(["todos"]),
})
```

```js
// JavaScript: identical to the TS version above — v4's mutation config wasn't meaningfully typed differently.
```

### Hydrate component (pre-HydrationBoundary rename)

Before `HydrationBoundary`, the same role was filled by `Hydrate`:

```tsx
// v4
import { Hydrate, QueryClientProvider } from "@tanstack/react-query"

<QueryClientProvider client={queryClient}>
  <Hydrate state={pageProps.dehydratedState}>
    <Component {...pageProps} />
  </Hydrate>
</QueryClientProvider>
```

Functionally equivalent to `HydrationBoundary` in v5 — only the import name and component name changed.

### cacheTime vs. gcTime

```ts
// v4
new QueryClient({ defaultOptions: { queries: { cacheTime: 300000 } } })

// v5 — renamed, same meaning (garbage-collect unused cache after this many ms)
new QueryClient({ defaultOptions: { queries: { gcTime: 300000 } } })
```

If the installed version is v4, use `cacheTime` — `gcTime` doesn't exist yet and will throw a type error (TS) or silently do nothing (JS).