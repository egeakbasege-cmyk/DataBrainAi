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
    <div className="ae-app-card overflow-hidden h-full flex flex-col">
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)]">
            <Shield size={14} className="text-[var(--ae-gold)]" />
          </div>
          <h2 className="text-sm font-bold text-[var(--ae-text)]">AI Intelligence Brief</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--ae-gold-wash)] text-[var(--ae-gold)] font-medium border border-[var(--ae-gold-rule)]">
            Score: {analysis.competitorScore}/100
          </span>
        </div>
        <p className="text-xs text-[var(--ae-text-dim)] leading-relaxed mb-4 border-l-2 border-[var(--ae-gold-rule)] pl-3">
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
                  ? 'bg-[var(--ae-bg-raised)] border-[var(--ae-border)] border-b-[var(--ae-bg-raised)] text-[var(--ae-text)]'
                  : 'text-[var(--ae-text-muted)] hover:text-[var(--ae-text-dim)]',
              )}
            >
              <Icon size={11} />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-px bg-[var(--ae-border)]" />
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
        <div key={i} className="bg-[var(--ae-bg-raised)] border border-[var(--ae-border)] rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-[var(--ae-text)]">{v.category}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-md border font-semibold shrink-0', SEVERITY_COLOR[v.severity])}>
              {v.severity}
            </span>
          </div>
          <p className="text-xs text-[var(--ae-text-dim)] leading-relaxed">{v.finding}</p>
          <div className="pt-1 border-t border-[var(--ae-border)]">
            <p className="text-xs text-[var(--ae-velocity-pos)] flex gap-1.5">
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
            <div className="w-6 h-6 rounded-full bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)] flex items-center justify-center text-xs font-bold text-[var(--ae-gold)] shrink-0">
              {s.step}
            </div>
            {i < steps.length - 1 && <div className="w-px flex-1 bg-[var(--ae-border)] mt-1" />}
          </div>
          <div className="bg-[var(--ae-bg-raised)] border border-[var(--ae-border)] rounded-xl p-3 flex-1 mb-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-[var(--ae-text)]">{s.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('text-xs font-medium', EFFORT_COLOR[s.effort])}>{s.effort} effort</span>
                <span className="text-xs text-[var(--ae-text-muted)] bg-[var(--ae-bg-elevated)] px-2 py-0.5 rounded-md">{s.timeframe}</span>
              </div>
            </div>
            <p className="text-xs text-[var(--ae-text-dim)] leading-relaxed">{s.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function AdScriptTab({ script }: { script: KairosAIAnalysis['adCreativeScript'] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)] rounded-xl">
        <Flame size={14} className="text-[var(--ae-gold)] shrink-0" />
        <span className="text-xs font-semibold text-[var(--ae-gold)]">{script.platform} Script</span>
      </div>
      {[
        { label: '🎣 Hook (0–3s)', content: script.hook },
        { label: '🎬 Full Script', content: script.script },
        { label: '📣 CTA',         content: script.cta },
      ].map(({ label, content }) => (
        <div key={label} className="bg-[var(--ae-bg-raised)] border border-[var(--ae-border)] rounded-xl p-3">
          <p className="text-xs font-semibold text-[var(--ae-text-muted)] mb-2">{label}</p>
          <p className="text-sm text-[var(--ae-text)] leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      ))}
    </div>
  )
}

function SeoTab({ keywords }: { keywords: string[] }) {
  return (
    <div>
      <p className="text-xs text-[var(--ae-text-muted)] mb-3">Keywords this competitor ranks for. Target these with your listings and content.</p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw, i) => (
          <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)] text-[var(--ae-gold-bright)] font-medium">
            {kw}
          </span>
        ))}
      </div>
    </div>
  )
}
