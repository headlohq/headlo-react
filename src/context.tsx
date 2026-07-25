import React from 'react'
import { createService } from 'headlo'
import type { PropService } from 'headlo'

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

// ---------------------------------------------------------------------------
// PropServer — sets publishable key + server URLs for all useProp calls below
// ---------------------------------------------------------------------------

export interface PropServerConfig {
  publishableKey?: string
  url?:            string  // component server base URL
  serviceUrl?:     string  // service stub base URL
}

interface PropServerCtx extends PropServerConfig {
  prop: PropService
}

const PropServerContext = React.createContext<PropServerCtx>({
  prop: createService(),
})

export function PropServer({
  publishableKey,
  url,
  serviceUrl,
  children,
}: PropServerConfig & { children: React.ReactNode }) {
  const prop  = React.useMemo(() => createService({ publishableKey, url }), [publishableKey, url])
  const value = React.useMemo(() => ({ publishableKey, url, serviceUrl, prop }), [publishableKey, url, serviceUrl, prop])
  return <PropServerContext.Provider value={value}>{children}</PropServerContext.Provider>
}

export function usePropServer(): PropServerConfig {
  return React.useContext(PropServerContext)
}

export function usePropService(): PropService {
  return React.useContext(PropServerContext).prop
}

// ---------------------------------------------------------------------------
// SiteProvider — supplies anonKey + apiUrl for data hooks (useCollection,
// useRecord, useList). Lets callers write `useCollection('posts')` without
// passing an anonKey arg on every call. Companion to PropServer (which does
// the equivalent for publishableKey + apiUrl on PROP hooks).
// ---------------------------------------------------------------------------

export interface SiteConfig {
  anonKey?: string
  apiUrl?:  string
}

const SiteContext = React.createContext<SiteConfig>({})

export function SiteProvider({
  anonKey,
  apiUrl,
  children,
}: SiteConfig & { children: React.ReactNode }) {
  const value = React.useMemo(() => ({ anonKey, apiUrl }), [anonKey, apiUrl])
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSiteConfig(): SiteConfig {
  return React.useContext(SiteContext)
}
