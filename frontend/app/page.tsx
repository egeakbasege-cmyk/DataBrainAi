'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Dock } from '../components/Dock'

const CASES = [
  {
    index:   '01',
    sector:  'Fitness',
    headline: 'Convert 3% of followers into paying clients in 90 days',
    stat:    'Industry conversion avg: 3% · Most trainers sit below 0.1%',
    upside:  '+180%',
  },
  {
    index:   '02',
    sector:  'E-Commerce',
    headline: 'Recover 15% of abandoned carts with one email sequence',
    stat:    '70% of carts are abandoned · 3-email recovery closes 15% of them',
    upside:  '+45%',
  },
  {
    index:   '03',
    sector:  'B2B Agency',
    headline: 'Double MRR by activating your referral engine this week',
    stat:    'Referral leads close at 25% vs 5% cold · 5× more effective',
    upside:  '+120%',
  },
]

const STATS = [
  { value: '< 60s', label: 'Time to strategy'   },
  { value: '100%',  label: 'Benchmark-validated' },
  { value: '$0',    label: 'First analysis'       },
]

export default function LandingPage() {
  const { data: session } = useSession()
  const loggedIn = !!session

  return (
    <main className="min-h-screen bg-bg pb-28">

      {/* ── Top bar ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4"
        style={{
          background:     'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom:   '1px solid rgba(229,231,235,0.8)',
        }}>
        <span className="font-heading font-bold text-ink text-sm tracking-tight">
          Starcoins
        </span>
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link href="/analyse"
              className="font-heading font-bold text-sm text-ink px-5 py-2 rounded-pill transition-all glow-yellow"
              style={{ background: '#FACC15' }}>
              Go to app →
            </Link>
          ) : (
            <>
              <Link href="/auth/signin"
                className="font-sans text-sm text-dim hover:text-ink transition-colors px-4 py-2 rounded-pill">
                Sign in
              </Link>
              <Link href="/auth/signup"
                className="font-heading font-bold text-sm text-ink px-5 py-2 rounded-pill transition-all glow-yellow"
                style={{ background: '#FACC15' }}>
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16">

        {/* Label */}
        <div className="flex items-center gap-2 mb-8">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FACC15', display: 'inline-block', boxShadow: '0 0 8px rgba(250,204,21,0.5)' }} />
          <span className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">
            AI-Powered · Benchmark-Backed · Free to start
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-heading font-extrabold text-ink mb-6"
          style={{ fontSize: 'clamp(2.75rem, 6.5vw, 5rem)', lineHeight: '1.06', letterSpacing: '-0.03em', maxWidth: '14ch' }}>
          Strategy that moves your business forward.
        </h1>

        {/* Rule */}
        <div className="h-px w-24 mb-8" style={{ background: '#FACC15' }} />

        {/* Subheading */}
        <p className="font-sans text-dim text-lg leading-relaxed mb-10"
          style={{ maxWidth: '46ch', fontWeight: 400 }}>
          Describe your challenge. Get a data-backed plan with real industry benchmarks — in under 60 seconds.
        </p>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link href="/analyse"
            className="group inline-flex items-center gap-3 font-heading font-bold text-ink px-8 py-4 rounded-pill transition-all glow-yellow"
            style={{ background: '#FACC15', fontSize: '1rem' }}>
            Start free analysis
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </Link>
          <span className="font-sans text-xs text-muted">
            No credit card &nbsp;·&nbsp; Results in under a minute
          </span>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 grid grid-cols-3 divide-x divide-border">
          {STATS.map((s) => (
            <div key={s.label} className="px-6 md:px-10 first:pl-0 last:pr-0 flex flex-col gap-1.5">
              <span className="font-heading font-extrabold text-ink"
                style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                {s.value}
              </span>
              <span className="font-sans text-xs text-muted font-medium uppercase tracking-widest-2">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample outputs ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-20">
        <div className="flex items-baseline justify-between mb-10">
          <span className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">
            Sample outputs
          </span>
          <span className="font-sans text-sm text-muted italic">real strategies, anonymised</span>
        </div>

        <div className="divide-y divide-border">
          {CASES.map((c) => (
            <div key={c.index}
              className="card-hover group py-7 grid grid-cols-12 gap-4 items-center cursor-default">

              {/* Index */}
              <div className="col-span-1 hidden md:block">
                <span className="font-mono text-xs text-muted">{c.index}</span>
              </div>

              {/* Sector tag */}
              <div className="col-span-3 md:col-span-2">
                <span className="inline-flex items-center font-sans text-xs font-medium px-3 py-1 rounded-pill"
                  style={{ background: 'rgba(250,204,21,0.10)', color: '#92400E', border: '1px solid rgba(250,204,21,0.25)' }}>
                  {c.sector}
                </span>
              </div>

              {/* Headline */}
              <div className="col-span-7 md:col-span-7">
                <h3 className="font-heading font-bold text-ink leading-snug mb-1.5"
                  style={{ fontSize: 'clamp(1rem, 1.6vw, 1.2rem)' }}>
                  {c.headline}
                </h3>
                <p className="font-sans text-xs text-muted leading-relaxed">{c.stat}</p>
              </div>

              {/* Upside */}
              <div className="col-span-2 text-right">
                <span className="font-heading font-extrabold text-ink"
                  style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', letterSpacing: '-0.02em' }}>
                  {c.upside}
                </span>
                <p className="font-sans text-xs text-muted mt-0.5">uplift</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20">
          <div className="mb-14">
            <span className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">
              How it works
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step:  '1',
                title: 'Describe your business',
                body:  'Tell us your situation in plain language — revenue model, audience size, and your biggest challenge right now.',
              },
              {
                step:  '2',
                title: 'Pipeline runs in real time',
                body:  'Intent classification → benchmark retrieval → strategy generation → validation. 7 steps, zero hallucination.',
              },
              {
                step:  '3',
                title: 'Act on your strategy',
                body:  'Three concrete steps, each tied to a real industry metric. A weekly priority and a risk to watch.',
              },
            ].map((item) => (
              <div key={item.step}
                className="p-6 rounded-card bg-card border border-border"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.3)' }}>
                  <span className="font-heading font-bold text-ink text-sm">{item.step}</span>
                </div>
                <h4 className="font-heading font-bold text-ink text-lg mb-3">{item.title}</h4>
                <p className="font-sans text-sm text-dim leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Project vision / About ────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2 block mb-6">
              Our vision
            </span>
            <h2 className="font-heading font-extrabold text-ink mb-5"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', letterSpacing: '-0.03em' }}>
              Real data. Instant clarity.
            </h2>
            <p className="font-sans text-dim leading-relaxed mb-4">
              Most businesses run on gut instinct. We built Starcoins to change that — giving every founder access to the kind of benchmark-backed strategy that used to require expensive consultants.
            </p>
            <p className="font-sans text-dim leading-relaxed">
              Every strategy is grounded in real industry data. Not generated text. Not guesswork. Numbers you can act on, today.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Benchmark-validated', desc: 'Every metric comes from verified industry databases, not AI estimation.' },
              { label: 'No hallucinations',   desc: '7-step pipeline with validation layers to ensure output quality.' },
              { label: 'Privacy-first',        desc: 'Your business data is never stored beyond your session.' },
            ].map((item) => (
              <div key={item.label}
                className="flex items-start gap-4 p-4 rounded-card border border-border bg-surface">
                <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#92400E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-ink mb-0.5">{item.label}</p>
                  <p className="font-sans text-xs text-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="font-heading font-extrabold text-ink mb-2"
              style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)', letterSpacing: '-0.02em' }}>
              Your first strategy is free.
            </h2>
            <p className="font-sans text-sm text-muted">No signup required to begin.</p>
          </div>
          <Link href="/analyse"
            className="group flex-shrink-0 inline-flex items-center gap-3 font-heading font-bold text-ink px-8 py-4 rounded-pill transition-all glow-yellow"
            style={{ background: '#FACC15' }}>
            Analyse for free
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-border px-6 md:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <span className="font-heading font-bold text-sm text-ink">Starcoins</span>
        <span className="font-sans text-xs text-muted">
          © {new Date().getFullYear()} · AI-powered strategy · $3 per analysis after free trial
        </span>
      </footer>

      <Dock />
    </main>
  )
}
