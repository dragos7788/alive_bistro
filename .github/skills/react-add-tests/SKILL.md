---
name: react-add-tests
description: (cog-toolkit, React) Use it when writing tests for React components, whenever writing or reviewing component tests — including when someone asks to test a component, whether a test is well-written, what to assert, how to query, or how to structure a test file.
---

# React Component Testing with RTL

Test behavior, not implementation. A test that breaks when you refactor internals without changing behavior is testing the wrong thing.

---

## **First** Detect the Test Runner

Before writing any test or config, check the project:

```bash
ls vite.config.* vitest.config.* jest.config.* package.json 2>/dev/null
grep -E '"test":|vitest|jest' package.json 2>/dev/null
```

- Found `vitest` or `vite.config.*` — use Vitest (see setup below)
- Found `jest.config.*` or `"jest"` in devDependencies — use Jest; replace `vi.fn()` with `jest.fn()` throughout
- Nothing found — scaffold Vitest (next section) - **STOP AND WAIT** — present the plan and ask: "Does this direction look right? Shall I proceed?"

---

## Setup: Vite + Vitest (default when no config exists, but **only** if the user chose previously to follow this path)

### Install

```bash
npm install -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom msw
```

### vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
```

### src/test/setup.js

```js
import '@testing-library/jest-dom'
```

### package.json scripts

```json
"scripts": {
  "test":          "vitest",
  "test:run":      "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

### MSW server setup (src/test/server.js) for mock API requests

```js
import { setupServer } from 'msw/node'
export const server = setupServer()
```

Add to `setup.js`:

```js
import { server } from './server'
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## Custom Render with Providers

Wrap providers once; import from this file instead of `@testing-library/react`.

```jsx
// src/test/test-utils.jsx
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function AllProviders({ children }) {
  return (
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const customRender = (ui, options) =>
  render(ui, { wrapper: AllProviders, ...options })

export * from '@testing-library/react'  // re-export everything
export { customRender as render }       // override render
```

> **Framework note:** Next.js uses `next-router-mock`; Remix uses `createRemixStub`. Swap `MemoryRouter` for whichever applies — the rest of this playbook is the same.

---

## Core Philosophy

1. **Test the contract** — given these props and interactions, the user sees this output.
2. **Query like a user** — role, label, visible text. Never class names or internal state.
3. **A test that breaks on refactor without behavior change is testing the wrong thing.**
4. **Coverage is a lagging indicator** — prioritize happy path, key edge cases, error states over a number.
5. **Mock at the boundary** — network and browser APIs only; never mock inside the component tree.

---

## Query Priority

Use the first variant that applies. Each step down is a smell.

| Priority | Query | When |
|---|---|---|
| 1 | `getByRole` | Buttons, headings, inputs, dialogs — anything with an ARIA role |
| 2 | `getByLabelText` | Form fields with a real `<label>` |
| 3 | `getByText` | Static display content |
| 4 | `getByPlaceholderText` | Only when no label exists |
| 5 | `getByTestId` | Last resort — non-semantic, layout-only elements |

**`getBy` vs `queryBy` vs `findBy`:**

| Variant | Use when |
|---|---|
| `getBy*` | Element must be present right now — throws if missing |
| `queryBy*` | Asserting absence — returns `null` instead of throwing |
| `findBy*` | Element appears asynchronously — returns a Promise |

**Do:**

```js
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email address')
screen.getByRole('heading', { name: 'Your cart' })
screen.getByRole('combobox', { name: 'Country' })
```

**Don't:**

```js
container.querySelector('.btn-primary')   // class name — breaks on rename
screen.getByTestId('submit-btn')          // first resort, not last
wrapper.find(MyButton)                    // component type (Enzyme habit)
```

---

## Assertions

**Do: assert the visible outcome**

```js
expect(screen.getByRole('alert')).toHaveTextContent('Saved')
expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
expect(screen.getByLabelText('Email')).toHaveValue('test@example.com')
expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
```

**Don't: pierce the component boundary**

```js
expect(component.state.isLoading).toBe(false)     // internal state
expect(mockSetState).toHaveBeenCalledWith(true)    // internal setter
expect(container.firstChild).toMatchSnapshot()     // snapshot of markup
```

Snapshot tests on markup break constantly; snapshot *values* (a formatted date string, a computed label) are fine.

---

## What to Test vs. Skip

| Test | Skip |
|---|---|
| What renders given props or fetched data | `useState` / `useReducer` internals |
| What renders after a user interaction | Component ref methods |
| Error, loading, and empty states | CSS class names or inline styles |
| Accessible semantics (roles, labels) | Whether a third-party library works correctly |
| Behavior after async operations settle | Every branch in a pure utility (unit test that separately) |

---

## Good vs. Bad Tests

### Bad: tests implementation

```jsx
// Breaks on any refactor — class rename, state move, re-structure.
// Passes even when the user-facing behavior is broken.
it('sets isSubmitting to true on click', () => {
  const { container } = render(<LoginForm />)

  fireEvent.click(container.querySelector('.btn-primary'))

  expect(wrapper.state('isSubmitting')).toBe(true)
  expect(container.querySelector('.spinner')).toBeInTheDocument()
})
```

### Good: tests behavior

```jsx
it('disables the submit button while the request is in flight', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)

  await user.type(screen.getByLabelText('Email'), 'hi@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret')
  await user.click(screen.getByRole('button', { name: /log in/i }))

  expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled()
})
```

---

## Anatomy of a Good Test (Full Example)

```jsx
// src/ContactForm.test.jsx
import { render, screen } from './test/test-utils'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from './test/server'
import ContactForm from './ContactForm'

describe('ContactForm', () => {
  const user = userEvent.setup()

  it('submits and shows confirmation', async () => {
    render(<ContactForm />)                                               // Arrange

    await user.type(screen.getByLabelText('Email'), 'hi@example.com')   // Act
    await user.type(screen.getByLabelText('Message'), 'Hello there')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByRole('status'))                            // Assert
      .toHaveTextContent('Message sent!')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('shows a field error when email is blank', async () => {
    render(<ContactForm />)

    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Email is required')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows an error banner when the API fails', async () => {
    server.use(
      http.post('/api/contact', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    )

    render(<ContactForm />)
    await user.type(screen.getByLabelText('Email'), 'hi@example.com')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })
})
```

---

## Mocking

**Rule: mock at the I/O boundary, not inside the component.**

**Network — use MSW for mock API requests**

```js
// Component runs real code; only the HTTP layer is intercepted.
server.use(
  http.get('/api/user', () => HttpResponse.json({ name: 'Ada' }))
)
```

**Don't mock internal modules**

```js
vi.mock('./hooks/useUser', () => ({ useUser: () => ({ name: 'Ada' }) }))
// Now you're testing the mock, not the component.

vi.spyOn(component, '_validate')   // reaching into internals
```

**Browser APIs**

```js
// Define before render, restore in afterEach
const mockGeolocation = { getCurrentPosition: vi.fn() }
Object.defineProperty(global.navigator, 'geolocation', { value: mockGeolocation })
```

**Timers** (debounce, polling, auto-dismiss)

```js
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('fires search after 300ms debounce', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<SearchBar />)

  await user.type(screen.getByRole('searchbox'), 'react')
  vi.advanceTimersByTime(300)

  expect(await screen.findByRole('list')).toBeInTheDocument()
})
```

---

## Async

**Do's**

- Use `findBy*` when an element appears after a fetch or state update

```js
expect(await screen.findByRole('status')).toHaveTextContent('Order placed')
```

- Use `waitFor` when an existing element changes, or to assert absence

```js
await waitFor(() =>
  expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
)

await waitFor(() =>
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
)
```

**Don'ts**

```js
await new Promise(r => setTimeout(r, 500))   // flaky, masks real failures
await act(async () => { ... })               // only needed for non-RTL events
```

If `act(...)` warnings, switch to `userEvent` (wraps `act` automatically) or use `findBy*` / `waitFor`.

---

## Coverage Priorities

```
1. Happy path          — core flow works end to end
2. Error states        — API failure, validation errors, empty state
3. Regression cases    — edge cases that have caused bugs before
4. Accessibility       — roles, labels, keyboard nav for interactive elements
5. Pure logic          - Delegate to unit tests
```

---

## Pre-Commit Smell Check

- Would this pass if I renamed a CSS class or moved state to a different hook?
- Does the test description read as a user-facing behavior, not a code path?
- Does it fail for the right reason when I break the real behavior?
- Is every mock at the I/O boundary, not inside the component tree?
- No `setTimeout`, bare `act()`, or `.querySelector('.classname')` calls?
- Does each test cover one scenario — one `it`, one behavior?