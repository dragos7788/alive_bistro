---
name: react-apply-accessibility
description: Guidance for building and auditing accessible React UIs, framework agnostic (plain React, Next.js, Remix, Vite). Use this skill whenever writing or reviewing React components, forms, modals, menus, or any interactive UI, whenever accessibility, a11y, ARIA, screen readers, keyboard navigation, focus traps, color contrast, or WCAG are mentioned, and whenever setting up accessibility tests (axe-core, jest-axe, vitest-axe). Trigger even if the user only asks to "build a modal" or "make a dropdown" — accessibility should be considered proactively for any interactive component, not just when explicitly requested.
---

# React Accessibility

Practical guidance for making React components accessible, and for auditing existing ones. Applies to any React-based stack (Next.js, Remix, Vite, CRA).

## Core principle

Semantics, keyboard support, and focus behavior should be decided while designing the component's markup and state, not patched on afterward with ARIA attributes. Prefer native HTML elements (`button`, `a`, `input`, `dialog`, `select`) over re-implementing their behavior with `div`s and ARIA — native elements give you keyboard support, focus handling, and screen reader semantics for free.

## 1. ARIA patterns

Use ARIA to describe custom widgets that have no native HTML equivalent (comboboxes, tabs, tree views, custom modals). Follow the [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) patterns rather than inventing your own role/attribute combinations.

**Rules of ARIA use:**
1. Don't use ARIA if a native element already does the job.
2. Don't change native semantics unless you have no choice (`<h1 role="button">` is wrong — use a real `<button>`).
3. Every interactive ARIA role needs full keyboard support (see section 4).
4. Don't use `role="presentation"` or `aria-hidden="true"` on focusable elements.
5. All interactive elements need an accessible name (visible text, `aria-label`, or `aria-labelledby`).

### Do / Don't examples

**Toggle button**

```jsx
// Don't: div pretending to be a button
<div className="btn" onClick={toggle}>Play</div>

// Do: real button, state exposed via aria-pressed
<button type="button" aria-pressed={isPlaying} onClick={toggle}>
  {isPlaying ? 'Pause' : 'Play'}
</button>
```

**Icon-only button**

```jsx
// Don't: no accessible name
<button onClick={onClose}><XIcon /></button>

// Do: labeled for assistive tech, icon stays decorative
<button onClick={onClose} aria-label="Close dialog">
  <XIcon aria-hidden="true" focusable="false" />
</button>
```

**Custom dropdown/combobox**

```jsx
// Don't: div soup with no roles or keyboard handling
<div className="dropdown" onClick={openList}>
  <div>{selected}</div>
  {open && list.map(item => <div onClick={() => select(item)}>{item}</div>)}
</div>

// Do: follow the APG combobox pattern
<div className="combobox">
  <label id="fruit-label" htmlFor="fruit-input">Fruit</label>
  <input
    id="fruit-input"
    role="combobox"
    aria-expanded={open}
    aria-controls="fruit-listbox"
    aria-activedescendant={activeId}
    aria-labelledby="fruit-label"
    onKeyDown={handleKeyDown}
  />
  {open && (
    <ul id="fruit-listbox" role="listbox">
      {list.map(item => (
        <li
          key={item.id}
          id={item.id}
          role="option"
          aria-selected={item.id === activeId}
          onClick={() => select(item)}
        >
          {item.label}
        </li>
      ))}
    </ul>
  )}
</div>
```

**Live region for async updates**

```jsx
// Don't: silently update the DOM after a fetch
{status === 'error' && <p className="error">Could not save changes.</p>}

// Do: announce it to screen readers
<div role="status" aria-live="polite">
  {status === 'error' && 'Could not save changes.'}
</div>
```
Use `aria-live="polite"` for most status updates, `role="alert"` (implicit `aria-live="assertive"`) only for urgent, time-sensitive errors — overusing assertive live regions is disorienting.

## 2. Focus management

- Never remove focus outlines without providing a visible replacement. `outline: none` with nothing else is a common, serious regression.
- After a route change (Next.js `next/navigation`, Remix navigation, React Router), move focus to the new page's heading or main landmark so screen reader users know navigation happened.
- When content is conditionally rendered (modals, drawers, toasts), move focus into it on open, and return focus to the triggering element on close.
- Trap focus inside modal dialogs while they're open; don't let Tab escape to the background page.
- Don't use positive `tabIndex` values (`tabIndex="1"`, `2`, ...). Use `tabIndex={0}` to add an element to the natural tab order, `tabIndex={-1}` to make it programmatically focusable only.

### Do / Don't examples

**Removing focus styles**

```css
/* Don't */
button:focus { outline: none; }

/* Do: replace, don't remove */
button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

**Modal focus trap (framework agnostic, using native `<dialog>`)**

```jsx
// Do: native <dialog> gives you focus trapping and Escape-to-close for free
function ConfirmDialog({ open, onClose, onConfirm }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="confirm-title">
      <h2 id="confirm-title">Delete this item?</h2>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onConfirm}>Delete</button>
    </dialog>
  );
}
```

If you can't use `<dialog>`, manually move focus in and restore it on close:

```jsx
// Do: manual focus management fallback
function Modal({ open, onClose, children }) {
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement;
      modalRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();
    }
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {children}
    </div>
  );
}
```

**Route change announcement (framework agnostic pattern)**

```jsx
// Do: move focus to the page heading on route change
function PageHeading({ children }) {
  const ref = useRef(null);
  const pathname = usePathname(); // Next: next/navigation, Remix: useLocation().pathname

  useEffect(() => {
    ref.current?.focus();
  }, [pathname]);

  return <h1 ref={ref} tabIndex={-1}>{children}</h1>;
}
```

## 3. Keyboard navigation

Every interactive element and custom widget must be fully operable without a mouse.

| Widget | Required keys |
|---|---|
| Button | `Enter`, `Space` activate |
| Link | `Enter` activates |
| Checkbox/Radio | `Space` toggles, arrow keys move between radio group items |
| Tabs | Arrow keys move between tabs, `Tab` moves into panel |
| Menu/Menu button | `Enter`/`Space` opens, arrows navigate, `Escape` closes, `Tab` closes |
| Combobox/Listbox | Arrows navigate options, `Enter` selects, `Escape` closes |
| Modal dialog | `Tab`/`Shift+Tab` cycle within dialog, `Escape` closes |
| Slider | Arrow keys adjust, `Home`/`End` jump to min/max |

### Do / Don't examples

```jsx
// Don't: click-only custom widget, unreachable by keyboard
<div onClick={selectItem}>{label}</div>

// Do: keyboard equivalent for every mouse interaction
<div
  role="option"
  tabIndex={0}
  aria-selected={isSelected}
  onClick={selectItem}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectItem();
    }
  }}
>
  {label}
</div>
```

```jsx
// Don't: swallow Tab so users get stuck
<div onKeyDown={(e) => e.preventDefault()}>...</div>

// Do: only intercept the keys you actually need to handle
<div onKeyDown={(e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); focusNext(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); focusPrev(); }
  // let Tab, Shift+Tab, and everything else behave normally
}}>
  ...
</div>
```

Verify manually: unplug the mouse (or just don't touch it) and complete the whole task using only `Tab`, `Shift+Tab`, arrow keys, `Enter`, `Space`, and `Escape`. If you get stuck or lost, a keyboard user will too.

## 4. Color contrast

WCAG 2.1 AA minimums:
- Normal text: contrast ratio ≥ 4.5:1
- Large text (18pt+/24px+, or 14pt+/18.66px+ bold): ≥ 3:1
- UI components and graphical objects (icons, input borders, focus indicators): ≥ 3:1 against adjacent colors

Don't rely on color alone to convey meaning (error states, required fields, chart series). Pair color with text, icons, or patterns.

```jsx
// Don't: color is the only signal
<input style={{ borderColor: hasError ? 'red' : 'gray' }} />

// Do: text + icon + color
<>
  <input aria-invalid={hasError} aria-describedby={hasError ? 'email-error' : undefined} />
  {hasError && (
    <p id="email-error" role="alert">
      <ErrorIcon aria-hidden="true" /> Enter a valid email address.
    </p>
  )}
</>
```

Check contrast with browser devtools (Chrome/Firefox color picker shows the ratio), or a tool like the WebAIM contrast checker, during design review — not just at the end.

## 5. Screen reader testing

Automated tools catch roughly 30-50% of accessibility issues. Manual screen reader testing is necessary for the rest (logical reading order, meaningful announcements, focus behavior).

**Minimum viable manual test matrix:**
- macOS/Safari: VoiceOver (Cmd+F5)
- Windows/Chrome or Firefox: NVDA (free)
- Windows/Edge: Narrator
- Mobile: VoiceOver (iOS), TalkBack (Android)

**What to check when testing:**
- Every interactive element is announced with its role and current state (e.g. "Submit, button" not just "Submit").
- Reading order matches visual order — check this whenever CSS uses `order`, `flex-direction: row-reverse`, or grid placement that visually reorders DOM content.
- Form fields announce their label, and errors are announced when they appear.
- Dynamic content changes (toasts, loading states, validation) are announced without requiring the user to re-navigate to find them.
- Images have appropriate alt text: descriptive for meaningful images, empty `alt=""` for decorative ones — never omit `alt` entirely.

```jsx
// Don't: decorative image with no alt, or a meaningless one
<img src="divider.svg" />
<img src="chart.png" alt="image" />

// Do
<img src="divider.svg" alt="" />
<img src="chart.png" alt="Revenue grew 12% quarter over quarter" />
```

## 6. Automated testing with axe-core / jest-axe

Automated checks belong in CI so regressions are caught before merge. They complement, not replace, manual and screen reader testing.

**Setup (Jest or Vitest):**

```bash
npm install --save-dev jest-axe
# or for Vitest:
npm install --save-dev vitest-axe
```

```jsx
// Do: assert no violations in component tests
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoginForm } from './LoginForm';

expect.extend(toHaveNoViolations);

test('LoginForm has no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Testing interactive states, not just the default render:**

```jsx
// Don't: only test the happy-path initial render
test('modal is accessible', async () => {
  const { container } = render(<Modal open={false} />);
  expect(await axe(container)).toHaveNoViolations();
});

// Do: test the states that actually matter (open, error, expanded)
test('modal is accessible when open', async () => {
  const { container } = render(<Modal open={true} />);
  expect(await axe(container)).toHaveNoViolations();
});

test('form is accessible with validation errors shown', async () => {
  const { container } = render(<SignupForm errors={{ email: 'Required' }} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**End-to-end / integration checks:** for Playwright or Cypress, use `@axe-core/playwright` or `cypress-axe` to scan full rendered pages, which catches issues that unit-level component tests miss (landmark structure, heading order across a whole page, duplicate IDs from multiple component instances).

```js
// Playwright, using @axe-core/playwright
import AxeBuilder from '@axe-core/playwright';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Note: axe-core cannot detect everything — it typically finds structural and programmatic issues (missing labels, contrast, invalid ARIA, duplicate IDs) but cannot judge whether reading order makes sense or whether an announcement is actually useful. Treat a clean axe run as a floor, not a certification.

## Checklist

Run through this before shipping any new or changed interactive component:

- [ ] Used a native HTML element where one exists, instead of a `div`/`span` with ARIA
- [ ] Every interactive element has an accessible name (visible label, `aria-label`, or `aria-labelledby`)
- [ ] Every interactive element is reachable and fully operable via keyboard alone
- [ ] Focus is visible at all times (no `outline: none` without a replacement style)
- [ ] Modals/drawers trap focus while open and restore focus to the trigger on close
- [ ] Route changes and major content swaps move focus to a sensible location
- [ ] No positive `tabIndex` values used anywhere
- [ ] Color is never the only way information is conveyed
- [ ] Text and UI component contrast meet WCAG AA (4.5:1 / 3:1)
- [ ] Images have correct `alt` (descriptive or `alt=""` for decorative)
- [ ] Dynamic/async updates use an appropriate live region (`polite` by default, `alert`/assertive only for urgent errors)
- [ ] `jest-axe`/`vitest-axe` test exists for the component, covering its interactive states (open, error, expanded), not just the default render
- [ ] Manually tested with at least one screen reader (VoiceOver or NVDA) before merging significant UI changes
- [ ] Reading order was checked against visual order wherever CSS visually reorders content