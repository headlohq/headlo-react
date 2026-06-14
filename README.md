# headlo-react

React hooks for [Headlo](https://www.headlo.com). Requires `headlo`.

## Install

```bash
npm install headlo headlo-react
```

---

## Authentication

Headlo supports user-scoped queries — records owned by the currently logged-in visitor. There are two ways to provide a JWT token.

### Option A — `HeadloAuthProvider` (recommended)

Wrap your app (or the subtree that needs auth) with `HeadloAuthProvider`. Every `useCollection` and `useRecord` call inside it will automatically pick up the token without you passing `getToken` to each hook.

```tsx
import { HeadloAuthProvider } from 'headlo-react'
import { useAuth } from '@clerk/clerk-react' // or any auth provider

function App() {
  const { getToken } = useAuth()

  return (
    <HeadloAuthProvider getToken={() => getToken()}>
      <YourApp />
    </HeadloAuthProvider>
  )
}
```

`getToken` must return `Promise<string | null>`. The provider memoizes it so hooks don't re-run on every render.

### Option B — per-hook `getToken`

Pass `getToken` directly to each hook. Useful when different parts of your app use different auth contexts.

```tsx
const { records } = useCollection('posts', { limit: 10 }, ANON_KEY, undefined, () => myAuth.getToken())
```

If both are present, the explicit prop takes precedence over the context.

---

## useCollection

Fetches a collection and manages pagination state. Returns navigation functions so you never touch the cursor directly.

```tsx
import { useCollection } from 'headlo-react'

function Blog() {
  const [pageSize, setPageSize] = useState(10)

  const {
    records,
    count,
    loading,
    error,
    goNext,
    goPrev,
    currentPage,
    totalPages,
  } = useCollection('posts', { limit: pageSize }, ANON_KEY)

  if (loading) return <p>Loading...</p>
  if (error)   return <p>Error: {error}</p>

  return (
    <>
      {records.map(r => (
        <div key={r.collection_record_id}>{r.title}</div>
      ))}

      <button onClick={goPrev} disabled={currentPage === 1}>Prev</button>
      <span>Page {currentPage} of {totalPages}</span>
      <button onClick={goNext} disabled={currentPage === totalPages}>Next</button>
    </>
  )
}
```

When wrapped in `HeadloAuthProvider`, the `getToken` param can be omitted — the hook reads it from context automatically.

### Props

| Param | Type | Description |
|---|---|---|
| `collectionId` | `string` | Collection ID |
| `opts` | `ListOptions` | `limit`, `sort`, `dir`, `filter`, `record_ids` |
| `anonKey` | `string` | Your site anon key |
| `getToken` | `() => Promise<string \| null>` | Optional — overrides `HeadloAuthProvider` if both are present |

### Returns

| Key | Type | Description |
|---|---|---|
| `records` | `Record<string, unknown>[]` | Flat records for the current page |
| `count` | `number` | Total matching records |
| `loading` | `boolean` | |
| `error` | `string \| null` | |
| `goNext` | `() => void` | Advance to next page |
| `goPrev` | `() => void` | Go back to previous page |
| `currentPage` | `number` | Current page number (1-based) |
| `totalPages` | `number` | Total pages based on count and limit |

Changing `limit` or any other option automatically resets to page 1.

---

## useList

For when you want to use the `createClient` fluent builder but still get managed pagination. Pass `.pagination()` from the builder and a `{ limit }` option.

```tsx
import { useList } from 'headlo-react'
import { createClient } from 'headlo'

const client = createClient(ANON_KEY)

function Blog() {
  const [pageSize, setPageSize] = useState(10)

  const { records, count, loading, error, goNext, goPrev, currentPage, totalPages } = useList(
    client.collection('posts').sort('created_at', 'desc').pagination(),
    { limit: pageSize },
  )
}
```

`.pagination()` returns a function `(cursor, limit) => Promise<...>` that `useList` calls internally — `limit` and `cursor` are always controlled by the hook. Filter and sort are pre-configured on the builder before calling `.pagination()`.

You can also pass any async function that matches the signature:

```ts
useList(
  async (cursor, limit) => myApi.getPosts({ cursor, limit }),
  { limit: pageSize },
)
```

---

## useRecord

Fetch a single record by ID. Also reads from `HeadloAuthProvider` context when no `getToken` is passed explicitly.

```tsx
import { useRecord } from 'headlo-react'

const { record, loading, error } = useRecord('posts', recordId, ANON_KEY)
```

---

## Routing

Pages in Headlo are the routing mechanism. Each page has a `page_id` that maps to a URL path (`/about`, `/products`, `/checkout/success`). The dashboard resolves which page to render based on the URL.

Every page component receives three routing props automatically:

| Prop | Type | Description |
|---|---|---|
| `query` | `Record<string, string>` | Parsed query string params |
| `path` | `string` | Extra path segments after the page's own path |
| `params` | `string[]` | `path` split by `/` into an array |

### Static routes

A page with `page_id = /about` renders at `/about`. Exact match.

### Dynamic routes — extra path segments

A page with `page_id = /products` catches any URL that starts with `/products/`:

```
/products/detail/abc-123  →  path = "detail/abc-123", params = ["detail", "abc-123"]
/products/checkout/done   →  path = "checkout/done",  params = ["checkout", "done"]
```

```js
function Page({ components, params }) {
  const section = params[0]  // "detail"
  const id      = params[1]  // "abc-123"
}
```

If both `/products` and `/products/detail` exist as pages, the most specific match wins.

### Query string

```
/checkout/success?session_id=cs_test_xxx
```

```js
function Page({ components, query }) {
  const sessionId = query.session_id  // "cs_test_xxx"
}
```

Useful for Stripe's `success_url` — pass `?session_id={CHECKOUT_SESSION_ID}` and Stripe fills it in automatically.

### Stripe checkout example

```js
function Page({ components, query, params }) {
  const status    = params[0]         // "success" or "canceled"
  const sessionId = query.session_id  // Stripe session ID (success only)

  if (status === 'success') return <div>Order confirmed! Session: {sessionId}</div>
  if (status === 'canceled') return <div>Order canceled.</div>
}
```

With success URL: `https://yoursite.com/checkout/success?session_id={CHECKOUT_SESSION_ID}`
And cancel URL: `https://yoursite.com/checkout/canceled`

---

## useComponents

Load and compile the component registry for a site. Pass the client directly — the hook configures the component sandbox automatically.

```tsx
import { createClient } from 'headlo'
import { useComponents } from 'headlo-react'

const client = createClient(ANON_KEY)

function App() {
  const { entries, loading, error } = useComponents(client)

  const card = entries.find(e => e.component_id === 'card_grid')
  if (!card) return null

  return <card.Component records={records} options={card.templateOptions} />
}
```

## License

[Elastic License 2.0](./LICENSE) — © Headlo Team

Source available. Free for internal use. You may not offer this software as a competing hosted or managed service. See [LICENSE](./LICENSE) for full terms.

Built by [Headlo](https://www.headlo.com).
