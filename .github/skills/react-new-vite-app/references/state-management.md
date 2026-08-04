# State management setup

Default is none — use React's built-in `useState`/`useContext`. Only add a library when the app has state shared across many, unrelated components, or the user names one explicitly.

## When to skip (default)

- Single-page or few-page apps
- State is local to one component or a small subtree
- No stated need for persistence, undo, or complex derived state

Don't install a state library "just in case."

## Zustand (lightweight default when a library is needed)

```bash
npm install zustand
```

```ts
// src/store/useStore.ts
import { create } from "zustand"

interface StoreState {
  count: number
  increment: () => void
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))
```

Usage in a component:

```tsx
const count = useStore((state) => state.count)
```

Prefer Zustand over Redux Toolkit when the user asks for "something simple" or doesn't name a library — less boilerplate for a fresh scaffold.

## Redux Toolkit (when explicitly requested, or app has complex state logic)

```bash
npm install @reduxjs/toolkit react-redux
```

```ts
// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit"
import counterReducer from "./counterSlice"

export const store = configureStore({
  reducer: { counter: counterReducer }
})
```

```ts
// src/store/counterSlice.ts
import { createSlice } from "@reduxjs/toolkit"

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1 }
  }
})

export const { increment } = counterSlice.actions
export default counterSlice.reducer
```

Wrap the app with `<Provider store={store}>` in `main.tsx`.

## Stop and ask if unclear

If the user says "add state management" without naming a library or describing the data flow, ask whether they want something lightweight (Zustand) or already have a team convention (Redux Toolkit, Jotai, etc.) — the two lead to different file structures and are not trivial to swap later.