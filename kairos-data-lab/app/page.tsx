import { Zap, Shield, TrendingUp, Eye }    from 'lucide-react'
import { AnalysisInput }                     from '@/components/AnalysisInput'
import { TrendingTicker }                    from '@/components/TrendingTicker'
import { HistoryCard }                       from '@/components/HistoryCard'
import prisma                                from '@/lib/db'

async function getRecentAnalyses() {
  try {
    return await prisma.analysisResult.findMany({
      orderBy: { createdAt: 'desc' },
      take:    12,
      select: {
        id: true, platform: true, targetUrl: true,
        targetName: true, status: true, createdAt: true,
      },
    })
  } catch {
    return []
  }
}

const FEATURES = [
  { icon: Eye,       title: 'Zero-Auth Spy',     desc: 'No API keys or OAuth. We extract data directly from public storefronts.' },
  { icon: TrendingUp, title: 'Revenue Estimator', desc: 'Estimate competitor sales volume and gross margins using our proprietary model.' },
  { icon: Shield,    title: 'AI Battle Plans',    desc: 'Claude generates step-by-step competitive playbooks tailored to each target.' },
  { icon: Zap,       title: 'Instant Insights',   desc: 'Full analysis delivered in under 90 seconds — scraping to strategy.' },
]

export default async function HomePage() {
  const analyses = await getRecentAnalyses()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-100 tracking-tight">
              KAIROS <span className="text-zinc-500 font-normal">Data Lab</span>
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-xs text-zinc-500">
            <a href="#" className="hover:text-zinc-200 transition-colors">Pricing</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Docs</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Blog</a>
          </nav>
        </div>
      </header>

      <TrendingTicker />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-400">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Real-time e-commerce intelligence
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-100 max-w-3xl leading-none mb-6">
          Spy on any store.
          <br />
          <span className="gradient-text">Beat any competitor.</span>
        </h1>

        <p className="text-base text-zinc-400 max-w-xl mb-10 leading-relaxed">
          Paste a Shopify or Amazon URL. KAIROS extracts product data, estimates revenue, maps supplier costs, and generates a custom AI battle plan — in seconds.
        </p>

        <AnalysisInput />

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

      {analyses.length > 0 && (
        <section className="border-t border-zinc-800 bg-[#0a0a0d] px-6 py-10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Recent Analyses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {analyses.map(a => (
                <HistoryCard
                  key={a.id}
                  id={a.id}
                  platform={a.platform}
                  targetUrl={a.targetUrl}
                  targetName={a.targetName}
                  status={a.status}
                  createdAt={a.createdAt.toISOString()}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-zinc-800/60 px-6 py-6 text-center text-xs text-zinc-700">
        KAIROS Data Lab — For competitive intelligence purposes only. Respect platform ToS.
      </footer>
    </div>
  )
}
