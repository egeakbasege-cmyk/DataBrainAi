'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User }     from 'lucide-react'
import type { KairosChatMessage }       from '@/lib/kairos/types'

interface Props { analysisId: string; targetName: string }

const SUGGESTIONS = [
  'What is their biggest competitive weakness?',
  'How can I launch a better version of their top product?',
  'Write me a product listing that beats theirs.',
  'What pricing strategy should I use to undercut them?',
  'What customer pain points can I solve that they miss?',
]

export function KairosChatInterface({ analysisId, targetName }: Props) {
  const [messages, setMessages] = useState<KairosChatMessage[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', content: text.trim() }])
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/kairos/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analysisId, message: text.trim(), history: messages }),
      })
      if (!res.ok || !res.body) throw new Error('Chat request failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   full    = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: full }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="ae-app-card flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--ae-border)] flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[var(--ae-chrome-wash)] border border-[var(--ae-chrome-rule)]">
          <Bot size={14} className="text-[var(--ae-chrome-dim)]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--ae-text)]">KAIROS Copilot</p>
          <p className="text-xs text-[var(--ae-text-muted)]">Ask anything about {targetName}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ae-velocity-pos)] animate-pulse" />
          <span className="text-xs text-[var(--ae-velocity-pos)]">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--ae-text-muted)] text-center">
              Intelligence loaded. Ask KAIROS anything about this competitor.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-[var(--ae-bg-raised)] hover:bg-[var(--ae-bg-elevated)] border border-[var(--ae-border)] hover:border-[var(--ae-border-mid)] text-[var(--ae-text-dim)] hover:text-[var(--ae-text)] transition-all duration-150">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="p-1 rounded-lg bg-[var(--ae-chrome-wash)] border border-[var(--ae-chrome-rule)] shrink-0 self-start mt-0.5">
                  <Bot size={12} className="text-[var(--ae-chrome-dim)]" />
                </div>
              )}
              <div className={`max-w-[85%] text-xs rounded-xl px-3 py-2.5 leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[var(--ae-gold)] rounded-br-sm'
                  : 'bg-[var(--ae-bg-raised)] border border-[var(--ae-border)] text-[var(--ae-text)] rounded-bl-sm'
              }`}
              style={msg.role === 'user' ? { color: '#080810' } : undefined}
              >
                {msg.content || (loading && i === messages.length - 1
                  ? <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Thinking…</span>
                  : ''
                )}
              </div>
              {msg.role === 'user' && (
                <div className="p-1 rounded-lg bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)] shrink-0 self-start mt-0.5">
                  <User size={12} className="text-[var(--ae-gold)]" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <form onSubmit={e => { e.preventDefault(); send(input) }}
          className="flex items-center gap-2 bg-[var(--ae-bg-raised)] border border-[var(--ae-border-mid)] rounded-xl px-3 py-2 focus-within:border-[var(--ae-gold-rule)] transition-colors">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about pricing, strategy, products…"
            className="flex-1 bg-transparent text-xs text-[var(--ae-text)] placeholder:text-[var(--ae-text-muted)] focus:outline-none"
            disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()}
            className="p-1.5 rounded-lg bg-[var(--ae-gold)] hover:bg-[var(--ae-gold-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ color: '#080810' }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </form>
      </div>
    </div>
  )
}
