import { useState, useEffect, useCallback } from 'react'
import { usePropService } from './context'

export interface UseComponentResult {
  loaded:  boolean
  tag:     string   // custom element tag name = slug
  error:   Error | null
  /**
   * Force a fresh fetch of the component (and its required services).
   * Appends a cache-buster query param so THIS caller bypasses its own
   * browser cache. The KV cache and other callers' immutable caches are
   * unaffected — they keep serving the current version for free.
   *
   * Use for on-demand reload from a dashboard button, dev preview, etc.
   * Ineffective as a release mechanism — customers on the un-busted URL
   * still see their cached bundle for up to a year. Bump a new version
   * to reach all consumers.
   */
  refresh: () => void
}

export interface UseComponentOptions {
  /**
   * When true, appends `?_r=<timestamp>` to bundle/def URLs on every
   * mount so first paint uses a URL the browser hasn't cached. Same
   * effect as calling the returned `refresh()` after mount, but eager.
   */
  refresh?: boolean
}

export function useComponent(slug: string, version = 'v1', options: UseComponentOptions = {}): UseComponentResult {
  const prop = usePropService()
  const [loaded, setLoaded] = useState(false)
  const [error,  setError]  = useState<Error | null>(null)
  // Bump this to force a fresh load. Included in the effect deps so the
  // effect re-runs; passed as `refresh: true` so the SDK stamps a fresh
  // cache-buster.
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoaded(false)
    setError(null)
    const shouldRefresh = options.refresh || refreshTick > 0
    prop.component(slug, version, { refresh: shouldRefresh }).load()
      .then(() => { if (!cancelled) setLoaded(true) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))) })
    return () => { cancelled = true }
  }, [prop, slug, version, refreshTick, options.refresh])

  const refresh = useCallback(() => { setRefreshTick(n => n + 1) }, [])

  return { loaded, tag: slug, error, refresh }
}
