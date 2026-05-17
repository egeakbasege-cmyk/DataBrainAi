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
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/data-lab" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
            <ArrowLeft size={13} /> Data Lab
          </Link>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap size={11} className="text-white" />
            </div>
            <span className="text-xs font-bold text-zinc-100 tracking-tight">
              KAIROS <span className="text-zinc-500 font-normal">Intelligence</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-400">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Real-time e-commerce intelligence
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-100 max-w-2xl leading-none mb-6">
          Spy on any store.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Beat any competitor.
          </span>
        </h1>
        <p className="text-base text-zinc-400 max-w-xl mb-10 leading-relaxed">
          Paste a Shopify or Amazon URL. KAIROS extracts product data, estimates revenue, maps supplier costs, and generates a custom AI battle plan — in seconds.
        </p>
        <KairosAnalysisInput />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 max-w-4xl w-full text-left">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0f0f12] border border-zinc-800 rounded-xl p-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 w-fit mb-3">
                <Icon size={14} className="text-indigo-400" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200 mb-1">{title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent analyses */}
      {analyses.length > 0 && (
        <section className="border-t border-zinc-800 bg-[#0a0a0d] px-6 py-10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Recent Analyses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {analyses.map((a: typeof analyses[number]) => (
                <Link key={a.id} href={`/data-lab/kairos/analysis/${a.id}`}
                  className="bg-[#0f0f12] border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      a.platform === 'SHOPIFY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>{a.platform}</span>
                    <span className={`text-xs font-medium ${
                      a.status === 'COMPLETE' ? 'text-emerald-400' :
                      a.status === 'ERROR'    ? 'text-red-400' : 'text-zinc-500'
                    }`}>{a.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate mb-1">
                    {a.targetName || a.targetUrl}
                  </p>
                  <p className="text-xs text-zinc-600 truncate">{a.targetUrl}</p>
                  <p className="text-xs text-zinc-700 mt-2">{new Date(a.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-zinc-800/60 px-6 py-6 text-center text-xs text-zinc-700">
        KAIROS Intelligence — For competitive research only. Respect platform ToS.
      </footer>
    </div>
  )
}
