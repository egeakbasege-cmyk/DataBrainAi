'use client'

import { useState, useTransition }          from 'react'
import { useRouter }                         from 'next/navigation'
import { Search, Loader2, ShoppingBag, Package, Zap } from 'lucide-react'

const EXAMPLE_URLS = [
  { label: 'Shopify Store',   value: 'https://gymshark.com',              icon: ShoppingBag },
  { label: 'Amazon Product',  value: 'https://amazon.com/dp/B08N5WRWNW', icon: Package },
]

const STEPS = [
  'Connecting to storefront…',
  'Scraping product catalogue…',
  'Parsing variant structures…',
  'Estimating supplier costs…',
  'Running AI competitive analysis…',
  'Generating your battle plan…',
]

export function AnalysisInput() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)

    startTransition(async () => {
      // Animate through steps while the real request runs
      const stepInterval = setInterval(() => {
        setStep(s => Math.min(s + 1, STEPS.length - 1))
      }, 3500)

      try {
        const res = await fetch('/api/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url: url.trim() }),
        })

        clearInterval(stepInterval)
        setStep(0)

        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Analysis failed. Please try again.')
          return
        }

        router.push(`/analysis/${data.analysisId}`)
      } catch (err: any) {
        clearInterval(stepInterval)
        setStep(0)
        setError('Network error. Please check your connection.')
      }
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        {/* Gradient border glow on focus */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-focus-within:opacity-60 transition-opacity duration-500 blur-sm" />

        <div className="relative flex items-center bg-[#0f0f12] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="pl-5 pr-3 text-zinc-500 shrink-0">
            {isPending
              ? <Loader2 size={20} className="animate-spin text-indigo-400" />
              : <Search size={20} />
            }
          </div>

          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null) }}
            placeholder="Paste a Shopify store or Amazon product URL…"
            className="flex-1 bg-transparent py-4 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            disabled={isPending}
          />

          <button
            type="submit"
            disabled={isPending || !url.trim()}
            className="m-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-150 flex items-center gap-2 shrink-0"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {isPending ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
      </form>

      {/* Progress steps */}
      {isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-indigo-400 animate-pulse">
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span>{STEPS[step]}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Quick examples */}
      {!isPending && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-600">Try:</span>
          {EXAMPLE_URLS.map(({ label, value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setUrl(value)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all duration-150"
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
