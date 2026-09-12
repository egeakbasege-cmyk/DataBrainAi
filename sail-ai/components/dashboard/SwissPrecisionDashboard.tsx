'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Anchor, BarChart3, CheckCircle2, Compass, Eye, EyeOff, LayoutGrid, LockKeyhole, Map, Send, Settings2, Sparkles, TrendingDown, TrendingUp, Waves, X } from 'lucide-react'

type Tab = 'overview' | 'analytics' | 'strategy' | 'settings'
type AIMode = 'explore' | 'diagnose' | 'strategize'

const metrics = [
  { label: 'MRR', value: '$48.2K', delta: '+12.4%', note: 'vs. last month', up: true },
  { label: 'Growth', value: '3.8×', delta: '+0.6×', note: 'YoY expansion', up: true },
  { label: 'CAC', value: '$124', delta: '−8.2%', note: 'cost per customer', up: true },
  { label: 'Churn', value: '1.9%', delta: '−0.4pp', note: 'monthly churn', up: true },
]
const sectors = [
  { name: 'SaaS B2B', score: 91, delta: '+4', route: '10–50k' },
  { name: 'PLG SaaS', score: 85, delta: '+6', route: '10–50k' },
  { name: 'E-Commerce', score: 73, delta: '+2', route: '0–10k' },
  { name: 'Marketplace', score: 78, delta: '−1', route: '10–50k' },
  { name: 'FinTech', score: 68, delta: '−3', route: '0–10k' },
]
const modes: { id: AIMode; label: string; description: string; icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explore', description: 'Map market signals', icon: Compass },
  { id: 'diagnose', label: 'Diagnose', description: 'Find revenue friction', icon: Map },
  { id: 'strategize', label: 'Strategize', description: 'Plot the next 90 days', icon: Anchor },
]

function TilePattern({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`tile-pattern pointer-events-none absolute inset-0 ${className}`} />
}

function CompassRose() {
  return <div className="compass-rose" aria-hidden><div className="compass-needle" /><span>N</span><span>E</span><span>S</span><span>W</span></div>
}

function AzulejoHero() {
  return (
    <section className="az-hero relative overflow-hidden">
      <TilePattern className="opacity-30" />
      <div className="az-hero-ornament" aria-hidden><Waves /><CompassRose /></div>
      <div className="relative z-10 max-w-[510px]">
        <div className="az-kicker"><span className="az-dot" /> SAIL AI · INTELLIGENCE CHARTER</div>
        <h1 className="az-display mt-4">Chart the waters<br /><em>before they shift.</em></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[#DCF2F0]">A calm, precise view of the signals moving your revenue engine. Your next decision, marked clearly.</p>
        <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b9d5ff]"><span className="az-stamp">LIVE TIDE</span><span className="az-stamp">5 ROUTES OPEN</span></div>
      </div>
      <div className="az-hero-wave" aria-hidden />
    </section>
  )
}

function MetricCard({ metric, index }: { metric: typeof metrics[number]; index: number }) {
  return <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} className="az-card az-metric">
    <div className="az-card-corner" aria-hidden />
    <div className="az-label">{metric.label}</div><div className="az-metric-value">{metric.value}</div>
    <div className="flex items-center gap-2 text-xs"><span className={metric.up ? 'az-positive' : 'az-negative'}>{metric.up ? <TrendingUp data-icon="inline-start" /> : <TrendingDown data-icon="inline-start" />}{metric.delta}</span><span className="text-[#5a7191]">{metric.note}</span></div>
  </motion.article>
}

function Overview() {
  return <div className="flex flex-col gap-5"><AzulejoHero /><div><div className="az-section-title">Current position <span>01 / 04</span></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map((m, i) => <MetricCard key={m.label} metric={m} index={i} />)}</div></div><section className="az-signal"><Sparkles data-icon="inline-start" /><div><div className="az-label text-[#0c4da2]">KAIROS signal · just surfaced</div><p>Decision authority is migrating from IT Directors to Revenue Ops. Update outbound sequences before the Q4 budget lock.</p></div><button type="button" aria-label="Dismiss signal"><X /></button></section><section className="az-card az-route-card"><div className="az-section-title">Open routes <span>Recommended next readings</span></div><div className="grid gap-3 md:grid-cols-3"><div><div className="az-route-line"><span className="az-route-number">01</span><span>Retention currents</span><b>+18%</b></div><div className="az-route-bar"><i style={{ width: '82%' }} /></div></div><div><div className="az-route-line"><span className="az-route-number">02</span><span>Competitive drift</span><b>+11%</b></div><div className="az-route-bar"><i style={{ width: '64%' }} /></div></div><div><div className="az-route-line"><span className="az-route-number">03</span><span>Activation depth</span><b>+7%</b></div><div className="az-route-bar"><i style={{ width: '48%' }} /></div></div></div></section></div>
}

function Analytics() {
  return <div className="flex flex-col gap-5"><div className="az-page-heading"><div className="az-kicker"><BarChart3 data-icon="inline-start" /> MARKET CARTOGRAPHY</div><h2 className="az-display">Where the current<br /><em>is strongest.</em></h2><p>Signal density across your chosen sectors, normalized against the last 90 days.</p></div><section className="az-card p-5 md:p-7"><div className="az-section-title">Sector momentum <span>Signal strength / 100</span></div><div className="flex flex-col gap-5">{sectors.map((sector, i) => <div key={sector.name} className="az-sector-row"><div className="flex min-w-0 items-center gap-3"><span className="az-route-number">0{i + 1}</span><span className="font-semibold text-[#12345b]">{sector.name}</span><span className="text-xs text-[#6a84a5]">{sector.route}</span></div><div className="az-sector-track"><i style={{ width: `${sector.score}%` }} /></div><b className="text-sm text-[#0c4da2]">{sector.score}</b><span className={sector.delta.startsWith('+') ? 'az-positive' : 'az-negative'}>{sector.delta}</span></div>)}</div></section><div className="grid gap-5 md:grid-cols-2"><div className="az-card az-chart"><div className="az-section-title">Signal tide <span>Last 6 months</span></div><div className="chart-bars">{[42, 58, 48, 72, 67, 91].map((h, i) => <div key={i} className="chart-bar"><i style={{ height: `${h}%` }} /><span>{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'][i]}</span></div>)}</div></div><div className="az-card p-5"><div className="az-section-title">Reading notes <span>Field log</span></div><p className="mt-5 text-sm leading-6 text-[#476482]">B2B SaaS continues to hold the cleanest route to expansion. Watch marketplace churn for a possible downstream effect in the next cycle.</p><div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0c4da2]"><CheckCircle2 data-icon="inline-start" /> Analysis complete</div></div></div></div>
}

function Strategy() {
  const [mode, setMode] = useState<AIMode>('explore'); const [sector, setSector] = useState('SaaS B2B'); const [query, setQuery] = useState(''); const [loading, setLoading] = useState(false); const [message, setMessage] = useState('');
  async function submit() { if (!query.trim()) return; setLoading(true); setMessage('Reading the latest signals…'); try { const res = await fetch('/api/edge-agents/deep-explore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sector, queries: [query, `${sector} ${mode} market signals`] }) }); const data = await res.json(); setMessage(data?.insight?.summary || data?.message || 'Route mapped. Your analysis is ready in the research log.'); } catch { setMessage('The route is temporarily quiet. Try again in a moment.'); } finally { setLoading(false) } }
  return <div className="flex flex-col gap-5"><div className="az-page-heading"><div className="az-kicker"><Compass data-icon="inline-start" /> KAIROS NAVIGATION</div><h2 className="az-display">Ask the map<br /><em>for a better route.</em></h2><p>Choose an operating mode, set your sector, and send a focused question into the current.</p></div><section className="az-card p-4 md:p-6"><div className="grid gap-3 md:grid-cols-3">{modes.map(({ id, label, description, icon: Icon }) => <button key={id} type="button" onClick={() => setMode(id)} className={`az-mode ${mode === id ? 'az-mode-active' : ''}`}><Icon /><strong>{label}</strong><span>{description}</span></button>)}</div><div className="mt-5 flex flex-wrap gap-2">{['SaaS B2B', 'PLG SaaS', 'E-Commerce', 'Marketplace'].map(s => <button key={s} type="button" onClick={() => setSector(s)} className={`az-chip ${sector === s ? 'az-chip-active' : ''}`}>{s}</button>)}</div><div className="az-composer mt-5"><textarea value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); void submit() } }} placeholder="What should we investigate?" aria-label="Research question" /><button type="button" onClick={() => void submit()} disabled={loading || !query.trim()} aria-label="Send research question"><Send /></button></div>{message && <div className="az-response"><Sparkles /><p>{message}</p></div>}</section></div>
}

function Settings() {
  const [showKey, setShowKey] = useState(false); const [saved, setSaved] = useState(false);
  return <div className="flex flex-col gap-5"><div className="az-page-heading"><div className="az-kicker"><Settings2 data-icon="inline-start" /> VESSEL SETTINGS</div><h2 className="az-display">Keep your<br /><em>instrument tuned.</em></h2><p>Private controls for your workspace and research connection.</p></div><section className="az-card p-5 md:p-7"><div className="az-section-title">Research connection <span>Optional / encrypted</span></div><div className="mt-5 flex items-center gap-3 text-sm font-semibold text-[#12345b]"><LockKeyhole /> API key stored securely in your session</div><div className="az-key-field mt-4"><input type={showKey ? 'text' : 'password'} placeholder="Paste a personal research key" aria-label="Personal research key" /><button type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Hide key' : 'Show key'}>{showKey ? <EyeOff /> : <Eye />}</button></div><button type="button" className="az-primary mt-4" onClick={() => setSaved(true)}>{saved ? <><CheckCircle2 /> Saved</> : 'Save connection'}</button></section></div>
}

export default function SwissPrecisionDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [{ id: 'overview', label: 'Overview', icon: LayoutGrid }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }, { id: 'strategy', label: 'Strategy', icon: Compass }, { id: 'settings', label: 'Settings', icon: Settings2 }];
  return <main className="az-dashboard"><TilePattern className="opacity-20" /><header className="az-topbar"><div className="az-brand"><span className="az-brand-mark"><Anchor /></span><span>SAIL <b>AI</b></span></div><div className="az-status"><span className="az-dot" /> KAIROS ONLINE</div><div className="az-user">JD</div></header><div className="az-layout"><aside className="az-sidebar"><div className="az-sidebar-caption">Navigation</div>{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`az-nav-item ${tab === id ? 'az-nav-active' : ''}`}><Icon /><span>{label}</span>{tab === id && <i />}</button>)}<div className="az-sidebar-bottom"><div className="az-mini-compass"><CompassRose /></div><div className="az-label">Position</div><strong>38° 43′ N</strong><span>Lisbon · Portugal</span></div></aside><div className="az-content"><div className="az-breadcrumb">SAIL AI <span>/</span> {tab.toUpperCase()}</div>{tab === 'overview' && <Overview />}{tab === 'analytics' && <Analytics />}{tab === 'strategy' && <Strategy />}{tab === 'settings' && <Settings />}</div></div><nav className="az-mobile-nav">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? 'az-nav-active' : ''}><Icon /><span>{label}</span></button>)}</nav></main>
}

export { metrics, sectors }
