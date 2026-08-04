# react-intl (FormatJS): extended examples

## Message extraction workflow

FormatJS's CLI extracts `id`/`defaultMessage` pairs from source into locale files, keeping source and translations in sync automatically rather than hand-maintaining JSON.

```bash
npm install @formatjs/cli
```

```tsx
import { FormattedMessage } from "react-intl"

<FormattedMessage id="dashboard.title" defaultMessage="Your Dashboard" />
```

```bash
npx formatjs extract "src/**/*.tsx" --out-file lang/en.json
```

Translators then work from `lang/en.json`, producing `lang/es.json`, `lang/ar.json`, etc. Re-run extraction whenever source messages change — don't hand-edit the extracted `en.json` since it will be overwritten.

## Compiling messages for runtime

Compiling ICU messages ahead of time avoids parsing MessageFormat syntax in the browser on every render:

```bash
npx formatjs compile lang/es.json --ast --out-file compiled-lang/es.json
```

```ts
import esMessages from "./compiled-lang/es.json"

<IntlProvider locale="es" messages={esMessages}>
```

Compilation is worth adding once the app has enough messages that runtime parsing is measurable — skip it for small apps.

## Rich-text FormattedMessage with embedded components

```tsx
<FormattedMessage
  id="terms.agreement"
  defaultMessage="By continuing, you agree to our <link>Terms of Service</link>."
  values={{
    link: (chunks: React.ReactNode) => <a href="/terms">{chunks}</a>,
  }}
/>
```

Unlike react-i18next's positional `Trans` matching, react-intl's tag functions are named, which is more resilient to a translator reordering words around the embedded link.

## useIntl for imperative formatting

When formatting is needed outside JSX (e.g., inside an event handler or a non-component function), use the `useIntl` hook rather than reaching for raw `Intl.*` calls disconnected from the active locale:

```tsx
import { useIntl } from "react-intl"

function ExportButton() {
  const intl = useIntl()

  function handleExport() {
    const label = intl.formatMessage({ id: "export.filename" })
    const date = intl.formatDate(new Date())
    downloadFile(`${label}-${date}.csv`)
  }

  return <button onClick={handleExport}>Export</button>
}
```