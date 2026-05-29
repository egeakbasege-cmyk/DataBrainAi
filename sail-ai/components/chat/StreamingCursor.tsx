'use client'

import { motion } from 'framer-motion'

/**
 * StreamingCursor
 * Blinking I-beam appended after live-streaming text.
 * Fades out when streaming=false.
 */
export function StreamingCursor({ streaming }: { streaming: boolean }) {
  if (!streaming) return null
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      style={{
        display:         'inline-block',
        width:           2,
        height:          '1em',
        background:      '#14B8A6',
        borderRadius:    1,
        marginLeft:      3,
        verticalAlign:   'text-bottom',
        flexShrink:      0,
      }}
      aria-hidden="true"
    />
  )
}
