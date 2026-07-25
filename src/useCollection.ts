import { useState, useEffect, useContext } from 'react'
import { createClient } from 'headlo'
import type { HeadloResult, CollectionListResponse, ListOptions } from 'headlo'
import { HeadloAuthContext, useSiteConfig } from './context'

const DEFAULT_API = 'https://api.headlo.com'

// useCollection's options can now carry the React-specific extras
// (anonKey / apiUrl / getToken / userToken) directly, so callers can write:
//
//   useCollection('posts', { anonKey })
//   useCollection('posts', { limit: 10, anonKey, getToken })
//
// instead of the old positional form `useCollection('posts', undefined, anonKey, …)`.
// Positional args still work for backwards compat — they take precedence over opts.
export interface UseCollectionOptions extends ListOptions {
  anonKey?:   string
  apiUrl?:    string
  getToken?:  () => Promise<string | null>
  userToken?: string
}

export function useCollection(
  collectionId: string,
  opts?: UseCollectionOptions,
  anonKey?: string,
  apiUrl?: string,
  getToken?: () => Promise<string | null>,
  userToken?: string,
) {
  // Resolution priority (first non-null wins):
  //   1. Positional arg
  //   2. opts object
  //   3. <SiteProvider> context (for anonKey/apiUrl) or <HeadloAuthProvider> (for getToken)
  //   4. window.__HEADLO_ANON_KEY__ legacy global (anonKey only)
  //   5. Empty string / undefined
  const site = useSiteConfig()
  const authCtx = useContext(HeadloAuthContext)
  const resolvedAnonKey   = anonKey   ?? opts?.anonKey   ?? site.anonKey ?? (typeof window !== 'undefined' ? (window as Window & { __HEADLO_ANON_KEY__?: string }).__HEADLO_ANON_KEY__ : undefined) ?? ''
  const resolvedApiUrl    = apiUrl    ?? opts?.apiUrl    ?? site.apiUrl
  const resolvedUserToken = userToken ?? opts?.userToken
  const resolvedGetToken  = getToken  ?? opts?.getToken  ?? authCtx?.getToken
  const key = resolvedAnonKey

  const [data,        setData]        = useState<HeadloResult<CollectionListResponse> | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [cursor,      setCursor]      = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  // Stable key — excludes cursor + React-only fields so changing limit/filter resets to page 1
  // (anonKey/apiUrl/getToken/userToken are React-hook plumbing; never reach the SDK collection() call)
  const { anonKey: _ak, apiUrl: _au, getToken: _gt, userToken: _ut, ...listOpts } = opts ?? {}
  const stableKey = JSON.stringify({ ...listOpts, cursor: undefined })

  // Reset to page 1 when collection or non-cursor opts change
  useEffect(() => {
    setCursor(undefined)
    setCursorStack([])
  }, [collectionId, key, stableKey])

  useEffect(() => {
    if (!key || !collectionId) return
    setLoading(true)
    createClient(key, { apiUrl: resolvedApiUrl ?? DEFAULT_API, getToken: resolvedGetToken, userToken: resolvedUserToken })
      .collection(collectionId, { ...listOpts, cursor })
      .list()
      .then(res => { setData(res); setError(res.error) })
      .catch(e  => setError(e?.message ?? 'Request failed'))
      .finally(() => setLoading(false))
  }, [collectionId, key, cursor, stableKey])

  const count       = data?.count ?? 0
  const nextCursor  = data?.next_cursor ?? null
  const limit       = listOpts?.limit ?? 50
  const currentPage = cursorStack.length + 1
  const totalPages  = Math.ceil(count / limit) || 1

  function goNext() {
    if (!nextCursor) return
    setCursorStack(s => [...s, cursor ?? ''])
    setCursor(nextCursor)
  }

  function goPrev() {
    const p = cursorStack[cursorStack.length - 1]
    setCursorStack(s => s.slice(0, -1))
    setCursor(p || undefined)
  }

  return { records: data?.records ?? [], count, nextCursor, loading, error, goNext, goPrev, currentPage, totalPages }
}
