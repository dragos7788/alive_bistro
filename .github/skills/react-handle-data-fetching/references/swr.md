# SWR: extended examples

## Current (2.x)

### Worked SSR example: Next.js Pages Router (fallbackData)

Fetch server-side, then hand the result to `useSWR` as `fallbackData` so the client renders immediately with no loading flash and revalidates in the background.

```tsx
// TypeScript — pages/todos.tsx
import useSWR from "swr"
import type { GetServerSideProps, InferGetServerSidePropsType } from "next"
import { fetchTodos, type Todo } from "../lib/todos"

export const getServerSideProps: GetServerSideProps<{ todos: Todo[] }> = async () => {
  const todos = await fetchTodos()
  return { props: { todos } }
}

export default function TodosPage({
  todos,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { data } = useSWR("/api/todos", fetchTodos, { fallbackData: todos })
  return <ul>{data.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}
```

```jsx
// JavaScript — pages/todos.jsx
import useSWR from "swr"
import { fetchTodos } from "../lib/todos"

export async function getServerSideProps() {
  const todos = await fetchTodos()
  return { props: { todos } }
}

export default function TodosPage({ todos }) {
  const { data } = useSWR("/api/todos", fetchTodos, { fallbackData: todos })
  return <ul>{data.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}
```

### Worked SSR example: page-wide fallback via SWRConfig

When multiple components on a page need pre-fetched data, provide it once at the page level instead of passing `fallbackData` to every `useSWR` call individually:

```tsx
// TypeScript — pages/dashboard.tsx
import { SWRConfig } from "swr"
import type { GetServerSideProps } from "next"
import { fetchTodos, fetchUser } from "../lib/api"

export const getServerSideProps: GetServerSideProps = async () => {
  const [todos, user] = await Promise.all([fetchTodos(), fetchUser()])
  return {
    props: {
      fallback: {
        "/api/todos": todos,
        "/api/user": user,
      },
    },
  }
}

export default function Dashboard({ fallback }: { fallback: Record<string, unknown> }) {
  return (
    <SWRConfig value={{ fallback }}>
      <TodoList />
      <UserProfile />
    </SWRConfig>
  )
}
```

```jsx
// JavaScript: drop the `Record<string, unknown>` type on `fallback` — the SWRConfig/fallback wiring is unchanged.
```

### Worked SSR example: Next.js App Router

App Router has no `getServerSideProps`; fetch in a Server Component and pass the result down as `fallbackData` to a Client Component that calls `useSWR`.

```tsx
// TypeScript — app/todos/page.tsx (Server Component)
import { TodoList } from "./todo-list"
import { fetchTodos } from "./api"

export default async function TodosPage() {
  const todos = await fetchTodos()
  return <TodoList initialTodos={todos} />
}
```

```tsx
// TypeScript — app/todos/todo-list.tsx (Client Component)
"use client"
import useSWR from "swr"
import { fetchTodos, type Todo } from "./api"

export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const { data } = useSWR("/api/todos", fetchTodos, { fallbackData: initialTodos })
  return <ul>{data.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}
```

```jsx
// JavaScript: drop the `{ initialTodos: Todo[] }` prop type and the `Todo` import — structure is otherwise identical.
```

### useSWRMutation in full

```tsx
// TypeScript
import useSWRMutation from "swr/mutation"

interface AddTodoArg {
  title: string
}

async function addTodo(url: string, { arg }: { arg: AddTodoArg }) {
  const res = await fetch(url, { method: "POST", body: JSON.stringify(arg) })
  if (!res.ok) throw new Error("Failed to add todo")
  return res.json()
}

function AddTodoForm() {
  const { trigger, isMutating, error } = useSWRMutation("/api/todos", addTodo)

  return (
    <button
      disabled={isMutating}
      onClick={() => trigger({ title: "New todo" })}
    >
      {isMutating ? "Saving..." : "Add todo"}
    </button>
  )
}
```

```jsx
// JavaScript: drop the `AddTodoArg` interface and the `{ arg: AddTodoArg }` parameter type — everything else, including `trigger`/`isMutating`/`error`, is identical.
```

### useSWRInfinite with cursor-based pagination

```tsx
// TypeScript
import useSWRInfinite from "swr/infinite"

interface Page {
  items: Todo[]
  nextCursor?: string
}

function usePagedTodos() {
  const { data, size, setSize, isLoading } = useSWRInfinite<Page>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.nextCursor) return null
      const cursor = pageIndex === 0 ? undefined : previousPageData?.nextCursor
      return ["/api/todos", cursor]
    },
    ([, cursor]) => fetchTodos({ cursor }),
  )

  const todos = data ? data.flatMap((page) => page.items) : []
  return { todos, isLoading, loadMore: () => setSize(size + 1) }
}
```

```jsx
// JavaScript: drop the `Page` interface, the `<Page>` generic on `useSWRInfinite`, and the destructure type annotations — logic is unchanged.
```

### Preloading data outside a component

```ts
import { preload } from "swr"

preload("/api/todos", fetchTodos)
// Later, useSWR("/api/todos", fetchTodos) reuses the preloaded request instead of firing a new one.
```

```js
// JavaScript: identical.
```

---

## Legacy (1.x and earlier)

### No isLoading — only isValidating

Before 2.x added a dedicated `isLoading` flag, code had to infer the initial-load state from `data`/`isValidating` together:

```ts
// 1.x
const { data, error, isValidating } = useSWR("/api/todos", fetcher)
const isInitialLoading = !data && !error && isValidating
```

```ts
// 2.x — isLoading is provided directly
const { data, error, isLoading } = useSWR("/api/todos", fetcher)
```

If the installed version is 1.x, use the manual `isInitialLoading` derivation — `isLoading` doesn't exist on the return value yet.

### Manual mutation pattern (pre-useSWRMutation)

Before `useSWRMutation` (introduced in 2.x), mutations were done directly through the global `mutate` function with manual optimistic-data handling:

```ts
// 1.x
import { mutate } from "swr"

async function addTodo(newTodo: { title: string }) {
  await mutate(
    "/api/todos",
    async (current: Todo[] = []) => {
      const res = await fetch("/api/todos", { method: "POST", body: JSON.stringify(newTodo) })
      const created = await res.json()
      return [...current, created]
    },
    {
      optimisticData: (current: Todo[] = []) => [...current, newTodo],
      rollbackOnError: true,
    },
  )
}
```

```js
// JavaScript: drop the `{ title: string }` and `Todo[]` annotations — logic is otherwise the same as the TS version, and the same as the current-version `useSWRConfig().mutate` pattern shown in SKILL.md, just without the hook wrapper.
```

### Suspense flag (pre-2.x boolean option)

```ts
// 1.x — suspense was a boolean option on the hook itself
const { data } = useSWR("/api/user", fetcher, { suspense: true })
```

2.x still supports this option; behavior is unchanged, but confirm the installed version supports it before relying on suspense mode in an older 1.x/0.x install where it may be missing or unstable.