---
name: react-improve-performance
description: (cog-toolkit, React) Use this skill when working on performance issues to identify and fix bottlenecks in React applications. It is framework-agnostic (the principles hold whether the app runs on Vite, Next.js, Remix, or plain React).
---

# Performance

Most "performance problems" are either a correctness issue in disguise (a needless re-render loop, mirrored state) or premature optimization that adds complexity without measured benefit. Work in this order: **measure → find the real cause → fix the cause → re-measure**.

This applies to three related but distinct kinds of performance: **runtime performance** (re-renders, JS execution cost, list rendering), **field/UX performance** (Core Web Vitals, load experience, real users on real networks), and **bundle/load performance** (what ships to the browser and how it's split). All three use the same measure-first loop, but they use different tools, covered in separate sections below.

Code examples below are given in TypeScript. If the project is plain JavaScript, use the same code with type annotations, type imports, and `import type`/generic parameters removed — the runtime logic is identical either way. Check for a `tsconfig.json` or `.ts`/`.tsx` file extensions before assuming which the project uses.

## Identify the setup before giving bundler-specific guidance

Chunk splitting, build analysis, and some RUM wiring are bundler/framework-specific — the right config, the right analyzer package, and the right entry point differ across plain React (custom webpack or another bundler), Vite, Next.js, and Remix. Before giving concrete config or commands in those sections:

- Check the codebase first: look for `next.config.js`/`next.config.ts` (Next.js), `remix.config.js`/`vite.config.ts` with `@remix-run/dev` (Remix), a standalone `vite.config.js`/`ts` (Vite), or `webpack.config.js`/CRA scripts (plain React/webpack). Also check `package.json` dependencies and scripts (`next build`, `vite build`, `remix vite:build`).
- If this is unambiguous from the files present, proceed with the matching guidance below.
- **If it's ambiguous or no config is visible (e.g., a snippet, a partial repo, or a from-scratch question), don't guess and don't silently pick one. Ask the user which bundler/framework they're using before giving chunk-splitting config, analyzer setup, or framework-specific RUM wiring.**

## Measure before optimizing

- Use the **React DevTools Profiler** to see which components render, how often, and why.
- Profile a **production build**, not development — dev mode is slower and Strict Mode double-renders, so dev timings mislead.
- Establish the baseline number you're trying to improve, then verify the change actually moved it. If it didn't, revert the optimization; complexity you can't justify is debt.

## Understanding re-renders

A component re-renders when its state changes, its parent re-renders, or a context it consumes changes. Re-rendering is normal and usually cheap — React diffs the output and only touches the DOM where it changed. A render is not a DOM update.

The problems worth fixing are: renders that do **expensive work** every time, renders that happen **far more often than the data changes**, and renders that cascade through a large subtree unnecessarily. Identify which one you actually have before reaching for a fix — they have different solutions.

## Memoization and the React Compiler

`React.memo`, `useMemo`, and `useCallback` skip work when inputs haven't changed by reference.

- `React.memo` skips re-rendering a component when its props are referentially equal.
- `useMemo` caches a computed value; `useCallback` caches a function's identity.

The catch: these only help if the inputs are *stable by reference*. Passing a freshly-created object, array, or inline function as a prop defeats `React.memo` because the reference differs every render — which is why memoizing a child often requires memoizing what you pass it, too. This is fiddly and easy to get subtly wrong.

Before hand-memoizing:

- Check whether the project has the React Compiler enabled. If it does, write plain, readable code and let the compiler handle memoization; add manual memoization only where profiling shows the compiler missed something.
- If it doesn't, apply manual memoization only at the specific spots a profile flagged.

Either way, memoization is a response to a measured cost, never a default coding style.

## Taming re-renders without memoization

Often the better fix is structural — it removes the re-render entirely rather than caching around it:

- **Colocate state.** State that lives higher than it needs to re-renders a bigger subtree on every change. Push it down to the component that actually uses it. This is the single most effective and most overlooked re-render fix.
- **Pass JSX as `children`.** A child passed in as `children` doesn't re-render when the parent's state changes, because its element was created by the *grandparent*. Lifting expensive subtrees into `children` lets a stateful wrapper re-render without dragging them along.
- **Split contexts.** Since every consumer re-renders on any context value change, separate frequently-changing values from stable ones into different contexts so a fast-changing value doesn't rerender consumers that only need the stable part. And memoize the provider's `value` object so it doesn't change reference every render.
- **Don't create new state owners you don't need.** Sometimes the fix is moving a piece of state out of a hot component into a separate sibling so its updates stop rerendering everything around it.

## Code splitting and lazy loading

Shipping less JavaScript up front is one of the highest-leverage perf wins, and it's about load time rather than render time.

- Use `React.lazy` + `Suspense` to split off routes and heavy components (charts, editors, modals) so they download only when needed, with a fallback while they load.
- Split at natural boundaries — routes first, then large below-the-fold or behind-interaction components.
- Don't over-split: hundreds of tiny chunks add request overhead. Aim for meaningful seams.
- Route-level splitting is often automatic or framework-provided (see per-framework notes below) — confirm what the framework already does before adding manual `React.lazy` on top of it.

## Chunk splitting strategy

The bundler's chunking configuration determines whether the browser downloads a handful of well-sized chunks or too many/too few poorly-sized ones. **Confirm which bundler is in play (see "Identify the setup" above) before applying any of the following** — the mechanism differs per tool.

### Plain React with webpack (or CRA-derived setup)

- **Vendor chunk optimization**: use `splitChunks.cacheGroups` to separate third-party dependencies (which change rarely) from app code (which changes often), so vendor code can be cached long-term.

```ts
  // webpack.config.ts (JS: same object, exported via module.exports, no type import/annotation)
  import type { Configuration } from 'webpack';

  const config: Configuration = {
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
          },
        },
      },
    },
  };

  export default config;
```

- **Route-based splitting**: not automatic — must be done manually via `React.lazy(() => import('./Route'))` per route, since there's no framework router doing it for you.
- **Shared chunk extraction**: webpack extracts shared modules into common chunks automatically above its default size/usage thresholds; verify in analyzer output rather than assuming it happened.

### Vite

- **Vendor chunk optimization**: via `build.rollupOptions.output.manualChunks`.

```ts
  // vite.config.ts (JS: drop defineConfig, just export default the plain object)
  import { defineConfig } from 'vite';

  export default defineConfig({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  });
```

- **Route-based splitting**: not automatic unless using a router that does it (e.g., some React Router setups) — otherwise requires manual `React.lazy` per route, same as plain webpack.
- **Shared chunk extraction**: Rollup (Vite's build layer) handles this by default above its own thresholds; check `vite build` output to confirm.
- **Analyzing `vite build` output**: it prints a per-chunk size table after build. Look for one chunk far larger than the rest, many near-duplicate chunks, or a vendor chunk whose size changes on every build (a sign app code leaked into it, defeating long-term caching).

### Next.js

- **Vendor chunk optimization**: handled automatically by Next's build (webpack or Turbopack under the hood) — manual `splitChunks` config is rarely needed and can conflict with Next's own optimization; only override it if the analyzer shows a specific problem Next's defaults aren't solving.
- **Route-based splitting**: automatic per route in both the App Router and Pages Router — no manual `React.lazy` needed for route boundaries. Use `next/dynamic` (Next's own lazy-loading wrapper) for heavy in-page components instead of `React.lazy` directly, since it integrates with Next's SSR/streaming behavior.
- **Shared chunk extraction**: automatic; verify via the analyzer (see below) rather than manual config.
- **Analyzing `next build` output**: prints a per-route size table (First Load JS per route). Watch for routes with unexpectedly large First Load JS — usually a sign of a heavy import that isn't dynamically loaded.
- **`next.config.ts`** is supported directly in current Next.js versions if the project is on TypeScript — no separate build step needed for the config file itself.

### Remix

- **Vendor chunk optimization and shared extraction**: Remix (on Vite, in current versions) inherits Vite/Rollup's chunking behavior — same `manualChunks` mechanism as plain Vite, but confirm the project is on Remix's Vite-based build (not the older esbuild-based one) before applying Vite-specific config, since the older build system doesn't support it the same way.
- **Route-based splitting**: automatic per route by design — Remix's nested routing already splits route modules; manual `React.lazy` is rarely needed at the route level and is more relevant for heavy components within a route.
- **Analyzing build output**: uses Vite's build output/analyzer tooling once confirmed on the Vite-based build (see Vite notes above).

## Build analyzer tooling

Use a visual analyzer whenever chunk sizes look off in the build output, or before optimizing further without knowing what's actually in a chunk. **Pick the tool that matches the bundler in use** (confirm per "Identify the setup" above):

- **`webpack-bundle-analyzer`** — for plain React/webpack or CRA-derived setups; treemap visualization of the webpack bundle showing which modules occupy which chunk.
- **`@next/bundle-analyzer`** — for Next.js specifically, since Next wraps webpack/Turbopack directly:

```ts
  // next.config.ts (JS: require() + module.exports instead of import/export default, no types)
  import type { NextConfig } from 'next';
  import withBundleAnalyzerInit from '@next/bundle-analyzer';

  const withBundleAnalyzer = withBundleAnalyzerInit({
    enabled: process.env.ANALYZE === 'true',
  });

  const config: NextConfig = {};

  export default withBundleAnalyzer(config);
```

- **`vite-plugin-visualizer`** (rollup-plugin-visualizer) — for Vite, and for Remix projects on the Vite-based build; add as a plugin, emits an HTML treemap report on build.
- **`source-map-explorer`** — bundler-agnostic: analyzes an already-built bundle plus its source map, so it works regardless of which of the above produced the build. Useful when the analyzer needs to run against a finished artifact rather than as a build-time plugin, or to double-check a plugin-based analyzer's findings.

Read the treemap for: unexpectedly large dependencies, duplicate versions of the same package pulled in by different sub-dependencies, and code that shouldn't be in a client bundle at all (server-only code, large JSON, unused locales).

## Dependency size tooling and budgets

These are bundler-agnostic and apply the same way regardless of framework:

- **Bundlephobia** — look up a package's minified/gzipped size and its own dependency tree before adding it, especially when choosing between similar libraries.
- **`pkg-size`** — CLI to measure an installed package's actual size on disk/in the bundle, useful for auditing what's already in `node_modules` versus what documentation claims.
- **`source-map-explorer`** — also applicable here to attribute already-shipped size back to specific dependencies, not just source files (see above).
- **Import cost analysis** — editor-level plugins that show a dependency's size inline next to the `import` statement, catching heavy imports at write-time rather than at build-analysis time.
- **Per-dependency size budgets** — set a max size (e.g., via `bundlesize` or a CI check against the analyzer output) for key entry chunks, so a dependency bump or a careless import doesn't silently regress load time. Fail CI on budget violations rather than relying on someone noticing in review.

## Image processing

- **Image compression** — **STOP AND WAIT**, ask: "I can use external libraries for image size compression, is this aligned with your needs? Shall I proceed?"
- Convert to webp/avif formats.
- Use the **fetchpriority** HTML attribute for fetching images based on the user experience impact in the loading process. It can complement **preloading**. If a particular image contributes significantly to LCP, add `<link rel="preload">` for it and set `fetchpriority="high"`.
- Suggest moving to a **CDN** and enabling caching.
- Use framework-native image components when available — e.g., Next.js next/image handles responsive srcset, lazy loading, automatic AVIF/WebP conversion, and layout-shift prevention out of the box; prefer it over manual <img> + manual compression/CDN wiring in that ecosystem.

## Long lists

Rendering thousands of DOM nodes is slow regardless of how efficient React is.

- **Virtualize** long or infinite lists so only the visible rows (plus a small buffer) are in the DOM, using a windowing library.
- Make sure list items have **stable keys** — unstable keys cause unnecessary unmount/remount churn that looks like a perf problem.
- For genuinely heavy per-item rendering, memoizing the row component can help — but confirm with the profiler first.

## Core Web Vitals

Core Web Vitals measure real-world, field-perceived UX in production. They are distinct from render-cost metrics above: a component can render efficiently and still produce a poor Web Vitals score if, for example, an image loads late or a layout shifts.

| Metric | What it measures | Good | Needs improvement | Poor | Common React causes |
|---|---|---|---|---|---|
| LCP (Largest Contentful Paint) | Time to render the largest visible content element | < 2.5s | 2.5s – 4s | > 4s | Client-side data-fetch waterfalls, lazy-loaded hero content, missing preload on the LCP image or font |
| INP (Interaction to Next Paint) | Latency from a user interaction to the next visual update | < 200ms | 200ms – 500ms | > 500ms | Expensive event handlers, large re-render cascades triggered by a click or keystroke, blocking main-thread work inside state updates |
| CLS (Cumulative Layout Shift) | Sum of unexpected layout shifts during page life | < 0.1 | 0.1 – 0.25 | > 0.25 | Images or ads without reserved dimensions, late-injected banners, web font swap, conditional rendering that shifts surrounding layout |

**Next.js-specific**: use Partial Prerendering (PPR) / streaming SSR as an LCP lever — statically prerender the shell and stream in dynamic content via Suspense, so the LCP element ships in the initial static response instead of waiting on server-side data fetching.

Aggregate Web Vitals at the **75th percentile (p75)** across real users, not average or median — this is the standard Google uses to classify a page as "good," and averages hide the slow tail that actually hurts users.

Lab tools (Lighthouse, local profiling) are useful for iterating quickly, but they don't replace field measurement — real devices and real networks vary too much. Measure both: lab data to debug, field data (RUM) to know the truth.

## Measuring Web Vitals with `web-vitals`

The `web-vitals` package is the standard library for capturing Core Web Vitals in-app, and it's framework-agnostic — the same API applies whether the app is plain React, Vite, Next.js, or Remix.

```ts
// JS: drop `type Metric` from the import and the `: Metric` annotation below
import { onLCP, onINP, onCLS, type Metric } from 'web-vitals';

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);

function sendToAnalytics(metric: Metric): void {
  navigator.sendBeacon('/analytics', JSON.stringify(metric));
}
```

- Use the **attribution build** (`web-vitals/attribution`) when a metric is poor and you need to know *why* — it reports the specific element or event responsible, not just the score. The typed variant is `import type { LCPMetricWithAttribution } from 'web-vitals/attribution'` (and the equivalent for INP/CLS) if you need to type the attribution payload specifically rather than the base `Metric` type.
- Don't stop at logging to the console in development. Route these metrics into a collection pipeline (see RUM section) so they reflect real users, not just your machine.
- Next.js has a framework-native alternative to calling `web-vitals` directly — see the Next.js note in RUM tooling below. Confirm which the project already uses before adding a second, redundant path.

## Custom instrumentation and telemetry setup

### `performance.mark()` / `performance.measure()`

Use these for app-specific timings that Web Vitals don't cover — for example, how long a data table takes to hydrate, or how long a checkout step takes end to end. Framework-agnostic; `PerformanceMark`/`PerformanceMeasure` are part of the built-in DOM lib types, so no extra typings package is needed.

```ts
// JS: drop the `: PerformanceMeasure` annotation, everything else is identical
performance.mark('table-hydrate-start');
// ... hydration work ...
performance.mark('table-hydrate-end');
const measurement: PerformanceMeasure = performance.measure(
  'table-hydrate',
  'table-hydrate-start',
  'table-hydrate-end',
);
```

- These marks and measures show up in the DevTools Performance panel and can be read programmatically with `PerformanceObserver`.
- Prefix mark names by feature (e.g., `checkout:`, `table:`) so they're easy to filter and grep.

### Wrapping marks in a React hook

A small hook keeps instrumentation consistent and out of component bodies:

```ts
// JS: drop the parameter/return type annotations
function usePerfMark(name: string, deps: React.DependencyList): void {
  useEffect(() => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return () => performance.clearMarks(name);
  }, deps);
}
```

- Only instrument components or flows that actually matter. Instrumenting everything adds noise to the Performance panel and a small but real overhead of its own.
- Clear marks/measures you no longer need — in long-lived sessions (SPAs that never fully reload) the performance entry buffer can grow unbounded.

### OpenTelemetry browser SDK setup

Reach for OpenTelemetry when you need to correlate frontend timing with backend or API traces — that is, distributed tracing across the whole request, not just standalone frontend numbers. For frontend-only custom timings, `performance.mark()`/`measure()` above is usually enough and simpler. This layer is framework-agnostic; the setup below applies the same regardless of bundler. The `@opentelemetry/*` packages ship their own type definitions, so no `@types/*` package is needed.

Minimal setup shape:

```ts
// JS: drop the `type Tracer, Span` import and the two type annotations below
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import type { Tracer, Span } from '@opentelemetry/api';

const provider = new WebTracerProvider({
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: '/v1/traces' }))],
});
provider.register();

const tracer: Tracer = provider.getTracer('app-frontend');
const span: Span = tracer.startSpan('checkout-submit');
// ... operation ...
span.end();
```

- Auto-instrumentation packages exist for fetch/XHR that automatically capture network spans — manual spans are only needed for custom application logic, not for every network call.
- Propagate trace context to the backend via request headers so frontend and backend spans link into a single trace instead of two disconnected ones. In Next.js/Remix (frameworks with server-side rendering and route loaders), this also means propagating context from server-rendered requests, not just client-side fetches — confirm which side (client, server, or both) needs tracing before wiring only one.

### Integrating into a React app

- Initialize the tracer/provider once at module scope, outside the component tree — not inside a component, where it would re-run on every render.
- Wrap key interactions (route change, form submit, data fetch) in spans or marks at the call site where the interaction happens, rather than burying them in shared utility code, so intent stays clear when reading the code later.
- Route this data into the same collection pipeline as Web Vitals where possible, instead of standing up a second, separate pipeline.
- Sample custom spans and traces, especially on high-traffic routes — unsampled telemetry can become a performance cost in its own right.

## RUM setup

Real User Monitoring collects field data from actual users, which lab data (Lighthouse, local profiling) cannot substitute for — device capability, network conditions, and real usage patterns vary too much to simulate reliably.

A minimal RUM pipeline: **collect** metrics (`web-vitals`, custom marks) → **batch and beacon** them to a collection endpoint → **ingest** into a store → **dashboard and alert** on them.

- **Segment** the data, since an aggregate number hides where the problem actually is:
  - By route — some pages are heavier than others.
  - By device/connection class — low-end devices and slow networks often carry the worst scores.
  - By percentile — always look at p75, not the mean.
- **Alert on regressions** using p75 crossing a "good" threshold, not on average movement, since averages can look stable while the slow tail gets worse.
- **Sample appropriately** — high-traffic apps can sample a fraction of sessions and still get a statistically solid p75; lower-traffic apps may need to collect closer to 100% to get enough data.

### RUM tooling options

Which tool fits depends on whether the app already has an analytics/APM vendor, and whether self-hosting is acceptable. This choice is largely framework-independent, with one exception noted below:

- **Vendor RUM platforms** (e.g., Datadog RUM, New Relic Browser, Sentry Performance) — fastest to stand up, include dashboarding and alerting out of the box, and often auto-instrument Web Vitals and route changes with a small SDK snippet. Good default when the team already uses one of these vendors for other observability. Works the same across plain React, Vite, Next.js, and Remix, and all ship their own TypeScript types.
- **Google-ecosystem options** — the Chrome UX Report (CrUX) provides free, aggregate field data for any public site without any code changes, but it's aggregated monthly and not real-time or segmentable by custom dimensions; Google Analytics can also receive Web Vitals events (sent via `web-vitals` + `gtag`) for a lighter-weight, no-new-vendor option if GA is already in place.
- **Self-hosted / open pipeline** — send `web-vitals` output to a custom endpoint backed by an open-source stack (e.g., events into a time-series store such as ClickHouse or Prometheus/Grafana, or OpenTelemetry Collector receiving both traces and metrics). More setup work, but full control over retention, segmentation, and cost — worth it when data volume is high or the app has strict data-residency requirements.
- **Next.js-specific**: exposes a `useReportWebVitals` hook wired directly into its router, reporting metrics per route without manually attaching `web-vitals` listeners. Prefer this over a manual `web-vitals` import in a Next.js project unless there's a specific reason to bypass it (e.g., needing metrics before the router mounts).

```ts
  // Next.js App Router (JS: drop the type import and the `: NextWebVitalsMetric` annotation)
  import type { NextWebVitalsMetric } from 'next/app';

  export function reportWebVitals(metric: NextWebVitalsMetric): void {
    navigator.sendBeacon('/analytics', JSON.stringify(metric));
  }
```

- **Plain React, Vite, and Remix**: no framework-native reporting hook — use the `web-vitals` package directly as shown in the Measuring Web Vitals section above.
- Whichever tool is chosen, keep the underlying metric source as `web-vitals` (or the Next.js wrapper around it) so the data stays comparable if the destination vendor changes later.

## Common wins

- **Debounce/throttle** high-frequency handlers (search-as-you-type, scroll, resize) so they don't fire state updates on every keystroke — this also directly protects INP by reducing how often the main thread is blocked responding to input.
- **Batch related state updates** instead of triggering several separate ones in a row.
- **Defer or avoid synchronous heavy work** in render and in event handlers that block the main thread; move it off the critical path.
- **Trim bundle size**: prefer importing only what you use, watch out for large dependencies pulled in wholesale, and audit the bundle with the analyzer tooling above when load time matters.
- Remember the hierarchy of effort: **fixing an unnecessary render or removing mirrored state usually beats any amount of memoization**, because it eliminates the work instead of caching it.
