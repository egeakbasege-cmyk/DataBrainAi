'use client'

/**
 * components/organisms/chat/MessageList.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Scrollable message thread. Subscribes to chatStore and uiStore.
 * Auto-scrolls to bottom on new messages / streaming chunks.
 */

import React, { useCallback, useEffect, useRef } from 'react'
import { cn }                                     from '@/lib/utils/cn'
import { ChatBubble }                             from '@/components/molecules/ChatBubble'
import { SkeletonMessage }                        from '@/components/molecules/SkeletonMessage'
import { useChatStore, selectMessages }           from '@/stores/chatStore'
import { useUIStore, selectScrollAnchor }         from '@/stores/uiStore'

interface MessageListProps {
  userAvatar?: string | null
  userName?:  string
  className?: string
}

export function MessageList({ userAvatar, userName, className }: MessageListProps) {
  const messages     = useChatStore(selectMessages)
  const scrollAnchor = useUIStore(selectScrollAnchor)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'end' })
  }, [])

  // Auto-scroll on new messages & streaming
  useEffect(() => {
    if (autoScrollRef.current) scrollToBottom()
  }, [messages, scrollAnchor, scrollToBottom])

  // Detect manual scroll up — pause auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 80
  }, [])

  const isAnyStreaming = messages.some(m => m.status === 'streaming')
  const showSkeleton   = messages.length > 0 && messages[messages.length - 1].role === 'user' && !isAnyStreaming

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'flex flex-col gap-5 overflow-y-auto px-4 py-6',
        'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
        className
      )}
    >
      {messages.map(msg => (
        <ChatBubble
          key={msg.id}
          message={msg}
          userAvatar={userAvatar}
          userName={userName}
        />
      ))}

      {showSkeleton && <SkeletonMessage />}

      {/* Scroll sentinel */}
      <div ref={bottomRef} className="h-1 flex-shrink-0" aria-hidden="true" />
    </div>
  )
}
