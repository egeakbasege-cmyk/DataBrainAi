'use client'

/**
 * hooks/useClickOutside.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fire a callback when the user clicks / taps outside a given element.
 * Handles both mouse and touch events; respects `enabled` flag.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null)
 *   useClickOutside(ref, () => setOpen(false))
 *
 *   // Conditionally active:
 *   useClickOutside(ref, () => setOpen(false), isOpen)
 */

import { useEffect } from 'react'

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref:      React.RefObject<T | null>,
  callback: (event: MouseEvent | TouchEvent) => void,
  enabled:  boolean = true
): void {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback(e)
      }
    }

    // Capture phase so nested portals don't stop propagation
    document.addEventListener('mousedown',  handler, true)
    document.addEventListener('touchstart', handler, true)

    return () => {
      document.removeEventListener('mousedown',  handler, true)
      document.removeEventListener('touchstart', handler, true)
    }
  }, [ref, callback, enabled])
}
