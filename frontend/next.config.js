/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

const nextConfig = {
  reactStrictMode: true,

  // ── API proxy ────────────────────────────────────────────────────
  // /api/auth/** is handled by NextAuth locally — must NOT be proxied.
  // All other /api/** paths are forwarded to the FastAPI backend.
  async rewrites() {
    return [
      { source: '/api/analyse/:path*',  destination: `${BACKEND}/api/analyse/:path*`  },
      { source: '/api/analyses/:path*', destination: `${BACKEND}/api/analyses/:path*` },
      { source: '/api/credits/:path*',  destination: `${BACKEND}/api/credits/:path*`  },
      { source: '/api/health',          destination: `${BACKEND}/api/health`           },
    ]
  },

  // ── Security headers ─────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "connect-src 'self' https://api.stripe.com",
              "img-src 'self' data: https:",
              "worker-src blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // ── Performance ──────────────────────────────────────────────────
  compress:        true,
  poweredByHeader: false,
  swcMinify:       true,

  // standalone output is only for Docker / Fly.io deployments
  // output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
