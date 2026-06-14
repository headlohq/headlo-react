import React from 'react'

interface HeadloAuthCtx {
  getToken: () => Promise<string | null>
}

export const HeadloAuthContext = React.createContext<HeadloAuthCtx | null>(null)

export function HeadloAuthProvider({
  getToken,
  children,
}: {
  getToken: () => Promise<string | null>
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ getToken }), [getToken])
  return <HeadloAuthContext.Provider value={value}>{children}</HeadloAuthContext.Provider>
}
