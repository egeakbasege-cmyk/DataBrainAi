'use client'

import Link from 'next/link'

const CASES = [
  {
    index:    '01',
    sector:   'Fitness',
    headline: 'Convert 3% of followers into paying clients in 90 days',
    stat:     'Industry conversion avg: 3% · Most trainers sit below 0.1%',
    upside:   '+180%',
    color:    '#1ed48a',
  },
  {
    index:    '02',
    sector:   'E-Commerce',
    headline: 'Recover 15% of abandoned carts with one email sequence',
    stat:     '70% of carts are abandoned · 3-email recovery closes 15% of them',
    upside:   '+45%',
    color:    '#18b8e0',
  },
  {
    index:    '03',
    sector:   'B2B Agency',
    headline: 'Double MRR by activating your referral engine this week',
    stat:     'Referral leads close at 25% vs 5% cold · 5× more effective',
    upside:   '+120%',
    color:    '#e8bb28',
  },
]

const STATS = [
  { value: '< 60s',  label: 'Time to strategy'      },
  { value: '100%',   label: 'Benchmark-validated'    },
  { value: '$0',     label: 'First analysis'         },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ background: 'rgba(7,8,14,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="font-mono text-xs tracking-widest-2 text-ink uppercase">
          Starcoins
        </span>
        <div className="flex items-center gap-6">
          <Link href="/auth/signin"
            className="font-mono text-xs text-muted hover:text-ink transition-colors tracking-wider uppercase">
            Sign in
          </Link>
          <Link href="/analyse"
            className="font-mono text-xs tracking-wider uppercase px-4 py-2 border border-green/40 text-green rounded-pill hover:bg-green/8 hover:border-green/70 transition-all">
            Try free →
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center px-8 md:px-16 pt-20">

        {/* Background editorial number */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 select-none pointer-events-none hidden lg:block"
          aria-hidden="true">
          <span className="editorial-number">AI</span>
        </div>

        <div className="max-w-4xl relative z-10">
          {/* Label */}
          <div className="flex items-center gap-3 mb-10">
            <span className="h-px w-8 bg-green block" />
            <span className="font-mono text-2xs text-green uppercase tracking-widest-2">
              Business Intelligence · Free to try
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-heading font-semibold text-ink mb-6"
            style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', lineHeight: '1.06', letterSpacing: '-0.02em' }}>
            Business strategy<br />
            <em style={{ color: '#e8bb28', fontStyle: 'italic' }}>in 60 seconds.</em>
          </h1>

          {/* Rule */}
          <div className="h-px bg-border w-full max-w-lg mb-8" />

          {/* Sub */}
          <p className="text-dim font-sans text-lg leading-relaxed max-w-xl mb-12"
            style={{ fontWeight: 300 }}>
            Describe your situation. Ask your hardest question.
            Get a targeted strategy — with real numbers,
            backed by industry benchmarks.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Link href="/analyse"
              className="group inline-flex items-center gap-3 bg-green text-bg font-mono text-sm font-medium px-7 py-3.5 rounded-pill glow-green transition-all">
              Begin analysis
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <p className="font-mono text-2xs text-muted uppercase tracking-widest">
              No credit card &nbsp;·&nbsp; Results in under a minute
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────── */}
      <section className="border-y border-border">
        <div className="max-w-5xl mx-auto px-8 md:px-16 py-10 grid grid-cols-3 divide-x divide-border">
          {STATS.map((s) => (
            <div key={s.label} className="px-8 first:pl-0 last:pr-0 flex flex-col gap-1">
              <span className="font-heading text-3xl text-gradient-gold" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>
                {s.value}
              </span>
              <span className="font-mono text-2xs text-muted uppercase tracking-widest">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample cases ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 md:px-16 py-24">
        <div className="flex items-baseline justify-between mb-12">
          <span className="font-mono text-2xs text-muted uppercase tracking-widest-2">
            Sample outputs
          </span>
          <span className="font-heading text-dim text-sm italic">real strategies, anonymised</span>
        </div>

        <div className="space-y-0">
          {CASES.map((c, i) => (
            <div
              key={c.index}
              className="card-hover group border-t border-border py-8 grid grid-cols-12 gap-6 items-start cursor-default"
              style={{ borderBottom: i === CASES.length - 1 ? '1px solid var(--border)' : undefined }}
            >
              {/* Index */}
              <div className="col-span-1">
                <span className="font-mono text-2xs text-muted">{c.index}</span>
              </div>

              {/* Sector tag */}
              <div className="col-span-2">
                <span className="font-mono text-2xs uppercase tracking-widest"
                  style={{ color: c.color }}>
                  {c.sector}
                </span>
              </div>

              {/* Headline */}
              <div className="col-span-6">
                <h3 className="font-heading text-xl text-ink leading-snug mb-2 group-hover:text-gradient-green transition-all"
                  style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)' }}>
                  {c.headline}
                </h3>
                <p className="font-mono text-2xs text-muted leading-relaxed">{c.stat}</p>
              </div>

              {/* Upside */}
              <div className="col-span-3 text-right">
                <span className="font-heading text-2xl font-semibold"
                  style={{ color: c.color, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}>
                  {c.upside}
                </span>
                <p className="font-mono text-2xs text-muted mt-1">revenue uplift</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-8 md:px-16 py-20">
          <div className="flex items-baseline justify-between mb-14">
            <span className="font-mono text-2xs text-muted uppercase tracking-widest-2">
              How it works
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Describe your business',
                body:  'Tell us your situation in plain language. Revenue, model, challenge — whatever is most pressing.',
              },
              {
                step: '2',
                title: 'Pipeline runs in real time',
                body:  'Intent classification → benchmark retrieval → strategy generation → metric validation. 7 steps, zero hallucination.',
              },
              {
                step: '3',
                title: 'Get a numbered strategy',
                body:  'Three concrete actions, each tied to a real metric. A weekly priority. A risk to watch.',
              },
            ].map((item) => (
              <div key={item.step} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xs text-green">{item.step}.</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h4 className="font-heading text-xl text-ink">{item.title}</h4>
                <p className="font-sans text-sm text-dim leading-relaxed" style={{ fontWeight: 300 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-8 md:px-16 py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="font-heading text-ink mb-2"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: '1.1' }}>
              Your first strategy is free.
            </h2>
            <p className="font-mono text-2xs text-muted tracking-wider">
              No signup required to begin.
            </p>
          </div>
          <Link href="/analyse"
            className="group flex-shrink-0 inline-flex items-center gap-3 border border-green/40 text-green font-mono text-sm px-8 py-3.5 rounded-pill hover:bg-green hover:text-bg hover:border-green transition-all glow-green">
            Start for free
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-border px-8 md:px-16 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <span className="font-mono text-2xs text-muted tracking-widest uppercase">
          Starcoins Strategy AI
        </span>
        <span className="font-mono text-2xs text-muted">
          © {new Date().getFullYear()} · Powered by Claude · $3 per analysis after free trial
        </span>
      </footer>
    </main>
  )
}
