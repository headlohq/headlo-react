import { useState, useEffect, useContext } from 'react'
import { createClient } from 'headlo'
import type { HeadloResult, CollectionRecordResponse } from 'headlo'
import { HeadloAuthContext, useSiteConfig } from './context'

const DEFAULT_API = 'https://api.headlo.com'

// Options object — preferred over positional args:
//   useRecord('posts', '<id>', { anonKey })
//   useRecord('posts', '<id>', { anonKey, getToken })
// Positional args still work for backwards compat.
export interface UseRecordOptions {
  anonKey?:   string
  apiUrl?:    string
  getToken?:  () => Promise<string | null>
  userToken?: string
}

export function useRecord(
  collectionId: string,
  recordId: string,
  optsOrAnonKey?: UseRecordOptions | string,
  apiUrl?: string,
  getToken?: () => Promise<string | null>,
  userToken?: string,
) {
  // Detect whether third arg is options-object or legacy positional string
  const isOpts = typeof optsOrAnonKey === 'object' && optsOrAnonKey !== null
  const opts: UseRecordOptions = isOpts ? optsOrAnonKey : {}
  const posAnonKey = isOpts ? undefined : (optsOrAnonKey as string | undefined)

  // Resolution priority: arg → opts → <SiteProvider> → window global → empty
  const site = useSiteConfig()
  const authCtx = useContext(HeadloAuthContext)
  const resolvedAnonKey   = posAnonKey ?? opts.anonKey ?? site.anonKey ?? (typeof window !== 'undefined' ? (window as Window & { __HEADLO_ANON_KEY__?: string }).__HEADLO_ANON_KEY__ : undefined) ?? ''
  const resolvedApiUrl    = apiUrl    ?? opts.apiUrl    ?? site.apiUrl
  const resolvedUserToken = userToken ?? opts.userToken
  const resolvedGetToken  = getToken  ?? opts.getToken  ?? authCtx?.getToken
  const key = resolvedAnonKey

  const [data,    setData]    = useState<HeadloResult<CollectionRecordResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!key) return
    setLoading(true)
    createClient(key, { apiUrl: resolvedApiUrl ?? DEFAULT_API, getToken: resolvedGetToken, userToken: resolvedUserToken })
      .collection(collectionId)
      .record(recordId)
      .then((res: HeadloResult<CollectionRecordResponse>) => { setData(res); setError(res.error) })
      .catch((e: Error) => setError(e?.message ?? 'Request failed'))
      .finally(() => setLoading(false))
  }, [collectionId, recordId, key])

  return { record: data?.record ?? null, loading, error }
}
