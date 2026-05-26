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
        {/* Brand icon — champagne/velocity-pos tint instead of off-brand emerald */}
        <div className="p-2.5 rounded-xl bg-[var(--ae-velocity-pos)]/10 border border-[var(--ae-velocity-pos)]/20">
          <ShoppingBag size={20} className="text-[var(--ae-velocity-pos)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--ae-text)]">{raw.storeName}</h2>
          <p className="text-sm text-[var(--ae-text-muted)]">{raw.storeDomain}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[var(--ae-bg-raised)] border border-[var(--ae-border)] rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--ae-text-muted)] mb-1"><Icon size={11} />{label}</div>
            <p className="text-sm font-bold text-[var(--ae-text)]">{value}</p>
          </div>
        ))}
      </div>

      {ai.marketPositioning?.targetAudience && (
        <div className="bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)] rounded-xl p-3">
          <p className="text-xs text-[var(--ae-gold)] font-medium mb-1 flex items-center gap-1">
            <Users size={11} /> Target Audience
          </p>
          <p className="text-sm text-[var(--ae-text)]">{ai.marketPositioning.targetAudience}</p>
        </div>
      )}

      {topTags.length > 0 && (
        <div>
          <p className="ae-label mb-2 flex items-center gap-1.5"><Tag size={10} /> Top Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag, count]) => (
              <span key={tag} className="ae-chip">
                {tag} <span className="opacity-50">×{count as number}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {raw.scrapedAt && (
        <p className="text-xs text-[var(--ae-text-ghost)] flex items-center gap-1">
          <Calendar size={10} />Scraped {new Date(raw.scrapedAt).toLocaleString()}
        </p>
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
        {/* Amazon product — gold tint (brand-consistent) */}
        <div className="p-2.5 rounded-xl bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)]">
          <Package size={20} className="text-[var(--ae-gold)]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--ae-text)] leading-snug">{raw.title}</h2>
          <p className="text-sm text-[var(--ae-text-muted)] mt-0.5">ASIN: {raw.asin}</p>
        </div>
      </div>

      {raw.imageUrls?.[0] && (
        <div className="rounded-xl overflow-hidden border border-[var(--ae-border)] bg-[var(--ae-bg-raised)]">
          <img src={raw.imageUrls[0]} alt={raw.title} className="w-full object-contain max-h-48" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              className={
                i < fullStars                    ? 'text-[var(--ae-gold)] fill-[var(--ae-gold)]' :
                i === fullStars && hasHalf       ? 'text-[var(--ae-gold)] fill-[var(--ae-gold)]/50' :
                                                   'text-[var(--ae-border)]'
              }
            />
          ))}
        </div>
        <span className="text-sm font-bold text-[var(--ae-text)]">{rating.toFixed(1)}</span>
        <span className="text-xs text-[var(--ae-text-muted)]">({formatNumber(raw.reviewCount ?? 0)} reviews)</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Price',        value: raw.price ? formatCurrency(raw.price) : 'N/A', icon: DollarSign },
          { label: 'Threat Score', value: `${ai.competitorScore ?? '—'} / 100`,          icon: Star },
          { label: 'Brand',        value: raw.brand || 'Unknown',                         icon: Tag },
          { label: 'Reviews',      value: formatNumber(raw.reviewCount ?? 0),             icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[var(--ae-bg-raised)] border border-[var(--ae-border)] rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--ae-text-muted)] mb-1"><Icon size={11} />{label}</div>
            <p className="text-sm font-bold text-[var(--ae-text)] truncate">{value}</p>
          </div>
        ))}
      </div>

      {raw.bulletPoints?.length > 0 && (
        <div>
          <p className="ae-label mb-2">Seller Claims</p>
          <ul className="space-y-1.5">
            {raw.bulletPoints.slice(0, 5).map((b: string, i: number) => (
              <li key={i} className="text-xs text-[var(--ae-text-dim)] flex gap-2">
                <span className="text-[var(--ae-gold)] mt-0.5 shrink-0">›</span>{b.slice(0, 120)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {raw.scrapedAt && (
        <p className="text-xs text-[var(--ae-text-ghost)] flex items-center gap-1">
          <Calendar size={10} />Scraped {new Date(raw.scrapedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
