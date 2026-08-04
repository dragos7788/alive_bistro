# React Router: extended examples

## Current (v8)

### Full Library mode route tree with error boundaries

```tsx
// TypeScript
import { createBrowserRouter, RouterProvider } from "react-router"
import RootLayout from "./layouts/RootLayout"
import ErrorPage from "./pages/ErrorPage"
import Home from "./pages/Home"
import Posts from "./pages/Posts"
import Post, { loader as postLoader } from "./pages/Post"

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "posts", element: <Posts /> },
      { path: "posts/:postId", element: <Post />, loader: postLoader },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

```jsx
// JavaScript: drop the type-only import for `Route.LoaderArgs` inside `postLoader`'s definition (see below) — the router config object is unchanged.
```

`errorElement` catches thrown errors (including `loader`/`action` errors) for that route and its children — set one at the root and override per-route where a more specific fallback is useful.

### Loader with useLoaderData in Library mode

```tsx
// TypeScript — pages/Post.tsx
import { useLoaderData } from "react-router"
import type { LoaderFunctionArgs } from "react-router"

export async function loader({ params }: LoaderFunctionArgs) {
  const post = await fetch(`/api/posts/${params.postId}`).then((r) => r.json())
  return post
}

export default function Post() {
  const post = useLoaderData()
  return <h1>{post.title}</h1>
}
```

```js
// JavaScript: drop the `LoaderFunctionArgs` import and parameter type — logic is identical.
```

### Pending navigation UI

```tsx
import { useNavigation } from "react-router"

function RootLayout() {
  const navigation = useNavigation()
  return (
    <>
      {navigation.state === "loading" && <p>Loading...</p>}
      <Outlet />
    </>
  )
}
```

```jsx
// JavaScript: identical.
```

### Form-based mutations with useFetcher (no navigation)

```tsx
import { useFetcher } from "react-router"

function LikeButton({ postId }: { postId: string }) {
  const fetcher = useFetcher()
  return (
    <fetcher.Form method="post" action={`/posts/${postId}/like`}>
      <button type="submit" disabled={fetcher.state !== "idle"}>Like</button>
    </fetcher.Form>
  )
}
```

```js
// JavaScript: drop the `{ postId: string }` prop type.
```

`useFetcher` submits to a route's `action` without triggering a full navigation — use it for in-place mutations like likes, toggles, or inline edits.

### route.lazy() for route-module code splitting (Framework mode)

```ts
// TypeScript — app/routes.ts
import { route } from "@react-router/dev/routes"

export default [
  route("reports", "routes/reports.tsx", {
    lazy: () => import("./routes/reports"),
  }),
]
```

This defers loading the entire route module — loader, action, and component together — until the route is visited. It is distinct from `React.lazy`, which only splits a component's rendering, not its data logic.

### Full React.lazy + Suspense example (Library mode)

```tsx
// TypeScript
import { lazy, Suspense } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"

const About = lazy(() => import("./pages/About"))
const Settings = lazy(() => import("./pages/Settings"))

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        path: "about",
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <About />
          </Suspense>
        ),
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
])
```

```jsx
// JavaScript: identical — no type-only surface in this pattern.
```

Wrap each lazy route individually rather than one `Suspense` boundary around the whole router, so navigating between two lazy routes doesn't re-trigger a full-page loading state.

---

## Legacy (v6 and Remix v2)

### Old JSX-only route declarations (pre-6.4, no data router)

```tsx
// v6, pre-data-router
import { BrowserRouter, Routes, Route } from "react-router-dom"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

No `loader`/`action` support in this form — data fetching had to be done manually inside components with `useEffect`. If the installed version predates 6.4's data routers, this JSX form is what to use; don't introduce `createBrowserRouter` without confirming the version supports it.

### Remix v2 import paths vs. React Router v8

```ts
// Remix v2
import { json, redirect } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

// React Router v8 — collapsed into a single package
import { redirect } from "react-router"
import { useLoaderData } from "react-router"
```

`json()` no longer exists as a separate helper in v8 — return plain objects directly from loaders/actions. Runtime-specific packages (`@remix-run/node`, `@remix-run/cloudflare`) are only needed for APIs specific to that runtime (e.g., file-based session storage), not for `redirect`/`useLoaderData`/etc.

### Migration note

Upgrading from Remix v2 or React Router v6 to v8 is described by the team as a largely mechanical import change once all future flags are enabled — a codemod can automate most of steps. Flag the EOL status to the user and recommend upgrading rather than extending code on an unsupported version, unless they've stated a specific reason to stay.