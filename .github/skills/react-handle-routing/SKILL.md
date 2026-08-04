---
name: react-handle-routing
description: (cog-toolkit, React) Add or configure routing/navigation in a React application. Use whenever the user wants to set up pages, routes, navigation, nested layouts, dynamic URLs, or route-level code splitting — across plain React/Vite apps, Next.js (App Router or Pages Router), or apps using React Router's Framework Mode.
---

# React Routing and Navigation

Set up or extend routing in a React app: React Router (Library and Framework mode), Next.js (App Router and Pages Router), nested layouts, dynamic routes, and code splitting.

## Version grounding

**React Router v8** is current; v7 still receives security updates. **v6 and standalone Remix v2 are both end-of-life** with no further security patches. Remix has merged into React Router: what used to be "Remix" is now React Router's Framework Mode. Nested routes, loaders, and actions via `createBrowserRouter` originated in v6.4 and are current-section material, not legacy, despite predating the merge.

**Next.js**: App Router is the current default; Pages Router is legacy/maintenance for new projects.

Always check the installed version before writing code:

```bash
cat package.json | grep -E '"(react-router|react-router-dom|@remix-run|next)":'
```

## Decision points

| Decision | Default | Ask when |
|---|---|---|
| Framework context | Detect from project files | Ambiguous — e.g., a Vite app that also wants SSR |
| React Router mode (non-Next.js apps) | Library mode for client-only SPAs; Framework mode if SSR/loaders are needed | Request implies data loading, forms, or SSR in a Vite app |
| Next.js router | App Router | User references Pages Router or an older codebase |
| Existing Remix app | Migrate to React Router v8 | User wants to keep Remix v2 pinned for a stated reason |
| Route-level code splitting | Automatic (Framework mode / Next.js App Router); manual `React.lazy` (Library mode) | App has a specific bundle-size concern beyond the framework default |

### Stop and ask

- **Project is already on Remix v2 or React Router v6.** Both are end-of-life. Flag this plainly and ask whether to migrate to React Router v8 now or proceed on the unsupported version for a stated reason.
- **A Vite app's routing needs are ambiguous between Library and Framework mode.** If the request implies loaders, actions, or SSR, confirm before scaffolding plain client-side routes that would need a rewrite later.
- **Next.js router version conflicts with pasted code.** Pages-Router-style code (`getServerSideProps`, `pages/`) mixed with an App-Router request needs confirmation before proceeding.

For everything else — exact route names, minor file layout — proceed with the default and mention the assumption inline.

## React Router: Library mode (Vite / plain React, client-only)

```bash
npm install react-router
```

```tsx
// TypeScript — src/main.tsx
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import RootLayout from "./layouts/RootLayout"
import Home from "./pages/Home"
import About from "./pages/About"

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
    ],
  },
])

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />)
```

```jsx
// JavaScript: drop the `!` non-null assertion — everything else is identical.
```

```tsx
// src/layouts/RootLayout.tsx
import { Outlet, NavLink } from "react-router"

export default function RootLayout() {
  return (
    <>
      <nav>
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
      <Outlet />
    </>
  )
}
```

`NavLink` applies an `active` class automatically; use `end` on the index route link so it doesn't match every nested path.

## React Router: Framework mode (SSR, loaders/actions — the Remix replacement)

```bash
npx create-react-router@latest my-app
```

Routes are defined in `app/routes.ts`:

```ts
// TypeScript — app/routes.ts
import { type RouteConfig, route, index, layout } from "@react-router/dev/routes"

export default [
  layout("layouts/root.tsx", [
    index("routes/home.tsx"),
    route("about", "routes/about.tsx"),
    route("posts/:postId", "routes/post.tsx"),
  ]),
] satisfies RouteConfig
```

```js
// JavaScript: drop the `RouteConfig` import and `satisfies RouteConfig` — the array structure is unchanged.
```

## Nested routes, loaders, and actions (v6.4+ / v8 data routers)

This is the core data-loading pattern for both Library mode (via `createBrowserRouter`) and Framework mode (via route modules).

```tsx
// TypeScript — app/routes/post.tsx (Framework mode) or a route object's loader (Library mode)
import { useLoaderData, Form, redirect } from "react-router"
import type { Route } from "./+types/post"

export async function loader({ params }: Route.LoaderArgs) {
  const post = await fetchPost(params.postId)
  if (!post) throw new Response("Not found", { status: 404 })
  return post
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData()
  await updatePost(params.postId, formData.get("title"))
  return redirect(`/posts/${params.postId}`)
}

export default function Post() {
  const post = useLoaderData<typeof loader>()
  return (
    <Form method="post">
      <input name="title" defaultValue={post.title} />
      <button type="submit">Save</button>
    </Form>
  )
}
```

```js
// JavaScript: drop the `Route.LoaderArgs`/`Route.ActionArgs` types and the `+types` import — loader/action functions and the Form/useLoaderData usage are unchanged.
```

In Library mode, `loader`/`action` are supplied as properties on the route object passed to `createBrowserRouter` instead of exported from a route file — the function bodies are identical either way.

## Next.js App Router

File-based, no route configuration file. Each folder under `app/` is a URL segment; `page.tsx` makes it routable.

```
app/
├── layout.tsx        # root layout, wraps every page
├── page.tsx          # "/"
├── about/
│   └── page.tsx      # "/about"
└── posts/
    └── [postId]/
        └── page.tsx  # "/posts/:postId"
```

```tsx
// TypeScript — app/posts/[postId]/page.tsx
export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const post = await fetchPost(postId)
  return <h1>{post.title}</h1>
}
```

```jsx
// JavaScript: drop the `{ params: Promise<{ postId: string }> }` type — `params` is still a Promise at runtime and must still be awaited.
```

```tsx
// Client-side navigation — any Client Component
"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  return (
    <>
      <Link href="/about" className={pathname === "/about" ? "active" : ""}>About</Link>
      <button onClick={() => router.push("/posts/123")}>Go to post</button>
    </>
  )
}
```

```jsx
// JavaScript: identical — no type-only surface here.
```

## Next.js Pages Router (legacy default, still supported)

```
pages/
├── _app.tsx
├── index.tsx          # "/"
├── about.tsx           # "/about"
└── posts/
    └── [postId].tsx    # "/posts/:postId"
```

```tsx
// TypeScript — pages/posts/[postId].tsx
import { useRouter } from "next/router"

export default function PostPage() {
  const router = useRouter()
  const { postId } = router.query
  return <h1>Post {postId}</h1>
}
```

```jsx
// JavaScript: identical — `router.query` values are untyped strings either way.
```

## Nested layouts

**App Router** — layouts nest automatically by folder depth; each `layout.tsx` wraps its own segment and everything below it, and persists across navigations within that segment.

**Framework mode** — nesting is explicit via the `layout()` helper in `routes.ts` (shown above); the layout component renders an `<Outlet />` for its children, same as Library mode.

**Pages Router** — no built-in nested layouts; wrap pages manually in `_app.tsx` or a shared layout component per page.

## Dynamic and parameterized routes

| Context | Syntax | Access |
|---|---|---|
| React Router (both modes) | `route("posts/:postId", ...)` | `useParams()` or `loader({ params })` |
| Next.js App Router | folder `[postId]` | `await params` in the page (params is a Promise) |
| Next.js Pages Router | file `[postId].tsx` | `router.query.postId` |

## Route-level code splitting

Whether splitting happens automatically depends entirely on context — don't add manual splitting where the framework already does it, and don't assume it's automatic where it isn't.

- **React Router Library mode**: no automatic splitting. Use `React.lazy` per route, wrapped in `Suspense`:

```tsx
// TypeScript
import { lazy, Suspense } from "react"

const About = lazy(() => import("./pages/About"))

// in the route config:
{ path: "about", element: <Suspense fallback={<p>Loading...</p>}><About /></Suspense> }
```

```jsx
// JavaScript: identical — `React.lazy` has no TypeScript-only surface.
```

- **React Router Framework mode**: route modules are code-split automatically by the compiler. Use `route.lazy()` only to opt an individual route into on-demand loading of the entire route module (loader + component together), not for splitting a component within a page — see `references/react-router.md` for the full example.
- **Next.js App Router**: each route segment is code-split automatically. Use `next/dynamic` only for a heavy component within an already-split page, not for the route itself — see `references/nextjs-routing.md`.

## Navigation and active-link patterns

| Context | Link component | Active-state helper |
|---|---|---|
| React Router (both modes) | `<Link>` / `<NavLink>` | `NavLink`'s automatic `active` class, or `useLocation()` |
| Next.js (both routers) | `next/link`'s `<Link>` | `usePathname()` (App Router) or `router.pathname` (Pages Router) |

## Redirects and route guards

```tsx
// React Router — redirect from a loader
export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request)
  if (!user) throw redirect("/login")
  return user
}
```

```tsx
// Next.js App Router — redirect from a Server Component or Server Action
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  return <Dashboard user={user} />
}
```

```js
// JavaScript for both: drop the `Route.LoaderArgs` type — `redirect()` usage is unchanged in both libraries.
```

## Guidelines

- Check the installed React Router / Next.js version before writing code; don't assume the latest API is available.
- Flag EOL versions (React Router v6, Remix v2) before extending them — migration to React Router v8 is a near-mechanical import change.
- Don't scaffold a Vite app into Framework mode unless SSR/loaders are actually needed.
- Keep Next.js routing and React Router guidance separate — a request naming one shouldn't pull in patterns from the other.
- Default to App Router for new Next.js work; Pages Router only on explicit request or existing-codebase match.
- Don't add manual `React.lazy`/`next/dynamic` route splitting where the framework already splits automatically; reserve them for heavy components within an already-split route.
- Keep core setup, the nested-route/loader/action pattern, and the code-splitting decision in this file; keep extended examples and legacy-version syntax in the reference files.