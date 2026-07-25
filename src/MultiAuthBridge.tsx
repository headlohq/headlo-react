import React from 'react'
import { HeadloAuthProvider } from './context'

// One auth source the bridge can pick from. Caller adapts each provider
// (headlo-auth, Clerk, Auth0, Cognito, etc.) into this shape.
export interface AuthSource {
  name:       string                            // 'headlo' | 'clerk' | etc. — for debug/logging
  isLoaded:   boolean
  isSignedIn: boolean
  getToken:   () => Promise<string | null>
}

export interface MultiAuthBridgeProps {
  // Priority-ordered. First source where isSignedIn=true wins.
  sources:  AuthSource[]
  children: React.ReactNode
}

// Generic multi-auth bridge. Picks the first signed-in source from `sources`
// (priority order) and plumbs that source's getToken into HeadloAuthContext,
// so downstream data hooks (useCollection, useRecord, useList) automatically
// attach the right Bearer JWT — whichever provider is currently active.
//
// Usage:
//   function AppBridge({ children }) {
//     const headlo = useHeadloAuth()              // from 'headlo-auth'
//     const clerk  = useClerkAuth()               // from '@clerk/clerk-react'
//     return (
//       <MultiAuthBridge sources={[
//         { name: 'headlo', isLoaded: headlo.isLoaded, isSignedIn: headlo.isSignedIn, getToken: () => headlo.getToken() },
//         { name: 'clerk',  isLoaded: clerk.isLoaded,  isSignedIn: clerk.isSignedIn,  getToken: async () => clerk.getToken() },
//       ]}>
//         {children}
//       </MultiAuthBridge>
//     )
//   }
//
// Then anywhere downstream:
//   const { records } = useCollection('posts')   // token from whichever source is signed in
//
// Why generic vs provider-specific:
//   - Doesn't pull @clerk (or any auth SDK) as a peer dependency
//   - Works for any combination of IdPs
//   - Priority + plumbing logic centralized in one SDK component
export function MultiAuthBridge({ sources, children }: MultiAuthBridgeProps) {
  // Use a ref to avoid the getToken reference churning on every render.
  // Without this, HeadloAuthProvider's context value would change every render
  // and force consumers of useCollection / useRecord / useList to re-run effects.
  const sourcesRef = React.useRef(sources)
  sourcesRef.current = sources

  const getToken = React.useCallback(async (): Promise<string | null> => {
    for (const source of sourcesRef.current) {
      if (source.isSignedIn) return source.getToken()
    }
    return null
  }, [])

  return <HeadloAuthProvider getToken={getToken}>{children}</HeadloAuthProvider>
}
