'use client'

/**
 * ConnectorLogos — Real brand SVG icons for DataLab connectors
 * Inline SVGs, no external dependencies, no CDN requests.
 * Each icon is 28×28 viewBox, designed to be rendered at 28–36px.
 */

import type { ConnectorType } from '@/app/data-lab/page'

interface LogoProps { size?: number }

// ── Individual brand SVGs ─────────────────────────────────────

export function ShopifyLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 109 124" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M95.45 23.7c-.1-.7-.7-1.1-1.2-1.1s-9.7-.7-9.7-.7-6.5-6.3-7.1-6.9c-.6-.6-1.8-.4-2.3-.3l-3.1.9C70.35 12.1 67.05 9 63.15 9c-.1 0-.2 0-.3.01C62.05 7.7 60.55 7 58.95 7c-13.3 0-19.6 16.6-21.6 25-5.1 1.6-8.7 2.7-9.2 2.8-2.8.9-2.9.9-3.2 3.6C24.65 40.8 14 124 14 124l72 12.4 39.1-9.7S95.55 24.4 95.45 23.7zM73.55 16.9l-5 1.5c0-.4.01-.8.01-1.2 0-3.7-.5-6.7-1.4-9 3.5.5 5.8 4.3 6.39 8.7zm-10.4-7.6c.9 2.2 1.5 5.4 1.5 9.7 0 .2 0 .4-.01.6l-11.3 3.5C55.45 16.3 59.35 10 63.15 9.3zM58.85 8.1c.7 0 1.4.2 2 .7-.5.2-1 .5-1.5.8-3.5-4.5-7.5-4.5-7.5-4.5 1.2-1.1 4.3-1 7 3z" fill="#95BF47"/>
      <path d="M94.25 22.6c-.5 0-9.7-.7-9.7-.7s-6.5-6.3-7.1-6.9c-.2-.2-.5-.3-.8-.4l-4.1 84.3 39.1-9.7S95.55 24.4 95.45 23.7c-.1-.7-.7-1.1-1.2-1.1z" fill="#5E8E3E"/>
      <path d="M63.15 45.6l-4.8 14.3s-4.2-2.2-9.3-2.2c-7.5 0-7.9 4.7-7.9 5.9 0 6.5 16.9 9 16.9 24.2 0 12-7.6 19.7-17.8 19.7-12.2 0-18.5-7.6-18.5-7.6l3.3-10.8s6.4 5.5 11.8 5.5c3.5 0 5-2.8 5-4.8 0-8.4-13.9-8.8-13.9-22.7 0-11.7 8.4-23 25.3-23 6.5 0 9.9 1.5 9.9 1.5z" fill="#fff"/>
    </svg>
  )
}

export function AmazonLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#FF9900"/>
      <text x="24" y="32" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="Arial,sans-serif" fill="#000">a</text>
      <path d="M10 36 Q24 42 38 36" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M36 33 L38 36 L34 35.5" fill="#000"/>
    </svg>
  )
}

export function WooCommerceLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#7F54B3"/>
      <text x="24" y="32" textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="Arial,sans-serif" fill="#fff">W</text>
    </svg>
  )
}

export function EbayLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="26" fontSize="32" fontWeight="900" fontFamily="Arial,sans-serif">
        <tspan fill="#E53238">e</tspan>
        <tspan fill="#0064D2">b</tspan>
        <tspan fill="#F5AF02">a</tspan>
        <tspan fill="#86B817">y</tspan>
      </text>
    </svg>
  )
}

export function EtsyLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#F56400"/>
      <text x="24" y="33" textAnchor="middle" fontSize="24" fontWeight="700" fontFamily="Georgia,serif" fill="#fff">Et</text>
    </svg>
  )
}

export function TikTokShopLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#010101"/>
      <path d="M32 8v22a8 8 0 1 1-8-8v4a4 4 0 1 0 4 4V8h4z" fill="#fff"/>
      <path d="M32 8v22a8 8 0 1 1-8-8v4a4 4 0 1 0 4 4V8h4z" fill="none" stroke="#FE2C55" strokeWidth="0.5"/>
      <path d="M31 8v22a8 8 0 1 1-8-8v4a4 4 0 1 0 4 4V8h4z" fill="none" stroke="#25F4EE" strokeWidth="0.5" transform="translate(1,0)"/>
    </svg>
  )
}

export function MetaLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="url(#metaGrad)"/>
      <defs>
        <linearGradient id="metaGrad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#0867FF"/>
          <stop offset="100%" stopColor="#0341AE"/>
        </linearGradient>
      </defs>
      <text x="24" y="34" textAnchor="middle" fontSize="26" fontWeight="900" fontFamily="Arial,sans-serif" fill="#fff">f</text>
    </svg>
  )
}

export function GoogleAdsLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#fff" stroke="#E0E0E0"/>
      {/* Google G */}
      <path d="M36 24.5c0-.7-.1-1.4-.2-2H24v3.8h6.7c-.3 1.5-1.1 2.8-2.4 3.7v3h3.9C34.7 31 36 28 36 24.5z" fill="#4285F4"/>
      <path d="M24 37c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.1-4 1.1-3 0-5.6-2-6.5-4.8H13.5v3.1C15.5 34.3 19.5 37 24 37z" fill="#34A853"/>
      <path d="M17.5 27.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4v-3.1h-4c-.8 1.6-1.2 3.4-1.2 5.5s.4 3.9 1.2 5.5l4-3.1z" fill="#FBBC05"/>
      <path d="M24 16.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C29.9 13.2 27.2 12 24 12c-4.5 0-8.5 2.7-10.5 6.5l4 3.1c.9-2.8 3.5-4.8 6.5-4.8z" fill="#EA4335"/>
    </svg>
  )
}

export function AmazonPPCLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#FF9900"/>
      <text x="24" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Arial,sans-serif" fill="#000">PPC</text>
      <text x="24" y="34" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="Arial,sans-serif" fill="#000">a</text>
    </svg>
  )
}

export function TikTokAdsLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#010101"/>
      <path d="M32 8v22a8 8 0 1 1-8-8v4a4 4 0 1 0 4 4V8h4z" fill="#fff"/>
    </svg>
  )
}

export function KlaviyoLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#1C0533"/>
      <text x="24" y="32" textAnchor="middle" fontSize="18" fontWeight="800" fontFamily="Arial,sans-serif" fill="#fff">K</text>
    </svg>
  )
}

export function BookingLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#003580"/>
      <text x="24" y="32" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="Arial,sans-serif" fill="#fff">B.</text>
    </svg>
  )
}

export function AirbnbLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#FF5A5F"/>
      {/* Airbnb bélo symbol simplified */}
      <path d="M24 10c-1.5 0-2.7 1.1-2.7 2.5 0 2 2.7 5.5 2.7 5.5s2.7-3.5 2.7-5.5C26.7 11.1 25.5 10 24 10zM24 30c-5 0-9 2-9 4.5s4 4.5 9 4.5 9-2 9-4.5-4-4.5-9-4.5zM17 22c-1.5 0-2.7 1.1-2.7 2.5 0 2 2.7 5.5 2.7 5.5s2.7-3.5 2.7-5.5C19.7 23.1 18.5 22 17 22zM31 22c-1.5 0-2.7 1.1-2.7 2.5 0 2 2.7 5.5 2.7 5.5s2.7-3.5 2.7-5.5C33.7 23.1 32.5 22 31 22z" fill="#fff"/>
    </svg>
  )
}

export function ExpediaLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#FBB929"/>
      <text x="24" y="32" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="Arial,sans-serif" fill="#fff">E</text>
    </svg>
  )
}

export function TripAdvisorLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#34E0A1"/>
      {/* Two owl eyes */}
      <circle cx="17" cy="26" r="7" fill="#fff"/>
      <circle cx="31" cy="26" r="7" fill="#fff"/>
      <circle cx="17" cy="26" r="4" fill="#000"/>
      <circle cx="31" cy="26" r="4" fill="#000"/>
      <circle cx="15.5" cy="24.5" r="1.5" fill="#fff"/>
      <circle cx="29.5" cy="24.5" r="1.5" fill="#fff"/>
    </svg>
  )
}

export function StripeLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#635BFF"/>
      <path d="M22 19c0-1.7 1.4-2.3 3.7-2.3 3.3 0 7.5 1 7.5 1v-5.5s-4.2-1.2-7.5-1.2C21 11 16 13.4 16 19.3c0 11.3 15.5 9.5 15.5 14.4 0 2-1.7 2.7-4.1 2.7-3.6 0-8-1.5-8-1.5V40s4.4 1.3 8 1.3c5.2 0 10.6-1.5 10.6-7.8C38 22.1 22 24 22 19z" fill="#fff"/>
    </svg>
  )
}

export function FiverrLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#1DBF73"/>
      <text x="24" y="33" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="Arial,sans-serif" fill="#fff">f</text>
    </svg>
  )
}

export function UpworkLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#6FDA44"/>
      <text x="24" y="32" textAnchor="middle" fontSize="24" fontWeight="900" fontFamily="Arial,sans-serif" fill="#fff">U</text>
    </svg>
  )
}

export function GA4Logo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#F9AB00"/>
      <rect x="12" y="28" width="6" height="12" rx="3" fill="#E37400"/>
      <rect x="21" y="20" width="6" height="20" rx="3" fill="#fff"/>
      <rect x="30" y="12" width="6" height="28" rx="3" fill="#fff"/>
    </svg>
  )
}

export function CsvLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#217346"/>
      <rect x="8" y="16" width="32" height="2" rx="1" fill="#fff" opacity="0.7"/>
      <rect x="8" y="24" width="32" height="2" rx="1" fill="#fff" opacity="0.7"/>
      <rect x="8" y="32" width="32" height="2" rx="1" fill="#fff" opacity="0.7"/>
      <rect x="22" y="10" width="2" height="30" rx="1" fill="#fff" opacity="0.5"/>
      <text x="24" y="46" textAnchor="middle" fontSize="7" fontFamily="Arial,sans-serif" fill="#fff" fontWeight="700">CSV</text>
    </svg>
  )
}

export function ApiLogo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#374151"/>
      <path d="M14 20l-6 4 6 4M34 20l6 4-6 4" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 32l8-16" stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ── Logo map ──────────────────────────────────────────────────

type LogoComponent = (props: LogoProps) => JSX.Element

export const CONNECTOR_LOGOS: Partial<Record<string, LogoComponent>> = {
  shopify:     ShopifyLogo,
  amazon:      AmazonLogo,
  woocommerce: WooCommerceLogo,
  ebay:        EbayLogo,
  etsy:        EtsyLogo,
  tiktokshop:  TikTokShopLogo,
  'meta-ads':  MetaLogo,
  'google-ads': GoogleAdsLogo,
  'amazon-ppc': AmazonPPCLogo,
  'tiktok-ads': TikTokAdsLogo,
  klaviyo:     KlaviyoLogo,
  booking:     BookingLogo,
  airbnb:      AirbnbLogo,
  expedia:     ExpediaLogo,
  tripadvisor: TripAdvisorLogo,
  stripe:      StripeLogo,
  fiverr:      FiverrLogo,
  upwork:      UpworkLogo,
  ga4:         GA4Logo,
  csv:         CsvLogo,
  api:         ApiLogo,
}

/** Renders the brand logo for a connector id, falls back to ApiLogo */
export function ConnectorLogo({ id, size = 28 }: { id: string; size?: number }) {
  const Logo = CONNECTOR_LOGOS[id] ?? ApiLogo
  return <Logo size={size} />
}
