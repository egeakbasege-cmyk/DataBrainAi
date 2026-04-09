import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'

const CASES = [
  {
    sector:   'Fitness',
    headline: 'Convert 3% of followers into paying clients in 90 days',
    stat:     'Industry avg: 3% conversion · Most trainers sit below 0.1%',
    upside:   '+180%',
  },
  {
    sector:   'E-Commerce',
    headline: 'Recover 15% of abandoned carts with one email sequence',
    stat:     '70% of carts abandoned · 3-email sequence recovers 15%',
    upside:   '+45%',
  },
  {
    sector:   'B2B Agency',
    headline: 'Double MRR by activating your referral engine this week',
    stat:     'Referral leads close at 25% vs 5% cold · 5× more effective',
    upside:   '+120%',
  },
]

const HOW = [
  {
    n:     '1',
    title: 'Describe your challenge',
    body:  'Tell Sail AI your situation in plain language — revenue model, audience size, your biggest obstacle right now.',
  },
  {
    n:     '2',
    title: 'Strategy generated in seconds',
    body:  'Intent classification → metric extraction → benchmark retrieval → validated strategy. All in real time.',
  },
  {
    n:     '3',
    title: 'Act on your plan',
    body:  'Three concrete steps, each tied to real industry benchmarks. A 30-day target and the single risk to watch.',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <Nav />

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pt-24 pb-20">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-8">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', display: 'inline-block', boxShadow: '0 0 8px rgba(192,57,43,0.6)' }} />
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            AI-Powered · Benchmark-Backed · 5 free analyses
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-bold text-balance mb-6"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: '1.06', letterSpacing: '-0.03em', color: '#F1F5F9', maxWidth: '16ch' }}
        >
          Business strategy,{' '}
          <span style={{ color: '#C0392B' }}>charted.</span>
        </h1>

        <div className="h-px w-20 mb-8" style={{ background: '#C0392B' }} />

        <p className="text-lg leading-relaxed mb-10" style={{ maxWidth: '44ch', color: '#94A3B8' }}>
          Describe your challenge. Get a benchmark-backed plan with three concrete steps — in under 60 seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href="/chat"
            className="group inline-flex items-center gap-3 font-semibold px-8 py-4 rounded-pill transition-all"
            style={{ background: '#C0392B', color: '#F1F5F9', fontSize: '1rem', boxShadow: '0 0 28px rgba(192,57,43,0.4)' }}
          >
            Start free analysis
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <span className="text-xs" style={{ color: '#94A3B8' }}>
            No account required · 5 analyses free
          </span>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.5)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 grid grid-cols-3 divide-x divide-white/[0.06]">
          {[
            { v: '< 60s', l: 'Time to strategy' },
            { v: '100%',  l: 'Benchmark-validated' },
            { v: '$4/mo', l: 'Pro plan' },
          ].map((s) => (
            <div key={s.l} className="px-6 md:px-10 first:pl-0 last:pr-0 flex flex-col gap-1.5">
              <span className="font-bold" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', letterSpacing: '-0.03em', color: '#F1F5F9' }}>
                {s.v}
              </span>
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#94A3B8' }}>{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample outputs ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-20">
        <div className="flex items-baseline justify-between mb-10">
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#94A3B8' }}>Sample outputs</span>
          <span className="text-sm italic" style={{ color: '#94A3B8' }}>real strategies, anonymised</span>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {CASES.map((c, i) => (
            <div
              key={i}
              className="group py-7 grid grid-cols-12 gap-4 items-center cursor-default transition-colors hover:bg-white/[0.02]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="col-span-1 hidden md:block">
                <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="col-span-3 md:col-span-2">
                <span
                  className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-pill"
                  style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B', border: '1px solid rgba(192,57,43,0.2)' }}
                >
                  {c.sector}
                </span>
              </div>
              <div className="col-span-7">
                <h3 className="font-semibold leading-snug mb-1.5" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)', color: '#F1F5F9' }}>
                  {c.headline}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{c.stat}</p>
              </div>
              <div className="col-span-2 text-right">
                <span className="font-bold" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.6rem)', letterSpacing: '-0.02em', color: '#F1F5F9' }}>
                  {c.upside}
                </span>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>uplift</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────── */}
      <section style={{ background: 'rgba(17,24,39,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20">
          <span className="text-xs font-medium uppercase tracking-widest block mb-14" style={{ color: '#94A3B8' }}>
            How it works
          </span>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW.map((h) => (
              <div key={h.n} className="rounded-card p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-5"
                  style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', color: '#C0392B' }}
                >
                  {h.n}
                </div>
                <h4 className="font-semibold text-lg mb-3" style={{ color: '#F1F5F9' }}>{h.title}</h4>
                <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="font-bold mb-2" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', letterSpacing: '-0.02em', color: '#F1F5F9' }}>
              Your first 5 analyses are free.
            </h2>
            <p className="text-sm" style={{ color: '#94A3B8' }}>No account. No credit card. Just answers.</p>
          </div>
          <Link
            href="/chat"
            className="group flex-shrink-0 inline-flex items-center gap-3 font-semibold px-8 py-4 rounded-pill transition-all"
            style={{ background: '#C0392B', color: '#F1F5F9', boxShadow: '0 0 24px rgba(192,57,43,0.35)' }}
          >
            Analyse for free
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer
        className="px-6 md:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <span className="font-bold text-sm" style={{ color: '#F1F5F9' }}>Sail AI</span>
        </div>
        <span className="text-xs" style={{ color: '#94A3B8' }}>
          © {new Date().getFullYear()} · AI-powered business strategy · $4/month after free tier
        </span>
      </footer>
    </main>
  )
}
