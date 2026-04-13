import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'
import { MicroAnalysis } from '@/components/MicroAnalysis'
import { CompassRose, EngravedSailboat } from '@/components/Ornaments'

/* ── Realistic outcome examples ───────────────────────
   Copy principles: measurable, qualified, no superlatives.
   All projections are time-bounded and verifiable.         */
const CASES = [
  {
    n:       '01',
    sector:  'E-Commerce',
    headline:'Structured checkout optimisation to close a 0.8-point conversion gap',
    detail:  'Median sector CVR: 2.3% · Client starting point: 1.5% · 90-day horizon',
    outcome: '+0.8pp CVR',
  },
  {
    n:       '02',
    sector:  'B2B SaaS',
    headline:'Onboarding sequence redesign to reduce month-1 churn from 12% to below 8%',
    detail:  'OpenView benchmark for sub-$2M ARR: 7–9% monthly churn · 60-day implementation',
    outcome: '−4pp churn',
  },
  {
    n:       '03',
    sector:  'Professional Services',
    headline:'Referral programme implementation targeting 20% of new clients from existing base',
    detail:  'Industry average referral rate: 18–22% of new business · Standard payback: <45 days',
    outcome: '+20% new clients',
  },
]

const HOW = [
  {
    n:     '01',
    title: 'Describe your situation',
    body:  'Provide your sector, one or two key metrics, and the primary constraint you are working against. Plain language is sufficient.',
  },
  {
    n:     '02',
    title: 'Receive a benchmarked analysis',
    body:  'The system retrieves relevant industry benchmarks, compares your position, and identifies the highest-leverage action available to you.',
  },
  {
    n:     '03',
    title: 'A clear, executable plan',
    body:  'Three specific actions with defined timeframes, a realistic 30-day target, and the single risk most likely to undermine execution.',
  },
]

/* ── Divider component ───────────────────────────────── */
function Rule() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.09)' }} />
}

export default function LandingPage() {
  return (
    <main style={{ background: '#FAFAF8', paddingBottom: '6rem' }}>
      <Nav />

      {/* ══════════════════════════════════════════════
          HERO — Swiss typographic statement
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E', paddingBottom: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Hero background photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sail-vertical.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position:   'absolute',
            inset:      0,
            width:      '100%',
            height:     '100%',
            objectFit:  'cover',
            objectPosition: 'center top',
            opacity:    0.18,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-20 md:pt-28">

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A96E' }}>
              AI Business Advisory
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.2)' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
              Est. 2024
            </span>
          </div>

          {/* Headline grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>
            <div>
              <h1
                style={{
                  fontFamily:    'Cormorant Garamond, Georgia, serif',
                  fontSize:      'clamp(3.5rem, 7vw, 6rem)',
                  fontWeight:    600,
                  fontStyle:     'italic',
                  lineHeight:    1.04,
                  letterSpacing: '-0.025em',
                  color:         '#FFFFFF',
                  maxWidth:      '16ch',
                }}
              >
                Strategy grounded
                in{' '}
                <span style={{ color: '#C9A96E' }}>evidence.</span>
              </h1>

              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize:   '1rem',
                  lineHeight: 1.75,
                  color:      'rgba(255,255,255,0.5)',
                  maxWidth:   '48ch',
                  marginTop:  '1.75rem',
                  fontWeight: 300,
                }}
              >
                Sail AI delivers benchmarked business strategy for independent operators.
                Each analysis draws on verified industry data — not heuristics —
                and is calibrated to your specific numbers.
              </p>

              <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/login" className="btn-primary">
                  Begin analysis →
                </Link>
                <Link href="/pricing" className="btn-ghost-white">
                  View plans
                </Link>
              </div>

              <p style={{ marginTop: '1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                5 analyses included at no cost · Unbiased, Data-Driven Strategy.
              </p>
            </div>
          </div>

          {/* ── Micro-analysis preview strip ──────────── */}
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
              Preview — instant insight
            </p>
            <MicroAnalysis />
          </div>

          {/* Sailboat visual — decorative, below fold */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '3rem', opacity: 0.28, pointerEvents: 'none', transform: 'scale(1.1)', transformOrigin: 'right bottom' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CompassRose size={260} color="#C9A96E" opacity={0.4} />
              </div>
              <EngravedSailboat size={200} color="#FFFFFF" opacity={0.7} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS BAR — 4-column, gold accent numbers
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#111318', borderBottom: '1px solid rgba(201,169,110,0.12)' }}>
        <div
          className="max-w-6xl mx-auto px-6 md:px-10"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}
        >
          {[
            { v: '< 60s',   l: 'Time to analysis',     sub: 'From input to full plan' },
            { v: '100%',    l: 'Benchmark-referenced',  sub: 'Every data point sourced' },
            { v: '5 free',  l: 'Analyses included',     sub: 'No credit card required' },
            { v: '3 tiers', l: 'Transparent pricing',   sub: 'From $0 to advisory' },
          ].map((s, i) => (
            <div
              key={s.l}
              style={{
                padding:      'clamp(1.25rem,3vw,2rem) clamp(1rem,2.5vw,2rem)',
                borderRight:  i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                display:      'flex',
                flexDirection:'column',
                gap:          '0.15rem',
              }}
            >
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.6rem,2.8vw,2.2rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#C9A96E', lineHeight: 1, margin: 0 }}>
                {s.v}
              </p>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: '0.35rem', display: 'block' }}>
                {s.l}
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', display: 'block' }}>
                {s.sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SAMPLE OUTCOMES
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF8' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <span className="label-caps">Indicative outputs</span>
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#71717A' }}>
              Realistic projections, qualified by source data
            </span>
          </div>

          <Rule />

          {CASES.map((c, i) => (
            <div
              key={c.n}
              style={{
                display:       'grid',
                gridTemplateColumns: '2.5rem 1fr auto',
                gap:           '1.5rem',
                alignItems:    'center',
                padding:       '1.75rem 0',
                borderBottom:  '1px solid rgba(0,0,0,0.07)',
              }}
            >
              {/* Number */}
              <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.8rem', color: '#D4D4D8', fontWeight: 600 }}>
                {c.n}
              </span>

              {/* Content */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0C0C0E', padding: '2px 8px', border: '1px solid rgba(0,0,0,0.14)' }}>
                    {c.sector}
                  </span>
                </div>
                <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: '#0C0C0E', lineHeight: 1.4, marginBottom: '0.375rem' }}>
                  {c.headline}
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', lineHeight: 1.5 }}>
                  {c.detail}
                </p>
              </div>

              {/* Outcome */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', fontWeight: 700, color: '#C9A96E', lineHeight: 1, display: 'block' }}>
                  {c.outcome}
                </span>
                <span className="label-caps" style={{ display: 'block', marginTop: '0.2rem' }}>est. outcome</span>
              </div>
            </div>
          ))}

          {/* Disclaimer */}
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', lineHeight: 1.6, marginTop: '1.25rem', maxWidth: '60ch' }}>
            Projections are indicative, based on published industry benchmarks. Individual results depend on execution quality and market conditions.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          MODE CARDS — Upwind vs Downwind
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF8', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <span className="label-caps">Two modes</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {[
              {
                icon:   '🧭',
                name:   'Upwind',
                tag:    'Direct Mode',
                desc:   'Feed your numbers and get an instant, benchmark-grounded action plan. No clarifying questions — sparse data is filled from sector medians and labelled accordingly.',
                detail: 'Best for: operators who know their metrics and need fast execution clarity.',
                color:  '#1A5276',
                bg:     'rgba(26,82,118,0.05)',
                border: 'rgba(26,82,118,0.18)',
              },
              {
                icon:   '🌊',
                name:   'Downwind',
                tag:    'Guided Mode',
                desc:   'Begin with a diagnostic summary, then follow a Socratic coaching flow. Each recommendation is explained with the reasoning behind it.',
                detail: 'Best for: founders working through ambiguity who want to understand the why.',
                color:  '#00695C',
                bg:     'rgba(0,150,136,0.05)',
                border: 'rgba(0,150,136,0.18)',
              },
            ].map(m => (
              <div
                key={m.name}
                style={{
                  padding:      '1.75rem',
                  background:    m.bg,
                  border:       `1px solid ${m.border}`,
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
                  <div>
                    <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color: m.color, display: 'block', lineHeight: 1.1 }}>
                      {m.name}
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: m.color, opacity: 0.7 }}>
                      {m.tag}
                    </span>
                  </div>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.7, color: '#0C0C0E', fontWeight: 300, marginBottom: '0.875rem' }}>
                  {m.desc}
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', lineHeight: 1.5, borderTop: `1px solid ${m.border}`, paddingTop: '0.875rem', margin: 0 }}>
                  {m.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURES ROW — voice, file, export, dashboard
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <span className="label-caps">Capabilities</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0' }}>
            {[
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="11" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="9" y1="22" x2="15" y2="22"/>
                  </svg>
                ),
                title: 'Voice Input',
                body:  'Dictate your situation in English or Turkish. Transcript added directly to the input field.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                ),
                title: 'File & Image Upload',
                body:  'Attach CSV, XLSX, PDF, or screenshots. Data is parsed and synthesised into the analysis.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M4 4h16v2H4z"/><path d="M4 10h10"/><path d="M4 16h7"/>
                    <path d="M15 14l5 5m0-5l-5 5"/>
                  </svg>
                ),
                title: 'Email Export',
                body:  'Send the full strategy report — headline, tactics, benchmarks, targets — directly to your inbox.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                title: 'Analytics Dashboard',
                body:  'Track every analysis you run. Weekly and monthly charts show your strategic momentum over time.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M3 3l18 18M3 21L21 3"/>
                  </svg>
                ),
                title: 'Session Memory',
                body:  'Prior strategies are stored in context. Each new analysis builds on what came before.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                ),
                title: 'Benchmark Engine',
                body:  'Every output references verified industry data. User metrics are compared against sector medians.',
              },
            ].map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding:      '1.5rem',
                  borderRight:  i % 3 < 2 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                  borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                }}
              >
                <div style={{ marginBottom: '0.875rem' }}>{f.svg}</div>
                <h5 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: '#0C0C0E', marginBottom: '0.375rem', letterSpacing: '0.02em' }}>
                  {f.title}
                </h5>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS — numbered list, Swiss grid
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.09)', borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3.5rem' }}>
            <span className="label-caps">Methodology</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0' }}>
            {HOW.map((h, i) => (
              <div
                key={h.n}
                style={{
                  padding:     '2rem',
                  borderRight: i < HOW.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderLeft:  i === 0 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderTop:   '1px solid rgba(0,0,0,0.09)',
                  borderBottom:'1px solid rgba(0,0,0,0.09)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2.5rem', fontWeight: 700, color: 'rgba(0,0,0,0.06)', lineHeight: 1 }}>
                    {h.n}
                  </span>
                  <div style={{ width: 24, height: 2, background: '#C9A96E', marginTop: '1rem' }} />
                </div>
                <h4 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.15rem', fontWeight: 600, color: '#0C0C0E', marginBottom: '0.625rem' }}>
                  {h.title}
                </h4>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.75, color: '#71717A', fontWeight: 300 }}>
                  {h.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA — dark, minimal
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <Rule />
          <div style={{ paddingTop: '3rem', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Your first five analyses are complimentary.
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', fontWeight: 300 }}>
                Zero friction. No payment details. Professional-grade strategy, validated by data.
              </p>
            </div>
            <Link href="/login" className="btn-ghost-white" style={{ flexShrink: 0 }}>
              Begin →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.09)', padding: '1.75rem 0' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Logo size={20} />
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600, color: '#0C0C0E', fontSize: '0.875rem', letterSpacing: '0.08em' }}>
              SAIL AI
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link href="/chat" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              Chat
            </Link>
            <Link href="/dashboard" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              Dashboard
            </Link>
            <Link href="/pricing" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              Pricing
            </Link>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#A1A1AA', letterSpacing: '0.04em' }}>
              © {new Date().getFullYear()} Sail AI
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
