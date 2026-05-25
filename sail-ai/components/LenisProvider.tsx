'use client'

/**
 * LenisProvider — butter-smooth scroll inertia
 *
 * Wraps the entire app in Lenis smooth scroll.
 * duration: 1.15s with an exponential ease-out curve.
 * Integrates with framer-motion's useScroll via syncToLenis.
 */

import { useEffect, ReactNode } from 'react'
import Lenis from 'lenis'

interface Props { children: ReactNode }

export function LenisProvider({ children }: Props) {
  useEffect(() => {
    const lenis = new Lenis({
      duration:    1.15,
      easing:      (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    })

    // Tick loop
    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
