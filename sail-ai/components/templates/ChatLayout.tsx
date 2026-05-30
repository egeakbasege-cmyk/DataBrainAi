'use client'

/**
 * components/templates/ChatLayout.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level chat page layout template.
 * Composes GuideRail + MessageList + ChatComposer into a full-height layout.
 * All data-fetching and submission logic is injected via props.
 */

import React from 'react'
import { cn }            from '@/lib/utils/cn'
import { GuideRail }     from '@/components/organisms/chat/GuideRail'
import { MessageList }   from '@/components/organisms/chat/MessageList'
import { ChatComposer }  from '@/components/organisms/chat/ChatComposer'
import { EmptyState }    from '@/components/organisms/chat/EmptyState'
import { useChatStore, selectMessages } from '@/stores/chatStore'

interface ChatLayoutProps {
  onSubmit:    () => void
  onCancel?:   () => void
  userAvatar?: string | null
  userName?:   string
  isDisabled?: boolean
  header?:     React.ReactNode
  className?:  string
}

export function ChatLayout({
  onSubmit, onCancel, userAvatar, userName, isDisabled, header, className,
}: ChatLayoutProps) {
  const messages = useChatStore(selectMessages)
  const isEmpty  = messages.length === 0

  return (
    <div
      className={cn(
        'flex h-dvh w-full overflow-hidden',
        'bg-[var(--obsidian)]',
        className
      )}
    >
      {/* Left rail — mode selector */}
      <GuideRail />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Optional header slot (Nav, breadcrumbs, etc.) */}
        {header && (
          <div className="flex-shrink-0 border-b border-white/6">
            {header}
          </div>
        )}

        {/* Messages / empty state */}
        <div className="flex-1 overflow-hidden">
          {isEmpty ? (
            <EmptyState className="h-full" />
          ) : (
            <MessageList
              userAvatar={userAvatar}
              userName={userName}
              className="h-full"
            />
          )}
        </div>

        {/* Composer — always visible at bottom */}
        <div
          className={cn(
            'flex-shrink-0 px-4 pb-4 pt-3',
            'border-t border-white/6',
            'bg-[var(--obsidian)]/90 backdrop-blur-[8px]'
          )}
        >
          <ChatComposer
            onSubmit={onSubmit}
            onCancel={onCancel}
            disabled={isDisabled}
          />
        </div>
      </div>
    </div>
  )
}
