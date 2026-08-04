# Routing setup

Applies when the app implies multiple pages or views. Single-page apps with no navigation don't need this — don't add a router preemptively.

## Install

```bash
npm install react-router
```

## Base setup (config-based routing)

In `src/main.tsx`, wrap the app:

```tsx
import { BrowserRouter } from "react-router"

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

In `src/App.tsx`, define routes:

```tsx
import { Routes, Route } from "react-router"
import Home from "./pages/Home"
import About from "./pages/About"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}
```

## Page organization

```
src/
├── pages/
│   ├── Home.tsx
│   └── About.tsx
├── components/
└── App.tsx
```

Keep route-level components in `pages/`, reusable pieces in `components/`. Don't mix the two — page components should mostly compose components, not hold heavy logic themselves.

## When the app needs nested layouts

Use a layout route with an `<Outlet />` rather than duplicating a header/nav in every page component:

```tsx
<Route element={<Layout />}>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />
</Route>
```

## Stop and ask if unclear

If the user's request implies routing but doesn't specify pages (e.g., "add a few pages"), ask what pages/routes are needed before scaffolding placeholder ones.