'use client'

/**
 * AetherisShell
 *
 * The luxury dark terminal layout wrapper.  Apply to any page that should
 * render in full Aetheris dark mode (e.g. the /chat route).
 *
 * Design language:
 *  - Obsidian background (--ae-bg: #080810)
 *  - Chrome hairline across the top — one pixel, no more
 *  - Swiss grid: max-w container, 64px gutter rhythm
 *  - No rounded corners on structural elements
 *  - Status bar anchored to top-right — never a modal or popover
 */

import { motion }         from 'framer-motion'
import { AgentStatusBar } from './AgentStatusBar'

interface AetherisShellProps {
  children:       React.ReactNode
  /** Show the top agent/density status bar. Default: true */
  showStatusBar?: boolean
  /** Extra classes on the inner content wrapper */
  className?:     string
}

export function AetherisShell({
  children,
  showStatusBar = true,
  className = '',
}: AetherisShellProps) {
  return (
    <div className="aetheris" data-theme="aetheris" style={{ minHeight: '100dvh' }}>
      {/* Chrome hairline — one pixel, the only decoration */}
      <div className="ae-chrome-bar" />

      {/* Status bar — agent mode + cognitive load + drift indicator */}
      {showStatusBar && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position:       'fixed',
            top:            '1px',   // just below the chrome hairline
            right:          0,
            zIndex:         50,
            padding:        '6px 16px',
          }}
        >
          <AgentStatusBar />
        </motion.div>
      )}

      {/* Content */}
      <main className={className}>
        {children}
      </main>
    </div>
  )
}
