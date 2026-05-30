'use client'

/**
 * features/chat/useAutoScroll.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscribes to the uiStore scrollAnchor signal and scrolls the chat container
 * to the bottom. Pauses when the user manually scrolls up.
 *
 * Usage:
 *   const { containerRef, bottomRef } = useAutoScroll()
 *   <div ref={containerRef}>
 *     <Messages />
 *     <div ref={bottomRef} />
 *   </div>
 */

import { useCallback, useEffect, useRef } from 'react'
import { useUIStore, selectScrollAnchor } from '@/stores/uiStore'

export function useAutoScroll() {
  const scrollAnchor  = useUIStore(selectScrollAnchor)
  const containerRef  = useRef<HTMLDivElement | null>(null)
  const bottomRef     = useRef<HTMLDivElement | null>(null)
  const isAutoRef     = useRef(true)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  // Fire on anchor change
  useEffect(() => {
    if (isAutoRef.current) scrollToBottom()
  }, [scrollAnchor, scrollToBottom])

  // Detect manual scroll — pause auto
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAutoRef.current = distFromBottom < 80
  }, [])

  return { containerRef, bottomRef, handleScroll, scrollToBottom }
}
