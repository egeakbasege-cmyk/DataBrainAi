'use client'

/**
 * CursorDot — champagne precision cursor
 *
 * A small 8px champagne dot that follows the cursor with 0.12 lerp lag,
 * giving a premium floating feel. Desktop only (hidden on touch devices).
 * Uses mix-blend-mode: multiply so it works on any background.
 *
 * A larger 32px ring trails slightly behind for depth.
 */

import { useEffect, useRef, useState } from 'react'

export function CursorDot() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    // Disable on touch devices
    if (typeof window === 'undefined' || 'ontouchstart' in window) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let rafId: number
    // Dot tracks instantly; ring lags
    let dx = 0, dy = 0   // dot current
    let rx = 0, ry = 0   // ring current
    let tx = 0, ty = 0   // target

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!active) setActive(true)
    }

    const tick = () => {
      dx += (tx - dx) * 0.2
      dy += (ty - dy) * 0.2
      rx += (tx - rx) * 0.08
      ry += (ty - ry) * 0.08

      if (dotRef.current)  dotRef.current.style.transform  = `translate(${dx}px, ${dy}px)`
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`

      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [active])

  if (!active) return null

  return (
    <>
      {/* Trailing ring */}
      <div
        ref={ringRef}
        style={{
          position:      'fixed',
          top:           -16,
          left:          -16,
          width:         32,
          height:        32,
          borderRadius:  '50%',
          border:        '1px solid rgba(201,169,110,0.35)',
          pointerEvents: 'none',
          zIndex:        9998,
          willChange:    'transform',
          mixBlendMode:  'multiply',
        }}
      />
      {/* Sharp dot */}
      <div
        ref={dotRef}
        style={{
          position:      'fixed',
          top:           -4,
          left:          -4,
          width:         8,
          height:        8,
          borderRadius:  '50%',
          background:    '#C9A96E',
          opacity:       0.75,
          pointerEvents: 'none',
          zIndex:        9999,
          willChange:    'transform',
          mixBlendMode:  'multiply',
        }}
      />
    </>
  )
}
