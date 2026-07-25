import { useState, useEffect, useContext } from 'react'
import { HeadloAuthContext } from './context'

// Decode a JWT's payload (the middle base64-url segment) without signature
// verification. Safe for client-side display since the signature is already
// verified by whoever issued the token; we're just reading what's there.
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const [, payload] = jwt.split('.')
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export interface UserIdentityClaims {
  sub:         string
  iss:         string                      // full issuer URL
  issHostname: string                      // just the hostname (for display)
  email:       string | null
  name:        string | null
  raw:         Record<string, unknown>     // all JWT claims, for advanced use
}

export interface UseUserIdentityResult {
  claims:  UserIdentityClaims | null
  loading: boolean
  error:   string | null
}

// Reads the current Bearer JWT from HeadloAuthContext (provided by
// <HeadloAuthProvider>), decodes the payload, and returns typed claims.
//
// Returns claims:null when no token is present (anonymous visitor).
// Re-reads the token whenever the context's getToken reference changes.
export function useUserIdentity(): UseUserIdentityResult {
  const authCtx = useContext(HeadloAuthContext)
  const [claims,  setClaims]  = useState<UserIdentityClaims | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!authCtx?.getToken) {
      setClaims(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    authCtx.getToken()
      .then(token => {
        if (cancelled) return
        if (!token) { setClaims(null); setLoading(false); return }
        const payload = decodeJwtPayload(token)
        if (!payload) { setError('Invalid JWT'); setLoading(false); return }
        const iss = (payload['iss'] as string) ?? ''
        let issHostname = iss
        try { issHostname = new URL(iss).hostname } catch { /* keep raw */ }
        setClaims({
          sub:         (payload['sub'] as string) ?? '',
          iss,
          issHostname,
          email:       (payload['email'] as string) ?? null,
          name:        (payload['name'] as string) ?? null,
          raw:         payload,
        })
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError((e as Error)?.message ?? 'getToken failed')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [authCtx])

  return { claims, loading, error }
}
