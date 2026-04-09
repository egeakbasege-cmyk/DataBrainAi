import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'
import { CompassRose, OrnamentRule, WaveRule, EngravedSailboat, AnchorIcon } from '@/components/Ornaments'

const CASES = [
  { n: '01', sector: 'Personal Training', headline: 'Convert 3% of your 2,400 followers into paying clients', stat: 'Industry avg: 3% conversion · Most coaches sit below 0.1%', upside: '+180%' },
  { n: '02', sector: 'E-Commerce',        headline: 'Recover 15% of abandoned carts with one email sequence', stat: '70% of carts abandoned · 3-email sequence recovers 15%',  upside: '+45%'  },
  { n: '03', sector: 'B2B Agency',        headline: 'Double MRR by activating your referral engine this week', stat: 'Referral leads close at 25% vs 5% cold outreach',          upside: '+120%' },
]

export default function LandingPage() {
  return (
    <main style={{ background: '#FAFAF5' }}>
      <Nav />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left — editorial headline */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <AnchorIcon size={14} color="#2B4A2A" opacity={0.5} />
              <span className="label-caps" style={{ color: '#7A7062' }}>
                Premium AI advisory · Est. 2024
              </span>
            </div>

            <h1
              className="font-serif text-balance"
              style={{
                fontSize:      'clamp(2.8rem, 5vw, 4.5rem)',
                lineHeight:    '1.08',
                letterSpacing: '-0.025em',
                color:         '#1A1814',
                fontStyle:     'italic',
              }}
            >
              Business strategy,{' '}
              <span style={{ color: '#2B4A2A' }}>charted.</span>
            </h1>

            <div className="my-7">
              <WaveRule color="#2B4A2A" opacity={0.3} />
            </div>

            <p className="text-base leading-relaxed mb-10" style={{ color: '#7A7062', fontFamily: 'Jost', maxWidth: '42ch', fontWeight: 300 }}>
              For the small business owner who expects the same quality of advice as the world&apos;s best advisory firms — delivered in under 60 seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link href="/chat" className="btn-primary">
                Begin your analysis →
              </Link>
              <Link href="/pricing" className="btn-ghost">
                View plans
              </Link>
            </div>

            <p className="mt-5 text-xs" style={{ color: '#7A7062', fontFamily: 'Jost', letterSpacing: '0.06em' }}>
              Five analyses complimentary · No account required
            </p>
          </div>

          {/* Right — engraved sailboat visual */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              {/* Background compass rose */}
              <div className="absolute" style={{ opacity: 0.35 }}>
                <CompassRose size={220} color="#2B4A2A" opacity={1} />
              </div>
              {/* Engraved sailboat */}
              <EngravedSailboat size={200} color="#2B4A2A" opacity={0.85} />
            </div>
            <p
              className="font-serif italic text-center"
              style={{ color: '#7A7062', fontSize: '0.95rem', maxWidth: '28ch' }}
            >
              &ldquo;Every great voyage begins with a chart.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(26,24,20,0.1)', borderBottom: '1px solid rgba(26,24,20,0.1)', background: '#F0EBE0' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 grid grid-cols-3 divide-x divide-parchment">
          {[
            { v: '< 60s',  l: 'Time to strategy' },
            { v: '100%',   l: 'Benchmark-validated' },
            { v: '$4/mo',  l: 'Pro plan' },
          ].map((s) => (
            <div key={s.l} className="px-6 md:px-12 first:pl-0 last:pr-0">
              <p
                className="font-serif font-semibold"
                style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', letterSpacing: '-0.03em', color: '#1A1814' }}
              >
                {s.v}
              </p>
              <span className="label-caps" style={{ color: '#7A7062' }}>{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample outcomes ──────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-20">
        <div className="flex items-end justify-between mb-10">
          <span className="label-caps">Sample outcomes</span>
          <span className="font-serif italic text-sm" style={{ color: '#7A7062' }}>
            Real strategies, anonymised
          </span>
        </div>

        <OrnamentRule />

        <div style={{ borderBottom: '1px solid rgba(26,24,20,0.1)' }}>
          {CASES.map((c) => (
            <div
              key={c.n}
              className="group py-8 grid grid-cols-12 gap-4 items-center"
              style={{ borderBottom: '1px solid rgba(26,24,20,0.08)', transition: 'background 0.15s' }}
            >
              <div className="col-span-1">
                <span className="font-serif" style={{ fontSize: '0.85rem', color: '#E5DECE' }}>{c.n}</span>
              </div>
              <div className="col-span-2">
                <span
                  className="label-caps px-2.5 py-1"
                  style={{ border: '1px solid rgba(43,74,42,0.25)', color: '#2B4A2A', background: 'rgba(43,74,42,0.06)' }}
                >
                  {c.sector}
                </span>
              </div>
              <div className="col-span-7">
                <p className="font-serif font-medium leading-snug mb-1.5" style={{ fontSize: 'clamp(0.95rem, 1.4vw, 1.12rem)', color: '#1A1814', fontStyle: 'italic' }}>
                  {c.headline}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#7A7062', fontFamily: 'Jost' }}>{c.stat}</p>
              </div>
              <div className="col-span-2 text-right">
                <span className="font-serif font-bold" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.8rem)', color: '#2B4A2A' }}>
                  {c.upside}
                </span>
                <p className="label-caps" style={{ color: '#7A7062' }}>uplift</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section style={{ background: '#F0EBE0', borderTop: '1px solid rgba(26,24,20,0.1)', borderBottom: '1px solid rgba(26,24,20,0.1)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div className="flex items-center gap-6 mb-14">
            <span className="label-caps">How it works</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(26,24,20,0.1)' }} />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: 'I',   title: 'Describe your challenge', body: 'Tell Sail AI your situation in plain language — revenue model, audience size, your biggest obstacle.' },
              { n: 'II',  title: 'Strategy in seconds',     body: 'Metric extraction → benchmark retrieval → validated strategy plan. Delivered in real time.' },
              { n: 'III', title: 'Act on your plan',        body: 'Three concrete steps tied to real benchmarks. A 30-day target and the single risk to avoid.' },
            ].map((h) => (
              <div key={h.n} className="card-cream p-6">
                <p className="font-serif font-bold mb-5" style={{ fontSize: '1.5rem', color: '#C4973A', opacity: 0.7 }}>
                  {h.n}
                </p>
                <h4 className="font-serif font-semibold text-lg mb-3" style={{ color: '#1A1814' }}>{h.title}</h4>
                <p className="text-sm leading-relaxed" style={{ color: '#7A7062', fontFamily: 'Jost', fontWeight: 300 }}>{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="font-serif italic mb-2" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', color: '#1A1814' }}>
              Your first five analyses are complimentary.
            </h2>
            <p className="text-sm" style={{ color: '#7A7062', fontFamily: 'Jost' }}>
              No account. No card. Just answers.
            </p>
          </div>
          <Link href="/chat" className="btn-primary flex-shrink-0">
            Begin →
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer
        className="px-6 md:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ borderTop: '1px solid rgba(26,24,20,0.1)' }}
      >
        <div className="flex items-center gap-3">
          <Logo size={22} />
          <span className="font-serif font-semibold tracking-widest" style={{ color: '#2B4A2A', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
            SAIL AI
          </span>
        </div>
        <span className="text-xs" style={{ color: '#7A7062', fontFamily: 'Jost', letterSpacing: '0.06em' }}>
          © {new Date().getFullYear()} · Premium AI strategy · $4 / month after free tier
        </span>
      </footer>
    </main>
  )
}
