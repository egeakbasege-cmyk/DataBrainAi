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
    <div className="bg-[#0f0f12] border border-zinc-800 rounded-xl flex flex-col h-full min-h-[400px]">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <Bot size={14} className="text-violet-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-100">KAIROS Copilot</p>
          <p className="text-xs text-zinc-600">Ask anything about {targetName}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 text-center">Intelligence loaded. Ask KAIROS anything about this competitor.</p>
            <div className="grid grid-cols-1 gap-1.5">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all duration-150">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="p-1 rounded-lg bg-violet-500/10 border border-violet-500/20 shrink-0 self-start mt-0.5">
                  <Bot size={12} className="text-violet-400" />
                </div>
              )}
              <div className={`max-w-[85%] text-xs rounded-xl px-3 py-2.5 leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm'
              }`}>
                {msg.content || (loading && i === messages.length - 1
                  ? <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Thinking…</span>
                  : ''
                )}
              </div>
              {msg.role === 'user' && (
                <div className="p-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0 self-start mt-0.5">
                  <User size={12} className="text-indigo-400" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 pb-3">
        <form onSubmit={e => { e.preventDefault(); send(input) }}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about pricing, strategy, products…"
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {loading ? <Loader2 size={12} className="animate-spin text-white" /> : <Send size={12} className="text-white" />}
          </button>
        </form>
      </div>
    </div>
  )
}
