'use client'

import { useState, useTransition } from 'react'
import { useRouter }                from 'next/navigation'
import { Search, Loader2, Zap }     from 'lucide-react'

const EXAMPLES = [
  { label: 'Shopify Store', url: 'https://gymshark.com' },
  { label: 'Amazon Product', url: 'https://amazon.com/dp/B09G9HD6PD' },
  { label: 'DTC Brand', url: 'https://allbirds.com' },
]

const STEPS = [
  'Connecting to store…',
  'Extracting product catalog…',
  'Mapping pricing strategy…',
  'Running AI analysis…',
  'Generating battle plan…',
  'Finalising intelligence report…',
]

export function KairosAnalysisInput() {
  const [url, setUrl]               = useState('')
  const [error, setError]           = useState('')
  const [stepIdx, setStepIdx]       = useState(0)
  const [isPending, startTransition] = useTransition()
  const router                       = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) { setError('Please enter a URL'); return }
    setError('')

    // Animate steps
    const interval = setInterval(() => {
      setStepIdx(i => (i + 1) % STEPS.length)
    }, 1800)

    startTransition(async () => {
      try {
        const res  = await fetch('/api/kairos/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url: url.trim() }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Failed to start analysis'); return }
        clearInterval(interval)
        router.push(`/data-lab/kairos/analysis/${data.analysisId}`)
      } catch (err: any) {
        clearInterval(interval)
        setError(err.message || 'Network error')
      }
    })
  }

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-indigo-500/70 transition-colors shadow-lg shadow-black/20">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            placeholder="Paste any Shopify or Amazon URL…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !url.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shrink-0"
          >
            {isPending
              ? <><Loader2 size={12} className="animate-spin" /> Analyzing…</>
              : <><Zap size={12} /> Analyze</>
            }
          </button>
        </div>
      </form>

      {isPending && (
        <p className="text-center text-xs text-indigo-400 mt-3 animate-pulse">
          {STEPS[stepIdx]}
        </p>
      )}

      {error && (
        <p className="text-center text-xs text-red-400 mt-2">{error}</p>
      )}

      {!isPending && (
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {EXAMPLES.map(({ label, url: exUrl }) => (
            <button
              key={label}
              onClick={() => setUrl(exUrl)}
              className="text-xs px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
