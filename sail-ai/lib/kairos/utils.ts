import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export const SEVERITY_COLOR: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH:   'bg-red-500/10    text-red-400    border-red-500/20',
  MEDIUM: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  LOW:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

export const EFFORT_COLOR: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH:   'text-red-400',
  MEDIUM: 'text-amber-400',
  LOW:    'text-emerald-400',
}
