# Next.js routing: extended examples

## Current (App Router)

### Full file-tree conventions

```
app/
├── layout.tsx              # root layout
├── page.tsx                # "/"
├── loading.tsx             # loading UI for "/"
├── error.tsx               # error boundary for "/"
├── (marketing)/            # route group — no URL segment added
│   ├── about/page.tsx      # "/about"
│   └── pricing/page.tsx    # "/pricing"
├── dashboard/
│   ├── layout.tsx          # nested layout for all /dashboard/*
│   ├── page.tsx            # "/dashboard"
│   └── settings/page.tsx   # "/dashboard/settings"
└── posts/
    └── [postId]/
        ├── page.tsx        # "/posts/:postId"
        └── @modal/         # parallel route slot (advanced; rarely needed)
```

Route groups (`(name)`) organize files without affecting the URL — useful for separating marketing pages from app pages while sharing no layout, or applying a layout to a subset of routes without nesting a real path segment.

### loading.tsx and error.tsx

```tsx
// TypeScript — app/dashboard/loading.tsx
export default function Loading() {
  return <p>Loading dashboard...</p>
}
```

```tsx
// TypeScript — app/dashboard/error.tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

```jsx
// JavaScript: drop the `{ error: Error & { digest?: string }; reset: () => void }` prop type — error.tsx must still be a Client Component either way.
```

`error.tsx` must be a Client Component (`"use client"`) since it uses component state (implicitly, via React's error boundary mechanism) and the `reset` callback.

### Dynamic segments: catch-all and optional catch-all

```
app/docs/[...slug]/page.tsx      # matches /docs/a, /docs/a/b, /docs/a/b/c
app/docs/[[...slug]]/page.tsx    # also matches /docs (slug is undefined)
```

```tsx
// TypeScript — app/docs/[...slug]/page.tsx
export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  return <p>Path: {slug.join("/")}</p>
}
```

```jsx
// JavaScript: drop the params type — `slug` is an array either way.
```

### redirect() vs. notFound()

```tsx
import { redirect, notFound } from "next/navigation"

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  const post = await fetchPost(postId)

  if (!post) notFound()          // renders the nearest not-found.tsx
  if (post.archived) redirect("/archive")  // 307 redirect, stops rendering

  return <h1>{post.title}</h1>
}
```

```js
// JavaScript: identical apart from the params type.
```

Both `redirect()` and `notFound()` throw internally to interrupt rendering — don't wrap them in a `try/catch` that would swallow that behavior.

### next/dynamic for component-level splitting within a page

```tsx
// TypeScript
import dynamic from "next/dynamic"

const HeavyChart = dynamic(() => import("../components/HeavyChart"), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // skip server rendering for client-only libraries (e.g., canvas-based charts)
})

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart />
    </div>
  )
}
```

```jsx
// JavaScript: identical — `next/dynamic`'s options aren't typed differently in JS.
```

Use this for a specific heavy component (chart libraries, rich text editors, map widgets), not for splitting the route itself — the route segment is already split automatically by the App Router.

---

## Legacy (Pages Router)

### File conventions

```
pages/
├── _app.tsx              # wraps every page (like a root layout, manual)
├── _document.tsx          # customize the HTML document shell
├── index.tsx              # "/"
├── about.tsx               # "/about"
└── posts/
    ├── index.tsx           # "/posts"
    └── [postId].tsx        # "/posts/:postId"
```

### getStaticPaths and getStaticProps for dynamic routes

```tsx
// TypeScript — pages/posts/[postId].tsx
import type { GetStaticPaths, GetStaticProps } from "next"

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await fetchAllPostIds()
  return {
    paths: posts.map((id) => ({ params: { postId: id } })),
    fallback: "blocking",
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = await fetchPost(params!.postId as string)
  return { props: { post }, revalidate: 60 }
}

export default function PostPage({ post }: { post: Post }) {
  return <h1>{post.title}</h1>
}
```

```jsx
// JavaScript — pages/posts/[postId].jsx
export async function getStaticPaths() {
  const posts = await fetchAllPostIds()
  return {
    paths: posts.map((id) => ({ params: { postId: id } })),
    fallback: "blocking",
  }
}

export async function getStaticProps({ params }) {
  const post = await fetchPost(params.postId)
  return { props: { post }, revalidate: 60 }
}

export default function PostPage({ post }) {
  return <h1>{post.title}</h1>
}
```

`fallback: "blocking"` server-renders paths not returned by `getStaticPaths` on first request, then caches them — the closest Pages Router equivalent to App Router's on-demand dynamic rendering.

### useRouter differences from App Router hooks

```tsx
// Pages Router
import { useRouter } from "next/router"

function Nav() {
  const router = useRouter()
  const isActive = router.pathname === "/about"
  return <button onClick={() => router.push("/about")}>About</button>
}
```

Pages Router's `useRouter` bundles pathname, query, and navigation methods into one object; App Router splits these into separate hooks (`usePathname`, `useSearchParams`, `useRouter` from `next/navigation`, which only exposes navigation methods). Don't mix `next/router` and `next/navigation` imports in the same component — they belong to different routers and aren't interchangeable.