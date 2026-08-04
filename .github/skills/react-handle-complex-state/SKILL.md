---
name: react-handle-complex-state
description: (cog-toolkit, React) Use this whenever the user asks which state library to pick, how to structure a Zustand store, write Redux Toolkit slices or RTK Query endpoints, model Jotai/Recoil atoms, configure TanStack Query, or anything about global state, server-state caching, or state architecture. Trigger for: "set up Zustand", "Redux Toolkit slice", "RTK Query", "Jotai atoms", "Recoil selectors", "TanStack Query setup".

---

## 0. First split: client state vs server state

| Kind | Examples | Tool |
|---|---|---|
| Client / UI state | modal open, selected tab, form draft, theme, wizard step | Zustand, Redux Toolkit, Jotai, Recoil, or `useState`/`useReducer` |
| Server / async state | anything fetched from an API or DB, paginated lists | TanStack Query (or framework loaders) |

Most common mistake: storing server data in Zustand/Redux and hand-rolling loading/error/cache/refetch logic. Server data belongs in TanStack Query. Client stores hold only state with no server source of truth.

Using both in one app is normal and recommended: TanStack Query for server state, Zustand/Jotai/Redux for client state.

**STOP AND WAIT** — before picking a library, confirm with the user whether the state in question is client-only or server-derived — this decides everything downstream.

---

## 1. Decision guide — which client-state library

- Default choice, minimal boilerplate, no provider required → **Zustand**
- Large team, strict conventions, time-travel debugging, need RTK Query, existing Redux investment → **Redux Toolkit**
- State shape is naturally atomic (many independent small pieces: form fields, spreadsheet cells, graph nodes), fine-grained reactivity wanted → **Jotai**
- Already on Recoil, or specific Recoil feature needed → **Recoil** (maintenance mode; prefer Jotai for new projects)
- Purely server data, no meaningful client-only state → skip a client store, use TanStack Query alone

**STOP AND WAIT** — if the user hasn't named a library, state the recommendation and reasoning, then confirm before scaffolding code.

---

## 2. Zustand

### Setup
```ts
// store/useCounterStore.ts
import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}))
```

### Slice pattern (large stores)
```ts
// slices/createUserSlice.ts
export const createUserSlice = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
})

// slices/createCartSlice.ts
export const createCartSlice = (set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
})

// store/useStore.ts
export const useStore = create<UserSlice & CartSlice>((...a) => ({
  ...createUserSlice(...a),
  ...createCartSlice(...a),
}))
```

### Middleware (persist + devtools + immer combined)
```ts
import { persist, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export const useStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({
        todos: [],
        addTodo: (text) => set((s) => { s.todos.push({ text, done: false }) }),
      })),
      { name: 'app-storage' }
    )
  )
)
```

### Selector discipline
```ts
const count = useCounterStore((s) => s.count)   // re-renders only on count change
const store = useCounterStore()                 // avoid: subscribes to everything
```

### Next.js caveat
Never export a module-level singleton store in the App Router — it leaks state across requests/users. Instantiate the store inside a Client Component provider (one instance per request) and expose it via context.

---

## 3. Redux Toolkit

### Store + slice
```ts
// features/counter/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    incremented: (state) => { state.value += 1 },   // Immer under the hood
    incrementedBy: (state, action: PayloadAction<number>) => {
      state.value += action.payload
    },
  },
})
export const { incremented, incrementedBy } = counterSlice.actions
export default counterSlice.reducer

// store/store.ts
import { configureStore } from '@reduxjs/toolkit'
export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
})
```

### RTK Query (data fetching layer)
```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  endpoints: (builder) => ({
    getTodos: builder.query<Todo[], void>({
      query: () => '/todos',
      providesTags: ['Todo'],
    }),
    addTodo: builder.mutation<Todo, Partial<Todo>>({
      query: (body) => ({ url: '/todos', method: 'POST', body }),
      invalidatesTags: ['Todo'],
    }),
  }),
})
export const { useGetTodosQuery, useAddTodoMutation } = api
```

### Entity adapter (normalized CRUD state)
```ts
const todosAdapter = createEntityAdapter<Todo>()
const todosSlice = createSlice({
  name: 'todos',
  initialState: todosAdapter.getInitialState(),
  reducers: {
    todoAdded: todosAdapter.addOne,
    todoRemoved: todosAdapter.removeOne,
  },
})
```

### Typed hooks
```ts
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

---

## 4. Jotai / Recoil

### Jotai — primitive + derived atoms
```ts
import { atom, useAtom } from 'jotai'

const countAtom = atom(0)
const doubledAtom = atom((get) => get(countAtom) * 2)

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const [doubled] = useAtom(doubledAtom)
  return <button onClick={() => setCount((c) => c + 1)}>{count} / {doubled}</button>
}
```

### atomFamily + async atom
```ts
import { atomFamily } from 'jotai/utils'

const todoAtomFamily = atomFamily((id: string) =>
  atom(async () => fetchTodo(id))
)
// consume with Suspense boundary around the component reading it
```

### Persistence
```ts
import { atomWithStorage } from 'jotai/utils'
const themeAtom = atomWithStorage('theme', 'light')
```

### Recoil equivalents
- `atom` → same concept, requires `<RecoilRoot>` wrapping the app
  (Jotai works without a provider by default)
- `selector` → equivalent to Jotai's derived atom
- `selectorFamily` → equivalent to `atomFamily` combined with a derived atom

Recoil is in maintenance mode. For new projects, prefer Jotai; only stay on Recoil for an existing codebase already built on it.

**STOP AND WAIT** — if the user is starting fresh on Recoil, confirm they're aware of its maintenance status before scaffolding — Jotai is the recommended default for greenfield atomic state.

---

## 5. TanStack Query

### QueryClient + useQuery
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})

const { data, isPending, error } = useQuery({
  queryKey: ['todos', userId],
  queryFn: () => fetchTodos(userId),
})
```

### Mutation with optimistic update
```ts
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const previous = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], (old) =>
      old.map((t) => (t.id === newTodo.id ? newTodo : t))
    )
    return { previous }
  },
  onError: (_err, _newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous)   // rollback
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})
```

### Query key factory
```ts
export const todoKeys = {
  all: ['todos'] as const,
  list: (userId: string) => [...todoKeys.all, userId] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
}
```

### SSR hydration
- Next.js App Router: prefetch server-side, wrap in `<HydrationBoundary state={dehydrate(queryClient)}>`
- Next.js Pages Router: prefetch in `getServerSideProps`, pass dehydrated state as a prop, hydrate the same way
- Remix: prefetch in the loader, pass dehydrated state through loader data, hydrate on the client

---

## 6. Combining a client store with TanStack Query

Client store holds only a reference (e.g. selected id); TanStack Query
owns the actual data.

```ts
// Zustand — UI-only
const useUiStore = create<{ selectedId: string | null; select: (id: string) => void }>(
  (set) => ({ selectedId: null, select: (id) => set({ selectedId: id }) })
)

// Component composes both
const selectedId = useUiStore((s) => s.selectedId)
const { data: todo } = useQuery({
  queryKey: todoKeys.detail(selectedId!),
  queryFn: () => fetchTodo(selectedId!),
  enabled: !!selectedId,
})
```

Anti-pattern: syncing TanStack Query data into Zustand/Redux via `useEffect`. That creates a second source of truth that can go stale. Read query data directly, or pass it down as props.

---

## 7. Framework notes

- Next.js App Router: client stores only work inside Client Components (`'use client'`); instantiate per-request via provider, not as a module singleton.
- Vite (SPA): module-level singleton stores are fine — single process, single user session.
- Remix: same Client Component/provider caution as Next.js under SSR; loaders usually supply initial server data, TanStack Query takes over for client-side revalidation.

---

## Quick recap

- Split state into client state (Zustand/RTK/Jotai/Recoil) vs server state (TanStack Query); never store server data in a client store.
- Default to Zustand unless enterprise tooling/RTK Query is needed (Redux Toolkit) or the state is naturally atomic (Jotai).
- Recoil is legacy; prefer Jotai for new projects.
- In Next.js App Router, instantiate client stores inside Client Component providers, never as module singletons.
- Confirm library choice with the user before scaffolding
