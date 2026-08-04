# RTL layout: extended examples

## Logical property reference table

Replace every physical CSS property with its logical equivalent so layout flips automatically under `dir="rtl"`:

| Physical | Logical |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` (positioning) | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `float: left` / `right` | not directly logical — prefer flexbox/grid with `flex-direction` instead |

Flexbox and Grid already respect `dir` automatically via `flex-direction: row` and default grid flow — usually no extra RTL-specific code is needed for layouts built with them, only for absolutely-positioned or floated elements.

## Component-level dir switching

```tsx
function App({ locale }: { locale: string }) {
  const rtlLocales = ["ar", "he", "ur", "fa"]
  const dir = rtlLocales.includes(locale) ? "rtl" : "ltr"

  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = locale
  }, [dir, locale])

  return <App />
}
```

Set `dir` on `<html>`, not on individual components — a mixed-direction page (RTL text inside an LTR shell) should be the exception, driven by the `dir` attribute on that specific subtree, not the default.

## Icon and image mirroring

Mirror directional icons (back/forward arrows, chevrons indicating reading direction) using CSS:

```css
[dir="rtl"] .icon-chevron-forward {
  transform: scaleX(-1);
}
```

Do not mirror icons with inherent, direction-independent meaning: play/pause buttons, checkmarks, logos, or icons depicting real-world objects (a clock, a person). Mirroring these makes them look wrong rather than correctly localized.

## Bidi override characters for mixed-direction text

When an LTR string (a product code, a username, a URL) appears inside RTL text, wrap it to prevent the bidi algorithm from reordering it incorrectly:

```tsx
function LtrEmbed({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>
}
```

```tsx
<p>
  رقم الطلب: <LtrEmbed>ORDER-2026-4471</LtrEmbed>
</p>
```

The `<bdi>` element isolates the embedded run's directionality from the surrounding text without needing manual Unicode control characters (LRM/RLM), which are harder to maintain and easy to lose in translation files.

## Testing RTL without a full translation pass

Force `dir="rtl"` on the existing (untranslated) UI during development to catch layout bugs before real Arabic/Hebrew strings exist:

```ts
document.documentElement.dir = "rtl"
```

This surfaces physical-property leaks (misaligned icons, clipped text, wrong-side scrollbars) independently of translation completeness, so layout and translation work can proceed in parallel.