import React from 'react'
import { useUserIdentity, type UserIdentityClaims, type UseUserIdentityResult } from './useUserIdentity'

export interface UserIdentityProps {
  // Optional render-prop for full custom UI
  render?:    (state: UseUserIdentityResult) => React.ReactNode
  // Optional className for the default UI wrapper
  className?: string
  // When true, hide the "via <issuer>" suffix (default: show)
  hideIssuer?: boolean
}

// Drop-in component that displays the current end-user's identity
// (email or sub) + the issuer hostname that signed their JWT.
//
// Use cases:
//   - Multi-auth demos: "signed in as jane@x.com via auth.headlo.com"
//     vs "via smashing-toucan-14.clerk.accounts.dev"
//   - Debug panels — quick visual proof which IdP is active
//   - Settings UIs — show "signed in as X" without bespoke fetch code
//
// Usage:
//   <UserIdentity />                        // default UI
//   <UserIdentity hideIssuer />             // just email/sub
//   <UserIdentity render={s => ...} />      // fully custom
//
// Requires <HeadloAuthProvider> upstream (provides getToken via context).
export function UserIdentity({ render, className, hideIssuer }: UserIdentityProps) {
  const state = useUserIdentity()
  if (render) return <>{render(state)}</>

  const { claims, loading, error } = state
  if (loading)  return <span className={className} style={s.text}>Loading identity…</span>
  if (error)    return <span className={className} style={s.error}>{error}</span>
  if (!claims)  return <span className={className} style={s.text}>Not signed in</span>

  const display = claims.email ?? (claims.sub.length > 12 ? claims.sub.slice(0, 12) + '…' : claims.sub)

  return (
    <span className={className} style={s.wrapper}>
      <span style={s.identity}>{display}</span>
      {!hideIssuer && (
        <>
          <span style={s.separator}>via</span>
          <span style={s.issuer}>{claims.issHostname}</span>
        </>
      )}
    </span>
  )
}

// Re-export the underlying types so consumers don't need a separate import
export type { UserIdentityClaims, UseUserIdentityResult }

const s: Record<string, React.CSSProperties> = {
  wrapper:   { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: '"DM Mono", monospace', color: '#1a1a18' },
  identity:  { fontWeight: 600 },
  separator: { color: '#8a8a80' },
  issuer:    { color: '#5a5a55' },
  text:      { fontSize: 12, color: '#8a8a80' },
  error:     { fontSize: 12, color: '#b91c1c' },
}
