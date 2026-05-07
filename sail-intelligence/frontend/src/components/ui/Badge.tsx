import type { ReactNode } from 'react'

type BadgeVariant = 'cyan' | 'gold' | 'green' | 'red' | 'muted'

const STYLES: Record<BadgeVariant, string> = {
  cyan:  'bg-cyan-900/40 text-sail-accent  border border-sail-accent/30',
  gold:  'bg-amber-900/40 text-sail-gold   border border-sail-gold/30',
  green: 'bg-emerald-900/40 text-sail-success border border-sail-success/30',
  red:   'bg-red-900/40   text-sail-danger  border border-sail-danger/30',
  muted: 'bg-sail-700/60  text-sail-muted   border border-sail-700',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'muted', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-semibold tracking-wide',
        STYLES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
