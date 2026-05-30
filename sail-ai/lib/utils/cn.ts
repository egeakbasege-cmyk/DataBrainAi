/**
 * lib/utils/cn.ts — Class Name Merger
 * ─────────────────────────────────────────────────────────────────────────────
 * Merges Tailwind class strings with conflict resolution.
 * Drop-in replacement for the common clsx + twMerge pattern.
 *
 * Usage:
 *   cn('px-4 py-2', condition && 'bg-gold', 'bg-mint')
 *   // → 'px-4 py-2 bg-mint'  (bg-gold overridden by bg-mint)
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge }               from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
