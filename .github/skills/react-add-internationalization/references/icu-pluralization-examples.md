# ICU MessageFormat and pluralization: extended examples

## CLDR plural categories by locale family

Plural category sets vary significantly. Always confirm which categories a target locale actually uses — supplying only `one`/`other` for a language with more categories causes those forms to silently fall back to `other`.

| Locale family | Categories | Example |
|---|---|---|
| English, German, Spanish | one, other | 1 item / 2 items |
| French, Portuguese (Brazil) | one, other (0 counts as one) | 0 item, 1 item / 2 items |
| Russian, Ukrainian | one, few, many, other | 1, 2-4, 5-20, other-based on last digits |
| Polish | one, few, many, other | 1, 2-4, 5+, fractions |
| Arabic | zero, one, two, few, many, other | distinct forms for 0, 1, 2, 3-10, 11-99, 100+ |
| Japanese, Korean, Chinese, Thai | other (no plural distinction) | same form regardless of count |

Example covering Arabic's full category set:

```
{count, plural,
  zero {لا عناصر}
  one {عنصر واحد}
  two {عنصران}
  few {# عناصر}
  many {# عنصرًا}
  other {# عنصر}
}
```

`other` is mandatory in every locale's message even when the category is otherwise unused, since it's the required fallback per the ICU spec.

## Nested plural + select

Combine `select` and `plural` when a message branches on both category and count:

```
{gender, select,
  male {He has {count, plural, one {# message} other {# messages}}}
  female {She has {count, plural, one {# message} other {# messages}}}
  other {They have {count, plural, one {# message} other {# messages}}}
}
```

Nesting nesting further than two levels usually signals the message should be split into separate keys per branch instead — deeply nested ICU is hard for translators to work with safely.

## Selectordinal examples

```
{rank, selectordinal,
  one {#st}
  two {#nd}
  few {#rd}
  other {#th}
}
```

Produces "1st", "2nd", "3rd", "4th"... in English. Ordinal categories also vary by locale — most languages other than English only need `other` for ordinals (e.g., Spanish uses "1.º" uniformly rather than distinct suffixes).

## Verifying category coverage programmatically

Rather than memorizing category tables, query them at build or test time:

```ts
new Intl.PluralRules("ar").resolvedOptions().pluralCategories
// ["zero", "one", "two", "few", "many", "other"]
```

Use this to validate that a translation file supplies every category the target locale requires, and fail a lint/test step if one is missing.