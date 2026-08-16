import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor Configuration — Sail AI
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE: remote-URL shell (a.k.a. "hosted web app").
 *
 * Why not a static export?
 *   The previous config used `webDir: 'out'` and relied on
 *   `MOBILE_BUILD=true next build` producing a static export. That can never
 *   work for this app: `output: 'export'` is fundamentally incompatible with
 *   NextAuth (`/api/auth/[...nextauth]`), every Node-runtime API route, and
 *   server-side sessions. The mobile build failed with:
 *     Error: Page "/api/auth/[...nextauth]" is missing "generateStaticParams()"
 *
 *   So the native app instead wraps the deployed Next.js server. Benefits:
 *     • Auth, API routes, SSR and streaming all keep working unchanged.
 *     • Shipping a web deploy instantly updates the app (no store review).
 *     • One codebase, no divergent mobile API surface.
 *
 * Configure the target with MOBILE_REMOTE_URL (falls back to the production
 * deployment). For live-reload against a local dev server, set DEV_SERVER_URL.
 */

const DEFAULT_REMOTE_URL = 'https://data-brain-ai-sqqu.vercel.app'

const remoteUrl = (
  process.env.DEV_SERVER_URL ??
  process.env.MOBILE_REMOTE_URL ??
  DEFAULT_REMOTE_URL
).replace(/\/$/, '')

const remoteHost = remoteUrl.replace(/^https?:\/\//, '')
const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.)/.test(remoteUrl)

const config: CapacitorConfig = {
  appId:   'com.databrain.sailai',
  appName: 'Sail AI',

  // Still required by the CLI. `mobile-shell/` holds a dependency-free offline
  // fallback page shown when the device cannot reach the remote server.
  // (It is deliberately NOT `public/` — Next.js would then serve the shell at
  // /index.html and it would also bloat every web deploy.)
  webDir: 'mobile-shell',

  server: {
    androidScheme: 'https',
    iosScheme:     'https',
    url:           remoteUrl,
    // cleartext is only needed when pointing at a plain-http dev server.
    cleartext:     isLocalDev,
    // Domains the WebView is allowed to navigate to in-app. OAuth providers
    // must be listed or Google sign-in dead-ends on a blank screen.
    allowNavigation: [
      remoteHost,
      'accounts.google.com',
      '*.google.com',
      'checkout.stripe.com',
      '*.stripe.com',
      '*.lemonsqueezy.com',
    ],
  },

  ios: {
    // CRITICAL: without 'always', env(safe-area-inset-*) returns 0 on all iOS.
    // viewport-fit:cover in layout.tsx is only effective when this is set.
    contentInset: 'always',

    // NOTE: `limitsNavigationsToAppBoundDomains` MUST stay false for a remote
    // URL shell — when true, WKWebView refuses to load any origin that is not
    // declared in WKAppBoundDomains, which breaks both the app itself and the
    // OAuth redirect chain.
    limitsNavigationsToAppBoundDomains: false,

    // Prevents rubber-band scrolling on the root WebView (each scrollable
    // component should handle its own scroll)
    scrollEnabled: false,
  },

  android: {
    // Block mixed content (http inside https context) — except when explicitly
    // targeting a local cleartext dev server.
    allowMixedContent: isLocalDev,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:       2000,
      launchAutoHide:           true,
      backgroundColor:          '#FAFAF8',   // --canvas: the app is light mode
      androidSplashResourceName: 'splash',
      androidScaleType:          'CENTER_CROP',
      iosSpinnerStyle:           'small',
      showSpinner:               false,
      splashFullScreen:          true,
      splashImmersive:           true,
    },
  },
}

export default config
