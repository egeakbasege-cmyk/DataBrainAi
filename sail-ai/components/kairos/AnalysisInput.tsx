'use client'

import { useState, useTransition } from 'react'
import { useRouter }                from 'next/navigation'
import { Search, Loader2, Zap }     from 'lucide-react'

const EXAMPLES = [
  { label: 'Shopify Store',   url: 'https://gymshark.com' },
  { label: 'Amazon Product',  url: 'https://amazon.com/dp/B09G9HD6PD' },
  { label: 'DTC Brand',       url: 'https://allbirds.com' },
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
        <div className="flex items-center gap-2 bg-[var(--ae-bg-raised)] border border-[var(--ae-border-mid)] rounded-2xl px-4 py-3 focus-within:border-[var(--ae-gold-rule)] transition-colors shadow-lg shadow-black/20">
          <Search size={16} className="text-[var(--ae-text-muted)] shrink-0" />
          <input
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            placeholder="Paste any Shopify or Amazon URL…"
            className="flex-1 bg-transparent text-sm text-[var(--ae-text)] placeholder:text-[var(--ae-text-muted)] focus:outline-none"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !url.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--ae-gold)] hover:bg-[var(--ae-gold-bright)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--ae-bg)] text-xs font-bold transition-colors shrink-0"
            style={{ color: '#080810' }}
          >
            {isPending
              ? <><Loader2 size={12} className="animate-spin" /> Analyzing…</>
              : <><Zap size={12} /> Analyze</>
            }
          </button>
        </div>
      </form>

      {isPending && (
        <p className="text-center text-xs text-[var(--ae-gold)] mt-3 animate-pulse">
          {STEPS[stepIdx]}
        </p>
      )}

      {error && (
        <p className="text-center text-xs text-[var(--ae-velocity-neg)] mt-2">{error}</p>
      )}

      {!isPending && (
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {EXAMPLES.map(({ label, url: exUrl }) => (
            <button
              key={label}
              onClick={() => setUrl(exUrl)}
              className="ae-chip hover:border-[var(--ae-border-mid)] hover:text-[var(--ae-text-dim)] transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
