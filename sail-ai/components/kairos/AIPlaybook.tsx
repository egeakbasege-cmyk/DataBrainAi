'use client'

import { useState } from 'react'
import { AlertTriangle, Target, Video, Search, Shield, ChevronRight, Flame } from 'lucide-react'
import { cn, SEVERITY_COLOR, EFFORT_COLOR } from '@/lib/kairos/utils'
import type { KairosAIAnalysis }            from '@/lib/kairos/types'

interface Props { analysis: KairosAIAnalysis }
type TabId = 'vulnerabilities' | 'battleplan' | 'adscript' | 'seo'

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle },
  { id: 'battleplan',      label: 'Battle Plan',      icon: Target },
  { id: 'adscript',        label: 'Ad Script',        icon: Video },
  { id: 'seo',             label: 'SEO Targets',      icon: Search },
]

export function KairosAIPlaybook({ analysis }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('vulnerabilities')

  return (
    <div className="bg-[#0f0f12] border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Shield size={14} className="text-indigo-400" />
          </div>
          <h2 className="text-sm font-bold text-zinc-100">AI Intelligence Brief</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20">
            Score: {analysis.competitorScore}/100
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4 border-l-2 border-indigo-500/40 pl-3">
          {analysis.summary}
        </p>
        <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-t-lg whitespace-nowrap transition-all duration-150 border border-transparent',
                activeTab === id
                  ? 'bg-zinc-900 border-zinc-700 border-b-zinc-900 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Icon size={11} />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-px bg-zinc-700/50" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'vulnerabilities' && <VulnerabilitiesTab vulnerabilities={analysis.vulnerabilities} />}
        {activeTab === 'battleplan'      && <BattlePlanTab      steps={analysis.actionableBattlePlan} />}
        {activeTab === 'adscript'        && <AdScriptTab        script={analysis.adCreativeScript} />}
        {activeTab === 'seo'             && <SeoTab             keywords={analysis.seoKeywordsToTarget} />}
      </div>
    </div>
  )
}

function VulnerabilitiesTab({ vulnerabilities }: { vulnerabilities: KairosAIAnalysis['vulnerabilities'] }) {
  return (
    <>
      {vulnerabilities.map((v, i) => (
        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-zinc-200">{v.category}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-md border font-semibold shrink-0', SEVERITY_COLOR[v.severity])}>
              {v.severity}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{v.finding}</p>
          <div className="pt-1 border-t border-zinc-800">
            <p className="text-xs text-emerald-400 flex gap-1.5">
              <ChevronRight size={12} className="mt-0.5 shrink-0" />
              <span><strong>Your move:</strong> {v.opportunity}</span>
            </p>
          </div>
        </div>
      ))}
    </>
  )
}

function BattlePlanTab({ steps }: { steps: KairosAIAnalysis['actionableBattlePlan'] }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex-col items-center hidden sm:flex">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
              {s.step}
            </div>
            {i < steps.length - 1 && <div className="w-px flex-1 bg-zinc-800 mt-1" />}
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex-1 mb-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-100">{s.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('text-xs font-medium', EFFORT_COLOR[s.effort])}>{s.effort} effort</span>
                <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">{s.timeframe}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{s.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function AdScriptTab({ script }: { script: KairosAIAnalysis['adCreativeScript'] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-pink-500/5 border border-pink-500/15 rounded-xl">
        <Flame size={14} className="text-pink-400 shrink-0" />
        <span className="text-xs font-semibold text-pink-400">{script.platform} Script</span>
      </div>
      {[
        { label: '🎣 Hook (0–3s)', content: script.hook },
        { label: '🎬 Full Script', content: script.script },
        { label: '📣 CTA',         content: script.cta },
      ].map(({ label, content }) => (
        <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
          <p className="text-xs font-semibold text-zinc-500 mb-2">{label}</p>
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      ))}
    </div>
  )
}

function SeoTab({ keywords }: { keywords: string[] }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-3">Keywords this competitor ranks for. Target these with your listings and content.</p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw, i) => (
          <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
            {kw}
          </span>
        ))}
      </div>
    </div>
  )
}
