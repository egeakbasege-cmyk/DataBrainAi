'use client'

import { TrendingUp } from 'lucide-react'

const TRENDING_ITEMS = [
  { name: 'Posture Correctors',   change: '+847 new listings', hot: true },
  { name: 'LED Face Masks',       change: '+623 new listings', hot: true },
  { name: 'Neck Cloud Pillow',    change: '+412 stores selling', hot: false },
  { name: 'Mushroom Coffee',      change: '+1,240 new listings', hot: true },
  { name: 'Gut Health Gummies',   change: '+789 new listings', hot: true },
  { name: 'Air Purifier Pods',    change: '+530 new listings', hot: false },
  { name: 'Weighted Blankets',    change: '+2,103 stores selling', hot: false },
  { name: 'Cold Plunge Tubs',     change: '+391 new listings', hot: true },
  { name: 'Standing Desk Mats',   change: '+661 new listings', hot: false },
  { name: 'Portable Saunas',      change: '+290 new listings', hot: true },
]

export function TrendingTicker() {
  const doubled = [...TRENDING_ITEMS, ...TRENDING_ITEMS]   // seamless loop

  return (
    <div className="w-full overflow-hidden border-y border-zinc-800/60 bg-zinc-950/50 py-2.5">
      <div className="flex items-center gap-3">
        {/* Static label */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 text-xs font-semibold text-indigo-400 border-r border-zinc-800 pr-4">
          <TrendingUp size={12} />
          TRENDING
        </div>

        {/* Scrolling items */}
        <div className="relative flex-1 overflow-hidden">
          <div className="flex gap-8 animate-ticker whitespace-nowrap">
            {doubled.map((item, i) => (
              <span key={i} className="flex items-center gap-2 text-xs shrink-0">
                {item.hot && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse-glow" />
                )}
                <span className="text-zinc-300 font-medium">{item.name}</span>
                <span className="text-zinc-600">{item.change}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
