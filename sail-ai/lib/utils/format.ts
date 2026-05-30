/**
 * lib/utils/format.ts — Formatting Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure formatting helpers — no side effects, fully testable.
 */

// ── Numbers ───────────────────────────────────────────────────────────────────

/** Format bytes to human-readable string: 1024 → "1.0 KB" */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k     = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i     = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/** Compact number: 12_500 → "12.5K", 1_200_000 → "1.2M" */
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Currency: 1234.5 → "$1,234.50" */
export function formatCurrency(
  amount:   number,
  currency: string = 'USD',
  locale:   string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

// ── Strings ───────────────────────────────────────────────────────────────────

/** Truncate at word boundary: "Hello world foo" → "Hello world…" (max 11) */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  const cut = str.slice(0, maxLen)
  const last = cut.lastIndexOf(' ')
  return (last > maxLen * 0.7 ? cut.slice(0, last) : cut) + '…'
}

/** Capitalize first letter only */
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Convert camelCase or snake_case to Title Case */
export function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

/** Slugify: "Hello World!" → "hello-world" */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Dates ─────────────────────────────────────────────────────────────────────

/** Relative time: "2 minutes ago", "in 3 hours" */
export function timeAgo(dateOrMs: Date | number): string {
  const ms   = typeof dateOrMs === 'number' ? dateOrMs : dateOrMs.getTime()
  const diff = Date.now() - ms
  const abs  = Math.abs(diff)
  const future = diff < 0

  const units: [number, string][] = [
    [60_000,       'minute'],
    [3_600_000,    'hour'],
    [86_400_000,   'day'],
    [604_800_000,  'week'],
    [2_592_000_000,'month'],
    [31_536_000_000,'year'],
  ]

  if (abs < 45_000) return 'just now'

  for (let i = units.length - 1; i >= 0; i--) {
    const [divisor, unit] = units[i]
    if (abs >= divisor) {
      const n = Math.round(abs / divisor)
      const label = `${n} ${unit}${n !== 1 ? 's' : ''}`
      return future ? `in ${label}` : `${label} ago`
    }
  }
  return 'just now'
}

/** Format date: "May 30, 2026" */
export function formatDate(
  dateOrMs: Date | number,
  locale:   string = 'en-US',
  opts:     Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  const d = typeof dateOrMs === 'number' ? new Date(dateOrMs) : dateOrMs
  return new Intl.DateTimeFormat(locale, opts).format(d)
}

// ── HTML ──────────────────────────────────────────────────────────────────────

/** Escape HTML special chars — safe for insertion into innerHTML */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
