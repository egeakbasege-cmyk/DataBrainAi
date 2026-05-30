'use client'

/**
 * hooks/useIntersection.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Observe when an element enters / exits the viewport.
 * Uses IntersectionObserver with proper cleanup.
 *
 * Usage:
 *   const { ref, isIntersecting, entry } = useIntersection({ threshold: 0.2 })
 *   <div ref={ref}>{isIntersecting && <ExpensiveComponent />}</div>
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseIntersectionOptions extends IntersectionObserverInit {
  /** Fire only once then disconnect (useful for lazy-load / reveal animations) */
  once?: boolean
}

interface UseIntersectionResult<T extends Element> {
  ref:             React.RefCallback<T>
  isIntersecting:  boolean
  entry:           IntersectionObserverEntry | null
}

export function useIntersection<T extends Element = Element>(
  options: UseIntersectionOptions = {}
): UseIntersectionResult<T> {
  const { once = false, ...observerInit } = options
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry]                   = useState<IntersectionObserverEntry | null>(null)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementRef  = useRef<T | null>(null)
  const firedRef    = useRef(false)

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [])

  const ref: React.RefCallback<T> = useCallback((node) => {
    disconnect()
    elementRef.current = node

    if (!node) return

    observerRef.current = new IntersectionObserver(([e]) => {
      setIsIntersecting(e.isIntersecting)
      setEntry(e)
      if (once && e.isIntersecting && !firedRef.current) {
        firedRef.current = true
        disconnect()
      }
    }, observerInit)

    observerRef.current.observe(node)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once, observerInit.root, observerInit.rootMargin,
      JSON.stringify(observerInit.threshold), disconnect])

  useEffect(() => () => disconnect(), [disconnect])

  return { ref, isIntersecting, entry }
}
