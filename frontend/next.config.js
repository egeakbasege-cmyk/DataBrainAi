/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  async rewrites() {
    return [
      { source: '/api/analyse/:path*',  destination: `${BACKEND}/api/analyse/:path*`  },
      { source: '/api/analyses/:path*', destination: `${BACKEND}/api/analyses/:path*` },
      { source: '/api/credits/:path*',  destination: `${BACKEND}/api/credits/:path*`  },
      { source: '/api/health',          destination: `${BACKEND}/api/health`           },
    ]
  },
}

module.exports = nextConfig
