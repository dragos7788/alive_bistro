# Data fetching setup

Default is Server Components with native `fetch` — no extra library needed for most read-heavy pages. Only add a client-side data library when the app has genuinely client-driven data needs (polling, optimistic updates, complex caching UI).

## Server Components + fetch (default)

Fetch directly in an async Server Component — no `useEffect`, no loading state boilerplate for the initial render:

```tsx
async function getData() {
  const res = await fetch("https://api.example.com/items")
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <ul>{data.map((item: Item) => <li key={item.id}>{item.name}</li>)}</ul>
}
```

Next.js extends `fetch` with caching controls:

```ts
fetch(url, { next: { revalidate: 60 } })   // ISR-style revalidation
fetch(url, { cache: "no-store" })          // always fresh
```

Use `revalidate` for data that changes occasionally, `no-store` for per-request data (e.g., user-specific dashboards).

## Route Handlers (API routes)

Use when the frontend needs an endpoint to call (webhooks, form submissions, third-party API proxying):

```ts
// src/app/api/items/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  const items = await fetchItems()
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const body = await request.json()
  // handle creation
  return NextResponse.json({ ok: true }, { status: 201 })
}
```

## Client-side data libraries

Only add when the app needs client-driven fetching (polling, mutation with optimistic UI, infinite scroll):

**SWR** — lighter weight, good default when a library is needed but not named:

```bash
npm install swr
```

```tsx
"use client"
import useSWR from "swr"

function Component() {
  const { data, error, isLoading } = useSWR("/api/items", fetcher)
}
```

**React Query (TanStack Query)** — richer caching/mutation API, use if the user names it or the app has complex mutation flows:

```bash
npm install @tanstack/react-query
```

Requires wrapping the app in a `QueryClientProvider`, which must be a Client Component.

## Stop and ask if unclear

If the user says "add data fetching" without describing whether it's read-only page content or interactive client state, ask — Server Components fetch and a client library lead to different file structures and are not trivial to swap later once pages depend on one pattern.