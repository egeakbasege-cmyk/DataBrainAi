/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa'

// ── Mobile build detection ────────────────────────────────────────────────────
// Set by: MOBILE_BUILD=true npm run build:mobile
// Critical: next.config.mjs is evaluated at build time, so process.env IS available.
const isMobileBuild = process.env.MOBILE_BUILD === 'true'

if (isMobileBuild) {
  console.log('📱 MOBILE BUILD MODE — static export enabled, PWA + server headers disabled')
}

// ── Base config ───────────────────────────────────────────────────────────────
const baseConfig = {
  reactStrictMode: true,

  // ── Image Optimization ──────────────────────────────────────────────────────
  // Required for static export (Next.js image optimisation needs a server)
  images: { unoptimized: true },

  // ── Trailing Slashes ────────────────────────────────────────────────────────
  // Required for Capacitor file:// URL resolution
  trailingSlash: true,

  // ── Static Export (mobile only) ─────────────────────────────────────────────
  // IMPORTANT: output:'export' is INCOMPATIBLE with:
  //   - headers() / rewrites() / redirects()
  //   - API routes that use Node.js runtime
  //   - NextAuth server-side session
  // These are all bypassed in mobile builds (see MOBILE_BUILD_GUIDE.md)
  ...(isMobileBuild ? { output: 'export' } : {}),

  // ── Security headers (web only — headers() is not supported with output:export) ──
  ...(!isMobileBuild ? {
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
  } : {}),
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
