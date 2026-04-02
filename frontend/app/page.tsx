'use client'

import Link from 'next/link'

const SAMPLE_CARDS = [
  {
    type: 'Fitness Trainer',
    headline: 'Convert 3% of Followers into Paying Clients in 90 Days',
    signal:
      'Personal trainers posting one direct offer weekly convert at the industry average of 3%. You currently sit below 0.1%.',
    upside: '+180% revenue',
    color: '#2de8a0',
  },
  {
    type: 'E-Commerce Store',
    headline: 'Recover 15% of Abandoned Carts With One Email Sequence',
    signal:
      '70% of carts are abandoned. A 3-email recovery sequence converts 15% of those — zero ad spend required.',
    upside: '+45% revenue',
    color: '#2bc4e8',
  },
  {
    type: 'B2B Agency',
    headline: 'Double MRR by Activating Your Referral Engine This Week',
    signal:
      'Referral leads close at 25% vs 5% cold. If you have 5+ happy clients and no referral programme, start today.',
    upside: '+120% MRR',
    color: '#f0c840',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="font-heading text-xl text-white tracking-wide">Starcoins</span>
        <div className="flex gap-3">
          <Link
            href="/auth/signin"
            className="text-sm text-muted hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/analyse"
            className="text-sm bg-accent text-bg font-medium px-4 py-1.5 rounded-pill hover:bg-opacity-90 transition-all"
          >
            Try free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green/10 border border-green/30 text-green text-sm px-4 py-1.5 rounded-pill mb-8 font-mono">
          ✦ First analysis completely free
        </div>
        <h1 className="font-heading text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
          Business Strategy in{' '}
          <span className="text-gold">60 seconds.</span>
        </h1>
        <p className="text-lg text-muted leading-relaxed mb-10 max-w-xl mx-auto font-sans">
          Describe your situation. Ask your hardest question. AI gives you a targeted
          strategy — with real numbers, backed by industry benchmarks.
        </p>
        <Link
          href="/analyse"
          className="inline-flex items-center gap-2 bg-green text-bg font-medium text-base px-8 py-3.5 rounded-pill hover:shadow-green transition-all"
        >
          Try it free →
        </Link>
        <p className="text-sm text-muted mt-4">No credit card. Results in under a minute.</p>
      </section>

      {/* Sample strategy cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <p className="text-center text-sm text-muted font-mono mb-8 uppercase tracking-widest">
          Sample strategies
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {SAMPLE_CARDS.map((card) => (
            <div
              key={card.type}
              className="bg-card border border-border rounded-card p-6 flex flex-col gap-4 hover:border-opacity-60 transition-all"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-chip"
                  style={{ background: card.color + '20', color: card.color }}
                >
                  {card.type}
                </span>
                <span
                  className="text-xs font-mono font-semibold px-2 py-1 rounded-chip"
                  style={{ background: '#f0c84020', color: '#f0c840' }}
                >
                  {card.upside}
                </span>
              </div>
              <h3 className="font-heading text-lg text-white leading-snug">{card.headline}</h3>
              <p className="text-sm text-muted leading-relaxed font-sans">{card.signal}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted font-mono">
        © {new Date().getFullYear()} Starcoins Strategy AI · Powered by Claude · $3/analysis after free trial
      </footer>
    </main>
  )
}
