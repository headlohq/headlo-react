// Ambient JSX types + exported prop-type shapes for Headlo PROP custom elements.
//
// Two things this file does:
//   1. Exports the prop-type interfaces (HeadloAuthButtonProps, etc.) so
//      consumer apps can import them and augment their local JSX namespace
//      without duplicating the attribute list. Single source of truth for
//      "what attributes does this component accept."
//   2. Attempts to augment JSX itself — works for React 18 / classic transform
//      / apps that don't use `moduleResolution: "bundler"`. Does NOT reliably
//      propagate for the `jsx: "react-jsx"` + `moduleResolution: "bundler"`
//      combo (see [headlo-client-react/src/headlo-elements.d.ts] for the
//      local-augmentation pattern that IS reliable).
//
// When you ship a new custom element:
//   - Add + export its Props type here.
//   - Add it to the JSX augmentations below (helps consumers who don't need
//     the local override).
//   - Update the local override in every consumer app (e.g. headlo-client-react)
//     to add the new tag's JSX line.
//
// When you add a new attribute to an existing element:
//   - Only touch the exported Props type. Consumers using the import-based
//     augmentation pick it up automatically on next rebuild.
//
// Long-term: generate this file from `def.contract.props` — see
// headlo-prop-server/docs/types-guide.md.

// Inline `import()` type references (instead of `import type`) so the DTS
// bundler emits fully-qualified paths in the augmentation. `import type` at
// top-level gets treated as local scope and DTS extraction fails with TS4033.

export type HeadloAuthButtonProps = import('react').HTMLAttributes<HTMLElement> & {
  'prop-key'?:    string    // required at runtime — OAuth client_id
  'return-url'?:  string    // where OAuth redirects on success
  'auth-issuer'?: string    // OAuth server origin (defaults to https://auth.headlo.com)
}

export type HeadloAskWidgetProps = import('react').HTMLAttributes<HTMLElement> & {
  'prop-key'?:        string    // publishable key for service RPC auth
  'display-name'?:    string
  tagline?:           string
  'accent-color'?:    string
  placeholder?:       string
  'knowledge-scope'?: string
}

// React 18 and older read the global JSX namespace.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'headlo-auth-button': HeadloAuthButtonProps
      'headlo-ask-widget':  HeadloAskWidgetProps
    }
  }
}

// React 19+ reads React.JSX. Declaring both means the same source works
// across major versions with no conditional.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'headlo-auth-button': HeadloAuthButtonProps
      'headlo-ask-widget':  HeadloAskWidgetProps
    }
  }
}

// tsconfig `jsx: "react-jsx"` resolves IntrinsicElements via react/jsx-runtime,
// so we augment that module too. Not reliable through tsup-bundled .d.ts —
// see file header. Consumers using `moduleResolution: "bundler"` should also
// keep a local augmentation file that imports these types and adds the JSX
// entries directly.
declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'headlo-auth-button': HeadloAuthButtonProps
      'headlo-ask-widget':  HeadloAskWidgetProps
    }
  }
}
