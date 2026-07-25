import { useEffect } from 'react'
import { usePropService } from './context'

interface DistEntry {
  runtime: string
  version: string
}

interface PropPreloadProps {
  components?: string[]
  dist?:       DistEntry[]
}

// Default reserved dimensions per PROP custom element slug. Prevents layout
// shift on first paint — the tag is inert until customElements.define() runs,
// so without these reservations it renders at zero height and the surrounding
// page shifts down when React mounts inside it.
//
// Kept here (not in the caller) so hosts get flicker-free layout by default.
// Callers can override by passing inline style props on the tag.
const DEFAULT_SIZES: Record<string, { minWidth: number; minHeight: number; display: string }> = {
  'headlo-auth-button': { minWidth: 190, minHeight: 34,  display: 'inline-block' },
  'headlo-ask-widget':  { minWidth: 300, minHeight: 260, display: 'block' },
}

// Skeleton palette — matches the app's paper/muted tones. Restyle by editing
// these constants; every PROP tag uses the same shimmer.
const SKELETON_BG_FROM = '#e8e5df'
const SKELETON_BG_TO   = '#f5f2eb'
const SKELETON_RADIUS  = 6

function buildReservedCss(slugs: string[]): string {
  const sizeRules = slugs
    .map(slug => {
      const size = DEFAULT_SIZES[slug]
      if (!size) return ''
      return `${slug} { display: ${size.display}; min-width: ${size.minWidth}px; min-height: ${size.minHeight}px; }`
    })
    .filter(Boolean)

  // :not(:defined) matches until customElements.define() registers the tag.
  // Once registered, the pseudo-class flips off and the real component paints.
  // Same rule per slug so future components auto-inherit by extending the list.
  const skeletonRules = slugs
    .filter(slug => DEFAULT_SIZES[slug])
    .map(slug =>
      `${slug}:not(:defined) { ` +
      `border-radius: ${SKELETON_RADIUS}px; ` +
      `background: linear-gradient(90deg, ${SKELETON_BG_FROM} 25%, ${SKELETON_BG_TO} 50%, ${SKELETON_BG_FROM} 75%); ` +
      `background-size: 200% 100%; ` +
      `animation: headlo-skeleton 1.4s ease-in-out infinite; ` +
      `}`
    )

  if (sizeRules.length === 0) return ''

  const keyframes = skeletonRules.length > 0
    ? '@keyframes headlo-skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }'
    : ''

  return [keyframes, ...sizeRules, ...skeletonRules].filter(Boolean).join('\n')
}

// Parse a `service:<slug>:<version>` requires entry into its parts.
// Ignores malformed entries defensively — a bad contract shouldn't crash
// the whole app's preload phase.
function parseServiceRequire(entry: string): { slug: string; version: string } | null {
  const parts = entry.split(':')
  if (parts.length !== 3 || parts[0] !== 'service') return null
  return { slug: parts[1], version: parts[2] }
}

export function PropPreload({ components = [], dist = [] }: PropPreloadProps) {
  const prop = usePropService()

  useEffect(() => {
    dist.forEach(({ runtime, version }) => prop.dist(runtime, version).preload())

    // Preload each component AND its declared required services. The contract
    // lives on prop_component.def and is returned in the def() JSON response,
    // so callers just list component slugs and every downstream service loads
    // automatically. No manual `<PropPreload services={[…]}>` needed.
    components.forEach(async slug => {
      prop.component(slug).preload()
      try {
        const res = await prop.component(slug).def()
        if (res && !('error' in res && res.error)) {
          const requires = (res as { def?: { contract?: { requires?: string[] } } }).def?.contract?.requires ?? []
          for (const entry of requires) {
            const parsed = parseServiceRequire(entry)
            if (parsed) prop.service(parsed.slug, parsed.version).preload()
          }
        }
      } catch { /* preload is best-effort; a def fetch failure shouldn't break the app */ }
    })
  }, [prop]) // eslint-disable-line react-hooks/exhaustive-deps

  // Inline the style tag in render (not useEffect) so the reserved dimensions
  // and skeleton apply on first paint, before the bundle has a chance to load.
  const reservedCss = buildReservedCss(components)
  if (!reservedCss) return null
  return <style data-headlo-preload-reserved="true">{reservedCss}</style>
}
