import Link                       from 'next/link'
import { Zap, Eye, TrendingUp, Shield, ArrowLeft } from 'lucide-react'
import { KairosAnalysisInput }   from '@/components/kairos/AnalysisInput'
import { prisma }                from '@/lib/prisma'

async function getRecentAnalyses() {
  try {
    return await prisma.kairosAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, platform: true, targetUrl: true, targetName: true, status: true, createdAt: true },
    })
  } catch { return [] }
}

const FEATURES = [
  { icon: Eye,        title: 'Zero-Auth Spy',     desc: 'No API keys. Extract data directly from public storefronts.' },
  { icon: TrendingUp, title: 'Revenue Estimator', desc: 'Estimate competitor margins and supplier costs.' },
  { icon: Shield,     title: 'AI Battle Plans',   desc: 'Claude generates step-by-step competitive playbooks.' },
  { icon: Zap,        title: 'Instant Insights',  desc: 'Full analysis in under 90 seconds — scraping to strategy.' },
]

export default async function KairosPage() {
  const analyses = await getRecentAnalyses()

  return (
    <div className="page-dark">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--ae-border)] bg-[var(--ae-bg)]/90 backdrop-blur-md">
        <div className="container-page h-14 flex items-center gap-4">
          <Link href="/data-lab"
            className="flex items-center gap-1.5 text-xs text-[var(--ae-text-muted)] hover:text-[var(--ae-text-dim)] transition-colors">
            <ArrowLeft size={13} /> Data Lab
          </Link>
          <div className="w-px h-4 bg-[var(--ae-border)]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)] flex items-center justify-center">
              <Zap size={11} className="text-[var(--ae-gold)]" />
            </div>
            <span className="text-xs font-bold text-[var(--ae-text)] tracking-tight">
              KAIROS <span className="text-[var(--ae-text-muted)] font-normal">Intelligence</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Eyebrow badge */}
        <div className="mb-5 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-[var(--ae-gold-rule)] bg-[var(--ae-gold-wash)] text-[var(--ae-gold)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ae-gold)] animate-pulse" />
          Real-time e-commerce intelligence
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--ae-text)] max-w-2xl leading-none mb-6">
          Spy on any store.
          <br />
          <span className="text-gold-grad">Beat any competitor.</span>
        </h1>

        <p className="text-base text-[var(--ae-text-dim)] max-w-xl mb-10 leading-relaxed">
          Paste a Shopify or Amazon URL. KAIROS extracts product data, estimates revenue, maps supplier costs,
          and generates a custom AI battle plan — in seconds.
        </p>

        <KairosAnalysisInput />

        {/* Feature cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 max-w-4xl w-full text-left">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="ae-app-card p-4">
              <div className="p-2 rounded-lg bg-[var(--ae-gold-wash)] border border-[var(--ae-gold-rule)] w-fit mb-3">
                <Icon size={14} className="text-[var(--ae-gold)]" />
              </div>
              <h3 className="text-xs font-bold text-[var(--ae-text)] mb-1">{title}</h3>
              <p className="text-xs text-[var(--ae-text-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent analyses ─────────────────────────────────────────── */}
      {analyses.length > 0 && (
        <section className="border-t border-[var(--ae-border)] bg-[var(--ae-bg-raised)] px-6 py-10">
          <div className="container-page">
            <h2 className="ae-label-chrome mb-6">Recent Analyses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {analyses.map((a: typeof analyses[number]) => (
                <Link key={a.id} href={`/data-lab/kairos/analysis/${a.id}`}
                  className="ae-app-card hover:border-[var(--ae-border-mid)] p-4 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    {/* Platform badge — use velocity-pos for Shopify (growth), gold for Amazon */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      a.platform === 'SHOPIFY'
                        ? 'bg-[var(--ae-velocity-pos)]/10 text-[var(--ae-velocity-pos)] border-[var(--ae-velocity-pos)]/20'
                        : 'bg-[var(--ae-gold-wash)] text-[var(--ae-gold)] border-[var(--ae-gold-rule)]'
                    }`}>{a.platform}</span>
                    <span className={`text-xs font-medium ${
                      a.status === 'COMPLETE' ? 'text-[var(--ae-velocity-pos)]' :
                      a.status === 'ERROR'    ? 'text-[var(--ae-velocity-neg)]' :
                                               'text-[var(--ae-text-muted)]'
                    }`}>{a.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--ae-text)] group-hover:text-[var(--ae-chrome)] truncate mb-1">
                    {a.targetName || a.targetUrl}
                  </p>
                  <p className="text-xs text-[var(--ae-text-muted)] truncate">{a.targetUrl}</p>
                  <p className="text-xs text-[var(--ae-text-ghost)] mt-2">{new Date(a.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-[var(--ae-border)] px-6 py-6 text-center text-xs text-[var(--ae-text-ghost)]">
        KAIROS Intelligence — For competitive research only. Respect platform ToS.
      </footer>
    </div>
  )
}
