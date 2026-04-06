'use client'

import { useAppMode } from '../context/AppModeContext'

interface Scenario {
  icon:   string
  title:  string
  prompt: string
}

const SCENARIOS: Record<string, Scenario[]> = {
  analyst: [
    {
      icon:   '📊',
      title:  'Revenue diagnosis',
      prompt: 'I run a SaaS business with 200 customers, $18k MRR, and 8% monthly churn. My CAC is $320 and LTV is $1,100. Diagnose what is killing my unit economics and where the biggest leak is.',
    },
    {
      icon:   '🔍',
      title:  'Conversion audit',
      prompt: 'My e-commerce store gets 12,000 visitors/month but only 0.8% convert to purchase. Average order value is $65. Walk me through a data-driven audit of where I am losing customers.',
    },
    {
      icon:   '📉',
      title:  'Margin deep-dive',
      prompt: 'I have a productised service agency doing £25k/month revenue but only 18% net margin. I have 3 staff and 11 clients. Find where my margins are being compressed and what to cut.',
    },
  ],
  strategist: [
    {
      icon:   '🚀',
      title:  'First 10 customers',
      prompt: 'I just launched a B2B productivity tool for remote teams. I have 0 paying customers but 40 beta users who like it. Give me a 90-day playbook to land my first 10 paying customers at $99/month.',
    },
    {
      icon:   '💰',
      title:  '$10k/month roadmap',
      prompt: 'I am a freelance UX designer earning £4,500/month from 3 retainer clients. I want to hit £10k/month in 6 months without hiring. What is my fastest, most realistic path?',
    },
    {
      icon:   '📈',
      title:  'Price increase plan',
      prompt: 'I run a coaching business with 14 clients at $200/month and a 93% retention rate. I need to raise prices to $350/month. Give me a strategy to do this without losing more than 2 clients.',
    },
  ],
  cleaner: [
    {
      icon:   '✂️',
      title:  'Cut overhead fast',
      prompt: 'My agency has £40k/month revenue but £34k in costs — £12k is staff, £8k is software subscriptions, £6k is contractors, £8k is other. I need to cut £8k of cost without touching delivery quality.',
    },
    {
      icon:   '🔧',
      title:  'Fix the ops leak',
      prompt: 'My team of 4 spends 60% of their time on client admin and back-and-forth emails instead of delivery work. Revenue is flat at $28k/month. Find and fix the operational friction killing our capacity.',
    },
    {
      icon:   '🧹',
      title:  'Kill dead weight',
      prompt: 'I have 3 service lines: web design ($9k/month, 22% margin), SEO retainers ($11k/month, 48% margin), and social media ($6k/month, 11% margin). Tell me what to kill, what to keep, and how to transition.',
    },
  ],
}

interface Props {
  onSelect: (prompt: string) => void
}

export function ScenarioCards({ onSelect }: Props) {
  const { mode } = useAppMode()
  const scenarios = SCENARIOS[mode] ?? SCENARIOS.strategist

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {scenarios.map((s) => (
        <button
          key={s.title}
          onClick={() => onSelect(s.prompt)}
          className="text-left p-4 rounded-card border transition-all group"
          style={{
            background:   '#FFFFFF',
            border:       '1px solid #E5E7EB',
            boxShadow:    '0 1px 4px rgba(0,0,0,0.03)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.borderColor = '#FACC15'
            el.style.boxShadow   = '0 2px 12px rgba(250,204,21,0.15)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.borderColor = '#E5E7EB'
            el.style.boxShadow   = '0 1px 4px rgba(0,0,0,0.03)'
          }}
        >
          <div className="text-xl mb-2">{s.icon}</div>
          <p className="font-heading font-bold text-ink text-sm mb-1">{s.title}</p>
          <p className="font-sans text-xs text-muted leading-relaxed line-clamp-2">
            {s.prompt.slice(0, 80)}…
          </p>
          <p className="font-sans text-xs mt-3 transition-colors"
            style={{ color: '#9CA3AF' }}>
            Use this prompt →
          </p>
        </button>
      ))}
    </div>
  )
}
