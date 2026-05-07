import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

type Variant = 'primary' | 'danger' | 'ghost' | 'gold'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-sail-accent text-sail-900 hover:bg-cyan-300 shadow-glow-cyan',
  danger:  'bg-sail-danger text-white hover:bg-red-400',
  ghost:   'bg-transparent border border-sail-700 text-sail-muted hover:border-sail-accent hover:text-white',
  gold:    'bg-sail-gold text-sail-900 hover:bg-amber-300 shadow-glow-gold',
}

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...rest }, ref) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: isDisabled ? 1 : 0.96 }}
        whileHover={{ scale: isDisabled ? 1 : 1.02 }}
        transition={{ duration: 0.1 }}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
          'transition-colors duration-150 select-none cursor-pointer',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          VARIANT[variant],
          SIZE[size],
          className,
        ].join(' ')}
        {...(rest as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'
