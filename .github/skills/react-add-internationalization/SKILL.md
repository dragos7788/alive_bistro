---
name: react-add-internationalization
description: (cog-toolkit, React) Use this skill whenever the user wants to translate an app, support multiple languages/locales, format dates/numbers/currency per locale, add pluralization, support RTL languages, or mentions react-i18next, react-intl, FormatJS, or ICU message syntax — even without the word "i18n" or "internationalization".
---

# React Internationalization (i18n)

Add or scaffold internationalization in a React app: library setup, message formatting, locale-aware formatting, file organization, lazy-loading, and RTL support.

## Decision points

Resolve each of these before implementing. Use stated defaults when unspecified — only ask what's genuinely ambiguous or consequential.

| Decision | Default | Ask when |
|---|---|---|
| Library | react-i18next | User names react-intl/FormatJS, or app is already on one |
| Message format | ICU MessageFormat | Rarely ambiguous — skip only for trivial key-value strings |
| Translation file structure | Per-locale JSON, namespaced by feature | App is small enough that a single file per locale suffices |
| Loading strategy | Lazy-load per-namespace bundles | App is small/single-bundle, or user wants everything preloaded |
| Locales to support | Ask | Always — determines file scaffolding and RTL need |
| RTL support | Only if an RTL locale is in scope | User's locale list is ambiguous about including RTL languages |
| Locale-aware formatting | Native `Intl.*` APIs | Project already depends on a formatting library with locale plugins |

### Stop and ask

- **Target locale list is not given.** Never assume which languages/locales to scaffold — this drives file structure, pluralization rules, and whether RTL work is needed at all.
- **Library choice is ambiguous in an existing codebase.** If the app already imports `react-intl` but the request reads like react-i18next conventions (or vice versa), confirm before introducing a second i18n library — running both is a real anti-pattern.
- **RTL is newly introduced by a locale addition.** Adding Arabic, Hebrew, Urdu, etc. to an existing app requires a layout audit (logical CSS properties, icon mirroring, bidi text), not just new translation strings — confirm scope before treating it as a simple string-swap.
- **Pluralization or gender/select rules are non-trivial for a target locale.** Some locales have plural categories beyond one/other (e.g., Arabic has six). Confirm intended fallback behavior rather than guessing.
- **Existing translation files use a structure that conflicts with the default.** Confirm whether to conform to the existing convention or migrate, rather than introducing a second one.

For everything else — exact key names, minor file layout within a namespace — proceed with the default and mention the assumption inline.

## Library selection

**react-i18next** (default) — hooks-first API (`useTranslation`), flexible backend loading (`i18next-http-backend`), large plugin ecosystem, good fit for apps that want runtime-loaded JSON bundles.

**react-intl (FormatJS)** — stricter ICU tooling, compile-time message extraction via the `formatjs` CLI, good fit for apps wanting build-time validation of message syntax or already using FormatJS conventions.

Never run both in one codebase. If migrating between them, do it incrementally by route/feature, not as a big-bang rewrite unless requested.

### Minimal setup — react-i18next

```bash
npm install i18next react-i18next
```

```ts
// src/i18n.ts
import i18next from "i18next"
import { initReactI18next } from "react-i18next"

i18next.use(initReactI18next).init({
  resources: {
    en: { common: { greeting: "Hello, {{name}}!" } },
    es: { common: { greeting: "¡Hola, {{name}}!" } },
  },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
})

export default i18next
```

```tsx
import { useTranslation } from "react-i18next"

function Greeting({ name }: { name: string }) {
  const { t } = useTranslation()
  return <p>{t("greeting", { name })}</p>
}
```

### Minimal setup — react-intl

```bash
npm install react-intl
```

```tsx
import { IntlProvider, FormattedMessage } from "react-intl"

const messages = { en: { greeting: "Hello, {name}!" } }

function App({ locale }: { locale: string }) {
  return (
    <IntlProvider locale={locale} messages={messages[locale]}>
      <FormattedMessage id="greeting" values={{ name: "Ada" }} />
    </IntlProvider>
  )
}
```

For extraction tooling, rich-text embedding, and compiled-message setup, see `references/react-intl-examples.md`. For namespace splitting and backend-loader variants, see `references/react-i18next-examples.md`.

## ICU MessageFormat and pluralization

Both libraries support ICU MessageFormat. Default to it even for simple strings — retrofitting pluralization later is painful.

**Plural:**

```
{count, plural, one {# item} other {# items}}
```

**Select** (branching by a variable, e.g., gender or type):

```
{gender, select, male {He} female {She} other {They}} liked this.
```

**Selectordinal** (1st, 2nd, 3rd...):

```
{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}
```

CLDR plural categories vary by locale — English has two (`one`, `other`), Arabic has six, Polish has four. Always include an `other` case as the required fallback. Don't assume `one`/`other` covers every target locale — check the specific locale's category set before finalizing a message. Full per-locale category tables and nested plural+select examples are in `references/icu-pluralization-examples.md`.

## Locale-aware formatting

Prefer native `Intl.*` APIs over hand-rolled formatting or an extra library, unless the project already depends on one with locale support.

```ts
new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(1234.5)
// "1.234,50 €"

new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(new Date())
// "2026年7月8日"

new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-1, "day")
// "yesterday"

new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(["A", "B", "C"])
// "A, B, and C"

new Intl.Collator("sv").compare("ö", "z")
// locale-correct sort order, not code-point order
```

Use `Intl.NumberFormat`/`DateTimeFormat` for anything displayed to the user; don't build currency or date strings manually. For `Intl.PluralRules`, `Intl.Segmenter`, and less-common formatting options (currency display variants, edge cases with very large/small numbers), see `references/intl-formatting-examples.md`.

## Translation file organization

Default layout — per-locale, namespaced by feature:

```
src/locales/
├── en/
│   ├── common.json
│   ├── dashboard.json
│   └── settings.json
├── es/
│   ├── common.json
│   ├── dashboard.json
│   └── settings.json
└── ar/
    ├── common.json
    ├── dashboard.json
    └── settings.json
```

- Key naming: nested by feature/component (`dashboard.header.title`), not flat (`dashboardHeaderTitle`) — easier to scan and namespace.
- Always define a `fallbackLng` (usually the app's primary development language) so missing keys degrade gracefully instead of rendering blank or raw keys.
- Log missing-key warnings in development; don't let them fail silently or throw in production.
- For apps small enough to not need per-feature splitting, a single `en.json`/`es.json` per locale is an acceptable default — don't over-namespace a small app.

## Lazy-loading translation bundles

Default to lazy-loading by namespace or route once an app has more than a couple of locales or namespaces — don't ship every locale's strings in the main bundle.

**react-i18next**, via HTTP backend:

```ts
import Backend from "i18next-http-backend"

i18next.use(Backend).use(initReactI18next).init({
  backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
  ns: ["common"],
  defaultNS: "common",
})
```

Namespaces load on demand as components call `useTranslation("dashboard")`. For dynamic `import()` patterns, route-based code-splitting, and avoiding request waterfalls on initial render, see `references/react-i18next-examples.md` and `references/react-intl-examples.md`.

## RTL layout support

Only in scope when a target locale requires it (Arabic, Hebrew, Urdu, Farsi, etc.). Treat this as a layout task, not a translation task.

- Set `dir="rtl"` on `<html>` (or a top-level wrapper) based on the active locale, alongside `lang`.
- Use CSS logical properties instead of physical ones so layout flips automatically: `margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`, `inset-inline-start` instead of `left`.
- Mirror directional icons (arrows, chevrons) but not icons with inherent meaning (a play button, a logo).
- Mixed-direction text (e.g., a Latin brand name inside an Arabic sentence) can need explicit bidi handling — flag this as an edge case rather than guessing at the fix.

Full logical-property reference table, bidi override characters, and RTL-specific testing setup are in `references/rtl-examples.md`.

## Workflow

1. Resolve decision points above; **Stop and ask** where listed.
2. Install and wire the chosen library's provider; render one working translated string before adding anything else.
3. Set up the translation file structure and fallback-locale chain.
4. Add ICU messages for any pluralized/branching strings, checking CLDR categories for non-English target locales.
5. Replace manual date/number/list formatting with the relevant `Intl.*` call.
6. Configure lazy-loading if the app has more than a couple of locales or namespaces.
7. If an RTL locale is in scope, wire `dir`/`lang` switching and audit for physical CSS properties.
8. Verify: render the app in at least two locales, including one plural case and one RTL case if in scope.
9. Report: library used, locales supported, file structure, loading strategy, and any RTL/layout changes made.

## Cross-references to existing skills

- `react-create-readme` and `react-apply-hooks-patterns` currently have passing i18n/locale mentions. When touching either, point them at this skill instead of duplicating guidance — especially the Context-based locale example in `react-apply-hooks-patterns`, which should defer to the provider setup here.
- Don't re-teach general React Context patterns in this skill — reference `react-apply-hooks-patterns` for the underlying pattern and keep this skill's provider section i18n-specific.

## Guidelines

- Don't run two i18n libraries in one codebase — pick one and migrate incrementally if switching.
- Default to ICU MessageFormat even for simple strings — consistency avoids a painful retrofit later.
- Treat RTL as a layout concern, not a translation concern — don't scope it in silently when a new locale is added.
- Prefer native `Intl.*` APIs over hand-rolled formatting or heavy formatting libraries unless the project already depends on one.
- Lazy-load translation bundles by default for apps with more than a couple of locales or namespaces.
- Keep core syntax and the primary workflow in this file; push extended examples and edge cases to references.