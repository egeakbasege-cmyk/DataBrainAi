/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa'

// ── Mobile build detection ────────────────────────────────────────────────────
// The mobile app is a Capacitor *remote-URL shell* that loads the deployed
// Next.js server (see capacitor.config.ts). It is NOT a static export.
//
// `output: 'export'` used to be enabled here and made `npm run build:mobile`
// fail outright, because static export cannot coexist with NextAuth's
// /api/auth/[...nextauth] catch-all route or any Node-runtime API route:
//   Error: Page "/api/auth/[...nextauth]" is missing "generateStaticParams()"
//
// MOBILE_BUILD now only disables the service worker (which conflicts with the
// Capacitor WebView scope); the build otherwise stays a normal server build.
const isMobileBuild = process.env.MOBILE_BUILD === 'true'

if (isMobileBuild) {
  console.log('📱 MOBILE BUILD MODE — PWA service worker disabled (Capacitor shell)')
}

// ── Base config ───────────────────────────────────────────────────────────────
const baseConfig = {
  reactStrictMode: true,

  // ── Server-only packages ────────────────────────────────────────────────────
  // Keeps Node.js-only packages (bcryptjs depends on the built-in 'crypto'
  // module) out of the browser bundle. Without this, Next.js tries to polyfill
  // 'crypto' for the client and fails with "Module not found: Can't resolve
  // 'crypto'".
  //
  // Next.js 14.2 accepts both the legacy experimental key and the new top-level
  // key — include both to satisfy whichever path the bundler resolves first.
  serverExternalPackages: ['bcryptjs'],
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },

  // ── Webpack crypto fallback ─────────────────────────────────────────────────
  // Belt-and-suspenders: even if a client chunk somehow imports a path that
  // transitively reaches bcryptjs, tell webpack to substitute an empty module
  // for the Node.js built-in 'crypto' instead of erroring.
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      }
    }
    return config
  },

  // ── Image Optimization ──────────────────────────────────────────────────────
  // Required for static export (Next.js image optimisation needs a server)
  images: { unoptimized: true },

  // ── Trailing Slashes ────────────────────────────────────────────────────────
  // Required for Capacitor file:// URL resolution
  trailingSlash: true,

  // ── Static Export ───────────────────────────────────────────────────────────
  // Intentionally NOT enabled. `output: 'export'` breaks NextAuth and every
  // Node-runtime API route; the mobile app uses a remote-URL Capacitor shell
  // instead. See capacitor.config.ts and MOBILE_BUILD_GUIDE.md.

  // ── Security headers ────────────────────────────────────────────────────────
  async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options',  value: 'nosniff' },
            { key: 'X-Frame-Options',         value: 'DENY' },
            { key: 'X-XSS-Protection',        value: '1; mode=block' },
            { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
            // NOTE: Do NOT block camera/microphone here — moved to per-route headers
            // to allow Capacitor mobile builds to use native plugins.
            { key: 'Permissions-Policy',       value: 'geolocation=()' },
          ],
        },
      ]
    },
}

// ── PWA config ────────────────────────────────────────────────────────────────
// IMPORTANT: PWA service worker must be DISABLED for Capacitor mobile builds.
// Reasons:
//   1. Capacitor serves files via capacitor:// or file:// — SW scope conflicts.
//   2. Service workers intercept fetch() calls, breaking direct Railway backend calls.
//   3. SW registration fails in WKWebView with strict same-origin policy.
//
// next-pwa v5 (legacy) uses `disable` flag — true in mobile AND development.
const pwaConfig = {
  dest:        'public',
  register:    true,
  skipWaiting: true,
  disable:     isMobileBuild || process.env.NODE_ENV === 'development',
}

export default withPWA(pwaConfig)(baseConfig)
