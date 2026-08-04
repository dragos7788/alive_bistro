# Intl.* formatting: extended examples

## Currency display variants

```ts
new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "symbol",   // "$1,234.50"
}).format(1234.5)

new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "code",     // "USD 1,234.50"
}).format(1234.5)

new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "name",     // "1,234.50 US dollars"
}).format(1234.5)
```

`currencyDisplay: "narrowSymbol"` avoids ambiguous symbols in locales where multiple currencies share a symbol (e.g., distinguishing US dollars from Canadian dollars in a `en-CA` context).

## Handling very large/small numbers and compact notation

```ts
new Intl.NumberFormat("en-US", { notation: "compact" }).format(1500000)
// "1.5M"

new Intl.NumberFormat("de-DE", { notation: "compact" }).format(1500000)
// "1,5 Mio."

new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
}).format(0.000123)
// "0.0001"
```

Compact notation is locale-sensitive in both abbreviation style and threshold — don't hardcode "K"/"M" suffixes manually.

## Intl.PluralRules for custom logic outside message formatting

When plural-sensitive UI logic is needed outside of a translated string (e.g., choosing which icon to show, not which text), use `Intl.PluralRules` directly instead of duplicating CLDR category logic by hand:

```ts
const pr = new Intl.PluralRules("en")
pr.select(1)   // "one"
pr.select(2)   // "other"

const prAr = new Intl.PluralRules("ar")
prAr.select(2) // "two"
```

## Intl.Segmenter for locale-aware text breaking

Splitting text into words or graphemes correctly requires locale awareness — naive `.split(" ")` breaks for languages without spaces between words (e.g., Japanese, Thai):

```ts
const segmenter = new Intl.Segmenter("ja", { granularity: "word" })
const segments = Array.from(segmenter.segment("私は学生です"))
// yields locale-correct word boundaries instead of one unbroken string
```

Use `granularity: "grapheme"` when truncating strings for display (e.g., avatar initials, ellipsis truncation) to avoid splitting multi-code-point characters like emoji or combining accents mid-character.

## Intl.DateTimeFormat with time zones

```ts
new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
}).format(new Date())
```

Always pass an explicit `timeZone` when displaying a time relevant to something other than the viewer's local time (e.g., an event's original time zone, a server timestamp meant to be shown in UTC).