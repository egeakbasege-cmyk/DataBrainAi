import { clsx, type ClassValue } from 'clsx'
import { twMerge }               from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function timeAgo(date: string | Date): string {
  const d     = typeof date === 'string' ? new Date(date) : date
  const diff  = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function truncate(str: string, max = 80): string {
  return str.length > max ? `${str.slice(0, max)}…` : str
}

export const SEVERITY_COLOR: Record<string, string> = {
  HIGH:   'text-red-400 bg-red-400/10 border-red-400/20',
  MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  LOW:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

export const EFFORT_COLOR: Record<string, string> = {
  HIGH:   'text-red-400',
  MEDIUM: 'text-amber-400',
  LOW:    'text-emerald-400',
}

export const PLATFORM_COLOR: Record<string, string> = {
  SHOPIFY: 'text-emerald-400 bg-emerald-400/10',
  AMAZON:  'text-amber-400 bg-amber-400/10',
}

export const STATUS_COLOR: Record<string, string> = {
  PENDING:   'text-zinc-400',
  SCRAPING:  'text-blue-400',
  ANALYZING: 'text-violet-400',
  COMPLETE:  'text-emerald-400',
  ERROR:     'text-red-400',
}
