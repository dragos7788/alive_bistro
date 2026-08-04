---
name: react-handle-data-fetching
description: (cog-toolkit, React) Use this skill whenever the user asks about data fetching, server state, caching, React Query, TanStack Query, SWR, useQuery, useMutation, useSWR, API hooks, or setting up an API/HTTP client layer in a React project — even if they only mention symptoms like "avoid duplicate requests" or "cache API responses".
---

# React API / Data-Fetching Layer

Guidance for setting up a data-fetching layer in React using TanStack Query (React Query) or SWR: provider setup, key strategy, mutations, optimistic updates, infinite queries, and HTTP client wrapper configuration.

## Step 1: Detect the library and version

Before writing any code, check `package.json` (or run `npm ls`) to find what's installed. Do not assume the latest API is available.

| Package name | Version range | Status |
|---|---|---|
| `@tanstack/react-query` | 5.x | Current |
| `@tanstack/react-query` | 4.x | Legacy |
| `react-query` (old package name) | 3.x | Legacy |
| `swr` | 2.x | Current |
| `swr` | 1.x or 0.x | Legacy |

If neither library is installed, ask or infer from project signals:
- Next.js App Router / heavy server-state, mutations, infinite lists → TanStack Query.
- Simple SPA, want a minimal API, don't need built-in mutation primitives beyond `mutate` → SWR is fine.

If the project is on a legacy version, use the "Legacy" subsection under each topic below, and see `references/tanstack-query.md` or `references/swr.md` for full worked examples on that version. Do not mix current-version syntax into a legacy codebase.

## Step 2: Framework considerations

The patterns in this skill apply directly to a plain Vite/CRA-style SPA. Next.js and Remix each have a framework-native data layer that interacts with these libraries — check which framework is in use before wiring up providers.

### Vite / plain SPA

No caveats. All patterns in this skill apply as-is.

### Next.js — App Router

- Provider setup (`QueryClientProvider` / `SWRConfig`) must be declared in a Client Component (`"use client"`). Server Components cannot call `useQuery`, `useMutation`, or `useSWR`.
- For SSR/prefetching, use TanStack Query's `dehydrate` + `HydrationBoundary` to pass server-fetched data into the client cache, instead of refetching on mount. SWR's equivalent is passing server data in as `fallbackData`.
- Next's built-in `fetch` cache (Data Cache, `revalidate`, `cache` option) is a separate caching layer from TanStack Query/SWR's client-side cache. Running both for the same resource causes double-caching and stale-data confusion — pick one per resource: Next's fetch cache for data needed at render time, TanStack Query/SWR for client-driven refetching, polling, and mutations.

### Next.js — Pages Router

- No Server/Client Component split; hooks work in any component.
- SSR data flows through `getServerSideProps` / `getStaticProps`. Hand that data to TanStack Query via `initialData` (or hydration) or to SWR via `fallbackData`, so the client doesn't immediately refetch what the server already provided.

### Remix

- Loaders and actions are the framework-native fetch/mutate mechanism, running server-side and integrated with the router's own revalidation. For standard CRUD tied to a route, prefer loaders/actions over this skill's hooks.
- Reach for TanStack Query/SWR only for what loaders don't cover: client-driven polling, cross-navigation caching beyond Remix's revalidation, or optimistic UI spanning more than one form submission.
- Avoid fetching the same resource through both a loader and a query hook — pick one source of truth per resource, or the client cache and Remix's post-action revalidation can disagree about what's current.

## Step 3: Setup

### TanStack Query v5

TypeScript / JavaScript (identical API, TS adds generics):

```tsx
// queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // data considered fresh for 30s, no refetch on mount/focus during that time
      gcTime: 5 * 60_000,     // unused cache entries garbage-collected after 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

// App.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

Install devtools separately: `npm i @tanstack/react-query-devtools`.

### SWR v2

```tsx
// swrConfig.ts
export const swrConfig = {
  revalidateOnFocus: true,
  shouldRetryOnError: true,
  dedupingInterval: 2000,
}

// App.tsx
import { SWRConfig } from 'swr'
import { fetcher } from './fetcher'

export function App() {
  return (
    <SWRConfig value={{ ...swrConfig, fetcher }}>
      {/* app */}
    </SWRConfig>
  )
}
```

SWR has no official devtools package; browser extension options exist but are not required.

### Legacy setup notes

- TanStack Query v4: same provider shape, but the package is `react-query` (v3) or early `@tanstack/react-query` (v4). `cacheTime` is the v4/v3 name for what v5 calls `gcTime`.
- SWR v1: `SWRConfig` value merging behaves identically, but `useSWRMutation` and `swr/infinite` as separate entry points did not exist pre-1.x in the same form — check `references/swr.md` Legacy section before adding mutation hooks to an old codebase.

## Step 4: Query key strategy

### TanStack Query

Keys are arrays. Structure them hierarchically: `[domain, type, ...params]`.

```ts
// queryKeys.ts
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: string) => [...todoKeys.details(), id] as const,
}
```

```tsx
useQuery({ queryKey: todoKeys.list({ status: 'done' }), queryFn: () => fetchTodos({ status: 'done' }) })
```

Invalidation uses partial key matching — invalidating `todoKeys.all` invalidates every list and detail query under it:

```ts
queryClient.invalidateQueries({ queryKey: todoKeys.all })
```

Plain JS version is identical; drop the `as const` and type annotations.

### SWR

Keys are just cache identifiers — usually a string (the URL) or an array `[url, params]`. There is no factory convention needed the same way, since SWR has no built-in hierarchical invalidation. Keep keys consistent across the app so calls dedupe correctly:

```ts
const key = (id: string) => `/api/todos/${id}`
useSWR(key(id), fetcher)
```

To invalidate several related keys at once, use `mutate` with a filter function via `useSWRConfig`:

```tsx
import { useSWRConfig } from 'swr'
const { mutate } = useSWRConfig()
mutate((key) => typeof key === 'string' && key.startsWith('/api/todos'))
```

## Step 5: Mutations

### TanStack Query — useMutation

```tsx
function useCreateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newTodo: NewTodo) => api.post('/todos', newTodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create todo', error)
    },
  })
}

// usage
const { mutate, isPending } = useCreateTodo()
mutate({ title: 'Write skill' })
```

JS: remove the `NewTodo` type annotation, rest is identical.

**Invalidate vs. direct cache update**: invalidate (`invalidateQueries`) when you just need fresh data and a refetch is cheap. Use `setQueryData` to write the response directly into the cache when you want to avoid a network round-trip (e.g. the mutation response already contains the full updated object).

```tsx
onSuccess: (updatedTodo) => {
  queryClient.setQueryData(todoKeys.detail(updatedTodo.id), updatedTodo)
}
```

### SWR — useSWRMutation

```tsx
import useSWRMutation from 'swr/mutation'

async function createTodo(url: string, { arg }: { arg: NewTodo }) {
  return api.post(url, arg)
}

function useCreateTodo() {
  return useSWRMutation('/api/todos', createTodo, {
    onSuccess: () => {
      // trigger revalidation of related keys
    },
  })
}

// usage
const { trigger, isMutating } = useCreateTodo()
trigger({ title: 'Write skill' })
```

JS: drop the `{ arg }: { arg: NewTodo }` type, keep the destructure `{ arg }`.

## Step 6: Optimistic updates

General pattern, both libraries: snapshot the current cache value, apply the optimistic change immediately, roll back on error, reconcile on settle.

### TanStack Query

```tsx
useMutation({
  mutationFn: updateTodo,
  onMutate: async (updated) => {
    await queryClient.cancelQueries({ queryKey: todoKeys.detail(updated.id) })
    const previous = queryClient.getQueryData(todoKeys.detail(updated.id))
    queryClient.setQueryData(todoKeys.detail(updated.id), updated)
    return { previous }
  },
  onError: (_err, updated, context) => {
    if (context?.previous) {
      queryClient.setQueryData(todoKeys.detail(updated.id), context.previous)
    }
  },
  onSettled: (updated) => {
    queryClient.invalidateQueries({ queryKey: todoKeys.detail(updated.id) })
  },
})
```

JS: identical, drop typing on the `context` parameter.

### SWR

```tsx
import { useSWRConfig } from 'swr'

function useUpdateTodo(id: string) {
  const { mutate } = useSWRConfig()
  const key = `/api/todos/${id}`

  return async (updated: Todo) => {
    await mutate(
      key,
      api.put(key, updated),
      {
        optimisticData: updated,
        rollbackOnError: true,
        populateCache: true,
        revalidate: true,
      }
    )
  }
}
```

JS: drop `updated: Todo` typing.

Sharp edges (both libraries): rapid successive mutations against the same key can race — the rollback from an earlier failed mutation can overwrite a later optimistic update. Keep the optimistic key as specific as possible (detail key, not a broad list key) to limit blast radius.

## Step 7: Infinite queries / pagination

### TanStack Query — useInfiniteQuery (cursor-based)

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: todoKeys.lists(),
  queryFn: ({ pageParam }) => fetchTodos({ cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
})

const allTodos = data?.pages.flatMap((page) => page.items) ?? []
```

JS: drop `as string | undefined`, keep `initialPageParam: undefined`.

Offset-based pagination follows the same shape — `getNextPageParam` returns the next offset/page number instead of a cursor, and `pageParam` starts at `0` or `1`.

### SWR — useSWRInfinite (cursor-based)

```tsx
import useSWRInfinite from 'swr/infinite'

const getKey = (pageIndex: number, previousPageData: TodoPage | null) => {
  if (previousPageData && !previousPageData.nextCursor) return null // reached the end
  return `/api/todos?cursor=${previousPageData?.nextCursor ?? ''}`
}

const { data, size, setSize } = useSWRInfinite(getKey, fetcher)
const allTodos = data?.flatMap((page) => page.items) ?? []

// load more
setSize(size + 1)
```

JS: drop `(pageIndex: number, previousPageData: TodoPage | null)` typing on `getKey`.

## Step 8: HTTP client wrapper

Both libraries are transport-agnostic — the query/mutation function is just any function returning a promise. Centralize the actual HTTP call in one wrapper so auth headers, base URL, and error shape are consistent everywhere.

### Axios wrapper

```ts
// httpClient.ts
import axios from 'axios'

export const httpClient = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10_000,
})

httpClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (response) => response.data, // unwrap so callers get data directly
  (error) => {
    const normalized = {
      message: error.response?.data?.message ?? error.message,
      status: error.response?.status ?? 0,
    }
    return Promise.reject(normalized)
  }
)
```

JS: identical, no type import needed.

### Fetch wrapper

```ts
// httpClient.ts
async function httpClient(path: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const response = await fetch(`${process.env.API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw { message: body.message ?? response.statusText, status: response.status }
  }

  return response.json()
}
```

JS: drop the `RequestInit` type annotation on `options`, keep the default `{}`.

How each library sees wrapper errors:
- TanStack Query: whatever the wrapper throws/rejects with becomes `mutation.error` / `query.error` as-is. Normalize the shape in the wrapper (as above) so every `error.message` / `error.status` access is consistent regardless of which endpoint failed.
- SWR: same — the fetcher's thrown value becomes the hook's `error`. SWR additionally supports attaching extra info via `error.info` if you want to keep the raw response body alongside the normalized message.

## Legacy quick-reference

### TanStack Query: v4/v3 → v5

| Legacy (v4/v3) | Current (v5) |
|---|---|
| `cacheTime` | `gcTime` |
| `isLoading` (during any fetch) | `isPending` (initial fetch only); `isFetching` covers all fetches |
| `keepPreviousData: true` | `placeholderData: keepPreviousData` (imported helper) |
| `useQuery(key, fn, options)` (v3 positional args) | `useQuery({ queryKey, queryFn, ...options })` (single object) |
| `onSuccess`/`onError` on `useQuery` | Removed on queries in v5; handle side effects with `useEffect` on the result, or keep them on `useMutation` where they still exist |

### SWR: v1 → v2

| Legacy (v1) | Current (v2) |
|---|---|
| Manual `mutate(key, fetcher())` for writes | `useSWRMutation` from `swr/mutation` (dedicated mutation hook) |
| `useSWRInfinite` imported from `swr` | Moved to separate entry point `swr/infinite` |
| `isValidating` used to infer loading state | `isLoading` added, distinct from `isValidating` (background revalidation) |

For full worked examples on legacy versions, see the "Legacy" section at the bottom of `references/tanstack-query.md` or `references/swr.md`.

## Further reading

- `references/tanstack-query.md` — extended examples: full CRUD hook set, parallel/dependent queries, prefetching, cancellation, complete legacy (v4/v3) examples.
- `references/swr.md` — extended examples: full CRUD hook set, conditional fetching, polling, suspense mode, complete legacy (v1) examples.

Read the relevant reference file only when the task needs an example beyond what's covered above (e.g. dependent queries, prefetching, suspense, or working directly in a legacy codebase).