import React from 'react'
import { createClient, type HeadloClient } from 'headlo'
import { useSiteConfig } from './context'

// Zero-arg convenience: builds a HeadloClient from whatever <SiteProvider>
// exposed (anonKey + apiUrl). Memoized so the returned instance is stable
// across renders as long as those two values don't change.
//
// Usage in a component:
//   const client = useHeadloClient()
//   const { entries } = useCmsComponents(client)
//
// Prefer this over hand-rolling `createClient(anonKey, { apiUrl })` at the
// call site — same result, fewer imports, and dev-mode apiUrl overrides from
// SiteProvider still flow through (`createClient(anonKey)` alone silently
// falls back to the prod URL).
//
// If you need to override either value, use createClient directly.
export function useHeadloClient(): HeadloClient {
  const { anonKey, apiUrl } = useSiteConfig()
  return React.useMemo(
    () => createClient(anonKey, { apiUrl }),
    [anonKey, apiUrl],
  )
}
