# react-i18next: extended examples

## Trans component for JSX interpolation

When a translated string needs embedded JSX (links, bold text, components), use `Trans` instead of `t()`:

```tsx
import { Trans } from "react-i18next"

function Terms() {
  return (
    <Trans i18nKey="terms.agreement">
      By continuing, you agree to our <a href="/terms">Terms of Service</a>.
    </Trans>
  )
}
```

```json
{
  "terms": {
    "agreement": "By continuing, you agree to our <1>Terms of Service</1>."
  }
}
```

`Trans` matches child elements by position, so keep the JSX structure in the component and the translation file in sync when a translator edits wording.

## Namespace splitting across routes

```ts
i18next.init({
  ns: ["common", "dashboard", "settings", "billing"],
  defaultNS: "common",
})
```

```tsx
function BillingPage() {
  const { t } = useTranslation("billing")
  return <h1>{t("title")}</h1>
}
```

Only the namespaces a route actually renders should be requested — pair with a route-level `useTranslation(["common", "billing"])` call so unrelated namespaces aren't force-loaded.

## i18next-http-backend configuration variants

Basic remote loading:

```ts
import Backend from "i18next-http-backend"

i18next.use(Backend).init({
  backend: {
    loadPath: "/locales/{{lng}}/{{ns}}.json",
  },
})
```

With versioned cache-busting and a custom request:

```ts
i18next.use(Backend).init({
  backend: {
    loadPath: "/locales/{{lng}}/{{ns}}.json?v={{version}}",
    parse: (data: string) => JSON.parse(data),
    requestOptions: { cache: "default" },
  },
})
```

Chaining multiple backends (e.g., local cache first, then network) is possible via `i18next-chained-backend` — only reach for this if offline support or stale-while-revalidate behavior is an explicit requirement.

## Testing translated components

Wrap components with a test-only i18next instance using synchronous, in-memory resources (no HTTP backend) so tests don't depend on network or file I/O:

```tsx
import i18next from "i18next"
import { initReactI18next } from "react-i18next"

i18next.use(initReactI18next).init({
  lng: "en",
  resources: { en: { common: { greeting: "Hello" } } },
  interpolation: { escapeValue: false },
})
```

Assert on the rendered translated text, not on translation keys — testing keys instead of output hides missing-translation regressions.