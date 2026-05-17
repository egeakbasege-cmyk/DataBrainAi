'use client'

import { ShoppingBag, Package, Star, Users, DollarSign, Tag, TrendingUp, Calendar } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/kairos/utils'
import type { KairosAnalysisRecord }    from '@/lib/kairos/types'

interface Props { analysis: KairosAnalysisRecord }

export function KairosMetadataPanel({ analysis }: Props) {
  const raw = analysis.rawData as any
  const ai  = analysis.aiAnalysis as any
  if (analysis.platform === 'SHOPIFY') return <ShopifyMeta raw={raw} ai={ai} />
  return <AmazonMeta raw={raw} ai={ai} />
}

function ShopifyMeta({ raw, ai }: { raw: any; ai: any }) {
  const stats = [
    { label: 'Total Products', value: formatNumber(raw.totalProducts ?? 0),          icon: Package },
    { label: 'Price Range',    value: `${formatCurrency(raw.priceRange?.min ?? 0)} – ${formatCurrency(raw.priceRange?.max ?? 0)}`, icon: DollarSign },
    { label: 'Avg Price',      value: formatCurrency(raw.priceRange?.avg ?? 0),       icon: TrendingUp },
    { label: 'Threat Score',   value: `${ai.competitorScore ?? '—'} / 100`,           icon: Star },
  ]
  const topTags = Object.entries((raw.tagFrequency ?? {}) as Record<string, number>).slice(0, 12)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <ShoppingBag size={20} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{raw.storeName}</h2>
          <p className="text-sm text-zinc-500">{raw.storeDomain}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1"><Icon size={11} />{label}</div>
            <p className="text-sm font-bold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      {ai.marketPositioning?.targetAudience && (
        <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3">
          <p className="text-xs text-indigo-400 font-medium mb-1 flex items-center gap-1"><Users size={11} /> Target Audience</p>
          <p className="text-sm text-zinc-200">{ai.marketPositioning.targetAudience}</p>
        </div>
      )}
      {topTags.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Tag size={10} /> Top Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag, count]) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                {tag} <span className="text-zinc-600">×{count as number}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {raw.scrapedAt && (
        <p className="text-xs text-zinc-700 flex items-center gap-1"><Calendar size={10} />Scraped {new Date(raw.scrapedAt).toLocaleString()}</p>
      )}
    </div>
  )
}

function AmazonMeta({ raw, ai }: { raw: any; ai: any }) {
  const rating    = raw.rating ?? 0
  const fullStars = Math.floor(rating)
  const hasHalf   = rating - fullStars >= 0.5

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Package size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-100 leading-snug">{raw.title}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">ASIN: {raw.asin}</p>
        </div>
      </div>
      {raw.imageUrls?.[0] && (
        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
          <img src={raw.imageUrls[0]} alt={raw.title} className="w-full object-contain max-h-48" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} className={i < fullStars ? 'text-amber-400 fill-amber-400' : i === fullStars && hasHalf ? 'text-amber-400 fill-amber-400/50' : 'text-zinc-700'} />
          ))}
        </div>
        <span className="text-sm font-bold text-zinc-200">{rating.toFixed(1)}</span>
        <span className="text-xs text-zinc-500">({formatNumber(raw.reviewCount ?? 0)} reviews)</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Price',        value: raw.price ? formatCurrency(raw.price) : 'N/A', icon: DollarSign },
          { label: 'Threat Score', value: `${ai.competitorScore ?? '—'} / 100`,          icon: Star },
          { label: 'Brand',        value: raw.brand || 'Unknown',                         icon: Tag },
          { label: 'Reviews',      value: formatNumber(raw.reviewCount ?? 0),             icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1"><Icon size={11} />{label}</div>
            <p className="text-sm font-bold text-zinc-100 truncate">{value}</p>
          </div>
        ))}
      </div>
      {raw.bulletPoints?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Seller Claims</p>
          <ul className="space-y-1.5">
            {raw.bulletPoints.slice(0, 5).map((b: string, i: number) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-2">
                <span className="text-indigo-500 mt-0.5 shrink-0">›</span>{b.slice(0, 120)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {raw.scrapedAt && (
        <p className="text-xs text-zinc-700 flex items-center gap-1"><Calendar size={10} />Scraped {new Date(raw.scrapedAt).toLocaleString()}</p>
      )}
    </div>
  )
}
