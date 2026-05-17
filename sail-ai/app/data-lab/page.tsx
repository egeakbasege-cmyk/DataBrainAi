'use client'

/**
 * /data-lab — Unified Data Lab
 * ─────────────────────────────
 * Sections:
 *   1. Connected Sources  — connector management (everyone)
 *   2. Live Platform Data — real-time demo feed  (everyone)
 *   3. Intelligence Analysis — Groq pipeline    (auth-gated)
 */

import { useSession, signIn } from 'next-auth/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import {
  ALL_CONNECTORS,
  useConnectorState,
  type ConnectorDef,
} from '@/components/ConnectorDock'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AnalysisMode = 'upwind' | 'sail' | 'operator'

interface KeyMetric  { label:string; value:string; change:string; trend:'up'|'down'|'neutral'; context:string }
interface ActionStep { priority:'critical'|'high'|'medium'; step:string; rationale:string; timeline:string; expectedImpact:string }
interface Insight    { category:string; finding:string; dataPoint:string; implication:string }
interface RiskFlag   { severity:'high'|'medium'|'low'; risk:string; mitigation:string }
interface AnalysisResult {
  headline:string; executiveSummary:string; keyMetrics:KeyMetric[]
  actionSteps:ActionStep[]; insights:Insight[]; riskFlags:RiskFlag[]
  dataSources:string[]; confidenceScore:number
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock platform data (inline — same source as API route)
// ─────────────────────────────────────────────────────────────────────────────

interface CMetric { label:string; value:string; change:string; up:boolean }
interface CRow    { name:string; value:string; delta?:string; up?:boolean }
interface CData   { metrics:CMetric[]; rows:CRow[]; rowLabel:string; note?:string }

const CONNECTOR_DATA: Record<string, CData> = {
  'ebay-product-price':   { metrics:[{label:'Avg Sell Price',value:'$47.20',change:'+3.1%',up:true},{label:'Sell-Through',value:'68%',change:'+5pp',up:true},{label:'Active Listings',value:'2.4M',change:'+12%',up:true},{label:'Days to Sell',value:'4.2d',change:'-0.8d',up:true}], rowLabel:'Top Categories', rows:[{name:'Electronics',value:'$89.50',delta:'+4.2%',up:true},{name:'Collectibles',value:'$34.10',delta:'+11.8%',up:true},{name:'Fashion',value:'$28.40',delta:'-1.2%',up:false},{name:'Home & Garden',value:'$41.20',delta:'+2.7%',up:true}], note:'eBay Marketplace Pulse — 14 min ago' },
  'amazon-product-price': { metrics:[{label:'Buy Box Win %',value:'72%',change:'+3pp',up:true},{label:'Avg BSR',value:'#8,420',change:'-1,200',up:true},{label:'Review Score',value:'4.3★',change:'+0.1',up:true},{label:'Return Rate',value:'6.8%',change:'-0.5pp',up:true}], rowLabel:'Trending ASINs', rows:[{name:'Wireless Earbuds Pro',value:'#1,240',delta:'▲ 340',up:true},{name:'Kitchen Smart Scale',value:'#3,110',delta:'▲ 890',up:true},{name:'Premium Yoga Mat',value:'#5,890',delta:'▼ 220',up:false}], note:'Amazon Seller Central — 8 min ago' },
  'etsy-marketplace':     { metrics:[{label:'Avg Order Value',value:'$38.70',change:'+7.2%',up:true},{label:'Shop Views/Day',value:'1,240',change:'+15%',up:true},{label:'CVR',value:'3.1%',change:'+0.4pp',up:true},{label:'Fav Rate',value:'8.4%',change:'+1.1pp',up:true}], rowLabel:'Trending Searches', rows:[{name:'Personalized Gifts',value:'94K/mo',delta:'+22%',up:true},{name:'Boho Wall Art',value:'67K/mo',delta:'+18%',up:true},{name:'Vintage Jewelry',value:'52K/mo',delta:'+9%',up:true}], note:'Etsy Trending API — 22 min ago' },
  'walmart-marketplace':  { metrics:[{label:'Price Competitiveness',value:'91%',change:'+2pp',up:true},{label:'In-Stock Rate',value:'96.4%',change:'+0.8pp',up:true},{label:'Avg Margin',value:'18.2%',change:'-1.1pp',up:false},{label:'Fulfillment',value:'4.7/5',change:'+0.2',up:true}], rowLabel:'Top Departments', rows:[{name:'Grocery',value:'$24.10',delta:'+1.2%',up:true},{name:'Electronics',value:'$142.50',delta:'+5.8%',up:true},{name:'Apparel',value:'$31.20',delta:'-2.4%',up:false}], note:'Walmart Seller Center — 31 min ago' },
  'aliexpress-sourcing':  { metrics:[{label:'Avg Sourcing Cost',value:'$8.40',change:'-4.2%',up:true},{label:'Avg Ship Time',value:'9.2d',change:'-1.3d',up:true},{label:'Supplier Score',value:'4.6/5',change:'+0.1',up:true},{label:'MOQ avg',value:'50 units',change:'-10',up:true}], rowLabel:'Hot Categories', rows:[{name:'Smart Home',value:'$6.20',delta:'-8%',up:true},{name:'Pet Accessories',value:'$4.10',delta:'-3%',up:true},{name:'Phone Accessories',value:'$2.40',delta:'-12%',up:true}], note:'AliExpress Data Hub — 19 min ago' },
  'shopify-store':        { metrics:[{label:'Avg Store CVR',value:'2.9%',change:'+0.4pp',up:true},{label:'Avg AOV',value:'$67.30',change:'+8.1%',up:true},{label:'Cart Abandon',value:'68.2%',change:'-2.1pp',up:true},{label:'Repeat Rate',value:'34%',change:'+3pp',up:true}], rowLabel:'Industry CVR Benchmarks', rows:[{name:'Fashion & Apparel',value:'1.8%',delta:'vs 2.2% avg',up:false},{name:'Health & Beauty',value:'3.4%',delta:'vs 2.2% avg',up:true},{name:'Electronics',value:'1.2%',delta:'vs 2.2% avg',up:false},{name:'Home & Garden',value:'2.8%',delta:'vs 2.2% avg',up:true}], note:'Shopify Benchmark Report 2026' },
  'tiktok-ads':           { metrics:[{label:'Avg CPM',value:'$9.20',change:'+$0.80',up:false},{label:'CTR',value:'1.8%',change:'+0.3pp',up:true},{label:'Engagement',value:'5.4%',change:'+0.7pp',up:true},{label:'Shop ROAS',value:'3.2x',change:'+0.4x',up:true}], rowLabel:'TikTok Shop Trending', rows:[{name:'Viral Skincare Serum',value:'2.4M views',delta:'↑ +840%',up:true},{name:'Mini Projector',value:'1.8M views',delta:'↑ +320%',up:true},{name:'LED Nail Kit',value:'1.2M views',delta:'↑ +190%',up:true}], note:'TikTok for Business — 6 min ago' },
  'meta-ads':             { metrics:[{label:'Avg CPM',value:'$14.30',change:'+$1.20',up:false},{label:'CPC',value:'$0.82',change:'-$0.06',up:true},{label:'ROAS',value:'4.1x',change:'+0.3x',up:true},{label:'CTR',value:'1.1%',change:'+0.2pp',up:true}], rowLabel:'CPM by Industry', rows:[{name:'Retail & E-commerce',value:'$12.40',delta:'Low competition',up:true},{name:'Finance & Insurance',value:'$31.20',delta:'High competition',up:false},{name:'Health & Wellness',value:'$9.80',delta:'Low competition',up:true}], note:'Meta Ads Manager — Q1 2026' },
  'pinterest-shopping':   { metrics:[{label:'Monthly Impressions',value:'8.2M',change:'+18%',up:true},{label:'Save Rate',value:'4.7%',change:'+0.9pp',up:true},{label:'Outbound CTR',value:'0.68%',change:'+0.1pp',up:true},{label:'Avg CPC',value:'$0.34',change:'-$0.04',up:true}], rowLabel:'Trending Boards', rows:[{name:'Quiet Luxury',value:'4.2M saves',delta:'↑ +280%',up:true},{name:'Summer Wedding Decor',value:'3.1M saves',delta:'↑ +340%',up:true},{name:'Clean Girl Makeup',value:'2.4M saves',delta:'↑ +175%',up:true}], note:'Pinterest Trends API — 11 min ago' },
  'youtube-creator':      { metrics:[{label:'Avg CPV',value:'$0.028',change:'-$0.003',up:true},{label:'Avg Watch Time',value:'6m 42s',change:'+0:38',up:true},{label:'Subscribe Rate',value:'2.1%',change:'+0.3pp',up:true},{label:'Avg CPM',value:'$4.80',change:'+$0.40',up:false}], rowLabel:'Top Categories by CPM', rows:[{name:'Personal Finance',value:'$18.40 CPM',delta:'+12%',up:true},{name:'Tech Reviews',value:'$12.70 CPM',delta:'+8%',up:true},{name:'Entertainment',value:'$5.10 CPM',delta:'-2%',up:false}], note:'YouTube Analytics — 25 min ago' },
  'spotify-creator':      { metrics:[{label:'Avg Stream Rate',value:'$0.004/str',change:'+$0.0003',up:true},{label:'Editorial Saves',value:'12.4%',change:'+1.8pp',up:true},{label:'Playlist Add %',value:'6.2%',change:'+0.7pp',up:true},{label:'Listener Retention',value:'38%',change:'+4pp',up:true}], rowLabel:'Trending Genres', rows:[{name:'Afrobeats',value:'+42%',delta:'Global surge',up:true},{name:'Phonk',value:'+38%',delta:'Gen-Z driven',up:true},{name:'Indie Pop',value:'+24%',delta:'Playlist growth',up:true}], note:'Spotify for Artists — 18 min ago' },
  'poshmark-resale':      { metrics:[{label:'Avg Resale Margin',value:'62%',change:'+4pp',up:true},{label:'Days to Sell',value:'11.2d',change:'-1.8d',up:true},{label:'Avg Sale Price',value:'$38.40',change:'+6.2%',up:true},{label:'Offer Accept %',value:'44%',change:'+3pp',up:true}], rowLabel:'Top Reselling Brands', rows:[{name:'Lululemon',value:'$68 avg',delta:'82% margin',up:true},{name:'Nike / Jordan',value:'$91 avg',delta:'110% margin',up:true},{name:'Zara',value:'$28 avg',delta:'56% margin',up:true}], note:'Poshmark Marketplace — 33 min ago' },
  'google-trends':        { metrics:[{label:'Rising Queries',value:'4,820',change:'+340',up:true},{label:'Breakout Terms',value:'186',change:'+22',up:true},{label:'Top Region',value:'US → UK',change:'Spread',up:true},{label:'Volatility',value:'Medium',change:'Stable',up:true}], rowLabel:'Breakout Terms (7-day)', rows:[{name:'AI home assistant',value:'▲ +560%',delta:'Breakout',up:true},{name:'Seed cycling',value:'▲ +380%',delta:'Health trend',up:true},{name:'Quiet luxury fashion',value:'▲ +240%',delta:'Fashion',up:true}], note:'Google Trends API — 2 min ago' },
  'real-estate':          { metrics:[{label:'Median Price',value:'$412K',change:'+3.8%',up:true},{label:'Days on Market',value:'28.4d',change:'-4.1d',up:true},{label:'Price Cut %',value:'18.2%',change:'-2.1pp',up:true},{label:'Mortgage Rate',value:'6.72%',change:'-0.08pp',up:true}], rowLabel:'Top Markets', rows:[{name:'Austin, TX',value:'+8.4%',delta:'▲ Accelerating',up:true},{name:'Nashville, TN',value:'+6.9%',delta:'▲ Strong',up:true},{name:'San Francisco, CA',value:'-1.3%',delta:'▼ Softening',up:false}], note:'Zillow Research + NAR — 1 hr ago' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_GROUPS = [
  { domain:'ecommerce',  label:'Marketplace'   },
  { domain:'social',     label:'Social & Ads'  },
  { domain:'creator',    label:'Creator'        },
  { domain:'secondhand', label:'Resale'         },
  { domain:'analytics',  label:'Analytics'      },
  { domain:'local',      label:'Real Estate'    },
]

const PIPELINE_STAGES = [
  'Connecting to data sources',
  'Retrieving platform records',
  'Matching industry benchmarks',
  'Synthesising with Groq 70B',
  'Structuring intelligence report',
]
const STAGE_MS = 900

const MODES: { id:AnalysisMode; label:string; badge:string; desc:string }[] = [
  { id:'upwind',   label:'Upwind',   badge:'EXEC',    desc:'Structured executive report' },
  { id:'sail',     label:'SAIL',     badge:'ADAPTIVE',desc:'Adaptive market intelligence' },
  { id:'operator', label:'Operator', badge:'ACTION',  desc:'Hyper-tactical execution plan' },
]

const EXAMPLES = [
  'Shopify son 30 günlük iade oranımı analiz et ve eylem planı çıkar',
  'Amazon Buy Box kaybetme nedenlerini tespit et ve fiyat stratejisi öner',
  'TikTok ve Meta reklamlarımı karşılaştır, ROAS optimizasyonu sun',
  'Aktif tüm platformlarımı değerlendir ve büyüme kaldıraçlarını haritalandır',
]

const PRIORITY_S = {
  critical:{ bg:'rgba(239,68,68,0.06)',   text:'#DC2626', border:'rgba(239,68,68,0.2)'   },
  high:    { bg:'rgba(245,158,11,0.06)',  text:'#D97706', border:'rgba(245,158,11,0.2)'  },
  medium:  { bg:'rgba(201,169,110,0.06)', text:'#C9A96E', border:'rgba(201,169,110,0.2)' },
} as const

const SEVERITY_S = {
  high:  { text:'#DC2626', bg:'rgba(239,68,68,0.05)',  border:'rgba(239,68,68,0.15)'  },
  medium:{ text:'#D97706', bg:'rgba(245,158,11,0.05)', border:'rgba(245,158,11,0.15)' },
  low:   { text:'#71717A', bg:'rgba(0,0,0,0.03)',      border:'rgba(0,0,0,0.08)'      },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Shared logo component
// ─────────────────────────────────────────────────────────────────────────────

function PlatformLogo({ c, active, size=20 }: { c:ConnectorDef; active:boolean; size?:number }) {
  const [err, setErr] = useState(false)
  if (c.iconSlug && !err)
    return <img src={`/icons/${c.iconSlug}-${active?'active':'inactive'}.svg`} alt={c.label} width={size} height={size} onError={()=>setErr(true)} style={{display:'block',flexShrink:0}} />
  const letter = c.letter ?? c.label[0]
  return (
    <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:size,height:size,borderRadius:3,background:active?c.accentColor+'22':'#F3F4F6',color:active?c.accentColor:'#9CA3AF',fontSize:size*0.56,fontWeight:700,fontFamily:'Inter,sans-serif',flexShrink:0}}>
      {letter}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section heading utility
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ label, sublabel, action }: { label:string; sublabel?:string; action?:React.ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:'1rem',marginBottom:'1rem'}}>
      <div>
        <h2 style={{fontFamily:'Cormorant Garamond,Georgia,serif',fontSize:'1.1rem',fontWeight:600,color:'#0C0C0E',margin:0,lineHeight:1.2}}>
          {label}
        </h2>
        {sublabel && <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.7rem',color:'#9CA3AF',margin:'0.2rem 0 0'}}>{sublabel}</p>}
      </div>
      {action}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Connector management
// ─────────────────────────────────────────────────────────────────────────────

function ConnectorGrid({
  enabledIds, analysisActive, onToggle, onSetActive, onEnableAll, onDisableAll,
}: {
  enabledIds:Set<string>; analysisActive:boolean
  onToggle:(id:string)=>void; onSetActive:(v:boolean)=>void
  onEnableAll:()=>void; onDisableAll:()=>void
}) {
  return (
    <div style={{background:'#FFFFFF',border:'1.5px solid rgba(0,0,0,0.08)',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
      {/* Control bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.5rem 0.875rem',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <button onClick={()=>onSetActive(!analysisActive)} style={{position:'relative',width:28,height:15,borderRadius:999,background:analysisActive?'#C9A96E':'#D1D5DB',border:'none',cursor:'pointer',flexShrink:0,transition:'background 0.2s',padding:0}}>
            <span style={{position:'absolute',top:1.5,left:analysisActive?14:1.5,width:12,height:12,borderRadius:'50%',background:'#FFF',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s',display:'block'}} />
          </button>
          <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.68rem',fontWeight:600,color:'#0C0C0E'}}>Connector Analysis</span>
          <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.62rem',color:'#9CA3AF'}}>— hangi platformları analiz etsin?</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
          <button onClick={onEnableAll}  style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',padding:0}}>Tümünü Aç</button>
          <span style={{color:'#E5E7EB'}}>·</span>
          <button onClick={onDisableAll} style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',padding:0}}>Kapat</button>
        </div>
      </div>

      {/* Platform grid by domain */}
      <div style={{padding:'0.75rem 0.875rem 0.875rem'}}>
        {DOMAIN_GROUPS.map(g => {
          const connectors = ALL_CONNECTORS.filter(c=>c.domain===g.domain)
          if (!connectors.length) return null
          return (
            <div key={g.domain} style={{marginBottom:'0.75rem'}}>
              <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',fontWeight:700,letterSpacing:'0.09em',textTransform:'uppercase',color:'#C4C4CC',margin:'0 0 0.4rem 0'}}>{g.label}</p>
              <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
                {connectors.map(c => {
                  const active = analysisActive && enabledIds.has(c.id)
                  return (
                    <button key={c.id} onClick={()=>onToggle(c.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.35rem',padding:'0.65rem 0.5rem 0.55rem',borderRadius:10,border:`1.5px solid ${active?c.accentColor+'44':'rgba(0,0,0,0.07)'}`,background:active?c.accentColor+'08':'#FAFAFA',cursor:'pointer',position:'relative',minWidth:0,transition:'all 0.15s'}}>
                      {active && <span style={{position:'absolute',top:5,right:5,width:5,height:5,borderRadius:'50%',background:c.accentColor}} />}
                      <PlatformLogo c={c} active={active} size={22} />
                      <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',fontWeight:600,color:active?c.accentColor:'#9CA3AF',whiteSpace:'nowrap',lineHeight:1}}>
                        {c.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// "Veri Ekle" modal — auth-aware
// ─────────────────────────────────────────────────────────────────────────────

function AddDataModal({
  session, enabledIds, analysisActive, onToggle, onClose,
}: {
  session:any; enabledIds:Set<string>; analysisActive:boolean; onToggle:(id:string)=>void; onClose:()=>void
}) {
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:50,background:'rgba(12,12,14,0.45)',backdropFilter:'blur(5px)'}} />
      <div style={{position:'fixed',top:0,right:0,bottom:0,zIndex:51,width:'100%',maxWidth:400,background:'#FFFFFF',borderLeft:'1px solid rgba(0,0,0,0.1)',overflowY:'auto',boxShadow:'-24px 0 64px rgba(0,0,0,0.14)',animation:'slideRight 0.28s cubic-bezier(0.16,1,0.3,1) both'}}>

        {/* Header */}
        <div style={{padding:'1.5rem 1.5rem 1rem',borderBottom:'1px solid rgba(0,0,0,0.07)',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div>
            <h2 style={{fontFamily:'Cormorant Garamond,Georgia,serif',fontSize:'1.25rem',fontWeight:600,color:'#0C0C0E',margin:0}}>Veri Kaynağı Ekle</h2>
            <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.7rem',color:'#9CA3AF',margin:'0.25rem 0 0',lineHeight:1.5}}>
              {session ? 'Analizde kullanılacak platformları seçin' : 'Kaynaklarınızı kaydetmek için giriş yapın'}
            </p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',fontSize:'1rem',padding:'0.25rem',lineHeight:1}}>✕</button>
        </div>

        {/* Sign-in prompt (unauthenticated) */}
        {!session && (
          <div style={{margin:'1rem 1.5rem',padding:'1rem',background:'rgba(201,169,110,0.06)',border:'1.5px solid rgba(201,169,110,0.22)',borderRadius:10,textAlign:'center'}}>
            <div style={{fontSize:'1.5rem',marginBottom:'0.5rem'}}>🔒</div>
            <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.78rem',fontWeight:600,color:'#0C0C0E',margin:'0 0 0.25rem 0'}}>Kaydedilen tercihler için giriş yapın</p>
            <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.68rem',color:'#71717A',margin:'0 0 0.875rem 0',lineHeight:1.5}}>Giriş yapmadan da demo modunda platformları keşfedebilirsiniz</p>
            <Link href="/login?callbackUrl=/data-lab" style={{display:'inline-block',padding:'0.5rem 1.25rem',background:'linear-gradient(135deg,#C9A96E,#B8924F)',color:'#FFF',fontFamily:'Inter,sans-serif',fontSize:'0.72rem',fontWeight:700,borderRadius:8,textDecoration:'none',boxShadow:'0 2px 10px rgba(201,169,110,0.3)'}}>
              Oturum Aç
            </Link>
          </div>
        )}

        {/* Platform list */}
        <div style={{padding:'0.75rem 1.5rem 2rem'}}>
          {DOMAIN_GROUPS.map(g => {
            const connectors = ALL_CONNECTORS.filter(c=>c.domain===g.domain)
            if (!connectors.length) return null
            return (
              <div key={g.domain} style={{marginBottom:'1.375rem'}}>
                <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#C4C4CC',margin:'0 0 0.5rem 0'}}>{g.label}</p>
                <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
                  {connectors.map(c => {
                    const isActive = enabledIds.has(c.id) && analysisActive
                    return (
                      <button key={c.id} onClick={()=>onToggle(c.id)} style={{display:'flex',alignItems:'center',gap:'0.625rem',padding:'0.6rem 0.75rem',borderRadius:8,border:`1.5px solid ${isActive?c.accentColor+'40':'rgba(0,0,0,0.07)'}`,background:isActive?c.accentColor+'08':'#FAFAFA',cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
                        <PlatformLogo c={c} active={isActive} size={20} />
                        <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.78rem',fontWeight:600,color:isActive?c.accentColor:'#374151',flex:1}}>{c.label}</span>
                        {/* Toggle */}
                        <span style={{width:28,height:15,borderRadius:999,background:isActive?c.accentColor:'#D1D5DB',position:'relative',flexShrink:0,display:'block',transition:'background 0.2s'}}>
                          <span style={{position:'absolute',top:1.5,left:isActive?14:1.5,width:12,height:12,borderRadius:'50%',background:'#FFF',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s',display:'block'}} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Live Platform Data cards
// ─────────────────────────────────────────────────────────────────────────────

function DataCard({ c, data, isMobile }: { c:ConnectorDef; data:CData; isMobile:boolean }) {
  const [open, setOpen] = useState(true)
  const [err,  setErr]  = useState(false)

  const logo = c.iconSlug && !err
    ? <img src={`/icons/${c.iconSlug}-active.svg`} alt={c.label} width={18} height={18} onError={()=>setErr(true)} style={{display:'block'}} />
    : <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:3,background:c.accentColor+'22',color:c.accentColor,fontSize:10,fontWeight:700,fontFamily:'Inter,sans-serif'}}>{c.letter??c.label[0]}</span>

  return (
    <div style={{background:'#FFFFFF',border:`1.5px solid ${c.accentColor}20`,borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.04)',marginBottom:'0.75rem'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.65rem 0.875rem',background:c.accentColor+'05',borderBottom:open?`1px solid ${c.accentColor}18`:'none',cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          {logo}
          <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.78rem',fontWeight:700,color:'#0C0C0E'}}>{c.label}</span>
          <span style={{display:'flex',alignItems:'center',gap:'0.2rem'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#10B981',display:'inline-block',boxShadow:'0 0 0 2px rgba(16,185,129,0.2)'}} />
            <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.55rem',fontWeight:700,color:'#10B981',letterSpacing:'0.07em',textTransform:'uppercase'}}>Live</span>
          </span>
        </div>
        <span style={{fontSize:'0.6rem',color:'#C4C4CC',transform:open?'rotate(180deg)':'none',display:'inline-block',transition:'transform 0.2s'}}>▼</span>
      </div>

      {open && (
        <div style={{padding:'0.75rem 0.875rem 0.625rem'}}>
          {/* Metrics */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'0.4rem',marginBottom:'0.625rem'}}>
            {data.metrics.map((m,i) => (
              <div key={i} style={{padding:'0.5rem 0.6rem',background:'#F9F9F8',border:'1px solid rgba(0,0,0,0.06)',borderRadius:7}}>
                <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#9CA3AF',margin:'0 0 0.2rem 0'}}>{m.label}</p>
                <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.92rem',fontWeight:700,color:'#0C0C0E',margin:'0 0 0.15rem 0',lineHeight:1}}>{m.value}</p>
                <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',fontWeight:600,color:m.up?'#10B981':'#EF4444',margin:0}}>{m.up?'▲':'▼'} {m.change}</p>
              </div>
            ))}
          </div>
          {/* Row table */}
          <div style={{background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.05)',borderRadius:7,overflow:'hidden'}}>
            <div style={{padding:'0.3rem 0.55rem',borderBottom:'1px solid rgba(0,0,0,0.05)',display:'flex',justifyContent:'space-between'}}>
              <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',fontWeight:700,letterSpacing:'0.09em',textTransform:'uppercase',color:'#9CA3AF'}}>{data.rowLabel}</span>
              <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',color:'#C4C4CC'}}>Value</span>
            </div>
            {data.rows.map((r,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.38rem 0.55rem',borderBottom:i<data.rows.length-1?'1px solid rgba(0,0,0,0.04)':'none'}}>
                <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.72rem',color:'#374151',fontWeight:500}}>{r.name}</span>
                <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  {r.delta && <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.62rem',fontWeight:600,color:r.up?'#10B981':'#EF4444'}}>{r.delta}</span>}
                  <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.72rem',fontWeight:700,color:c.accentColor}}>{r.value}</span>
                </div>
              </div>
            ))}
          </div>
          {data.note && <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.56rem',color:'#C4C4CC',margin:'0.375rem 0 0',textAlign:'right'}}>{data.note}</p>}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 helpers — pipeline, metric, action, output
// ─────────────────────────────────────────────────────────────────────────────

function PipelineLoader({ stage }: { stage:number }) {
  return (
    <div style={{padding:'2rem',background:'#FFFFFF',border:'1.5px solid rgba(0,0,0,0.07)',borderRadius:12,boxShadow:'0 2px 12px rgba(0,0,0,0.04)'}}>
      <p style={{fontFamily:'Cormorant Garamond,Georgia,serif',fontSize:'0.95rem',fontWeight:600,color:'#0C0C0E',margin:'0 0 1.25rem 0'}}>Veriler analiz ediliyor…</p>
      <div style={{display:'flex',flexDirection:'column',gap:'0.625rem'}}>
        {PIPELINE_STAGES.map((s,i) => {
          const done=i<stage, active=i===stage
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
              <div style={{width:18,height:18,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:done?'#10B981':active?'rgba(201,169,110,0.15)':'rgba(0,0,0,0.05)',border:active?'1.5px solid rgba(201,169,110,0.5)':'none',transition:'all 0.3s'}}>
                {done ? <span style={{fontSize:9,color:'#FFF',lineHeight:1}}>✓</span>
                      : active ? <span style={{width:6,height:6,borderRadius:'50%',background:'#C9A96E',display:'block'}} /> : null}
              </div>
              <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.75rem',fontWeight:active?600:400,color:done?'#10B981':active?'#C9A96E':'#C4C4CC',transition:'color 0.3s'}}>
                {s}{active && <span style={{animation:'blink 0.9s step-end infinite',marginLeft:2}}>…</span>}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{height:2,background:'rgba(0,0,0,0.05)',borderRadius:999,marginTop:'1.25rem',overflow:'hidden'}}>
        <div style={{height:'100%',background:'linear-gradient(90deg,#C9A96E,#D4B980)',borderRadius:999,width:`${((stage+1)/PIPELINE_STAGES.length)*100}%`,transition:'width 0.8s cubic-bezier(0.16,1,0.3,1)'}} />
      </div>
    </div>
  )
}

function MetricCard({ m }: { m:KeyMetric }) {
  const col = m.trend==='up'?'#10B981':m.trend==='down'?'#EF4444':'#71717A'
  return (
    <div style={{padding:'0.875rem',background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10}}>
      <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.55rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9CA3AF',margin:'0 0 0.3rem 0'}}>{m.label}</p>
      <p style={{fontFamily:'Inter,sans-serif',fontSize:'1.25rem',fontWeight:700,color:'#0C0C0E',margin:'0 0 0.2rem 0',letterSpacing:'-0.02em',lineHeight:1}}>{m.value}</p>
      <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.62rem',fontWeight:700,color:col,margin:'0 0 0.25rem 0'}}>{m.trend==='up'?'▲':m.trend==='down'?'▼':'→'} {m.change}</p>
      <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.65rem',color:'#9CA3AF',margin:0,lineHeight:1.4}}>{m.context}</p>
    </div>
  )
}

function ActionCard({ a, index }: { a:ActionStep; index:number }) {
  const s = PRIORITY_S[a.priority]
  return (
    <div style={{animationDelay:`${index*60}ms`,padding:'0.875rem 1rem',background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:10,display:'grid',gridTemplateColumns:'1fr auto',gap:'0.5rem'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
          <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.48rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:s.text,background:s.border,padding:'0.12rem 0.4rem',borderRadius:3}}>{a.priority}</span>
          <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.8rem',fontWeight:600,color:'#0C0C0E'}}>{a.step}</span>
        </div>
        <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.7rem',color:'#71717A',margin:0,lineHeight:1.45}}>{a.rationale}</p>
        <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.68rem',color:'#10B981',margin:0,fontWeight:600}}>→ {a.expectedImpact}</p>
      </div>
      <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.6rem',fontWeight:600,color:s.text,background:'#FFFFFF',border:`1px solid ${s.border}`,padding:'0.18rem 0.45rem',borderRadius:4,whiteSpace:'nowrap',flexShrink:0,alignSelf:'flex-start'}}>{a.timeline}</span>
    </div>
  )
}

function AnalysisOutput({ result, mode }: { result:AnalysisResult; mode:AnalysisMode }) {
  const [insOpen, setInsOpen] = useState(true)
  const [riskOpen,setRiskOpen]= useState(true)
  const modeLabel = MODES.find(m=>m.id===mode)?.label??'SAIL'

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      {/* Header card */}
      <div style={{padding:'1.25rem 1.5rem',background:'linear-gradient(135deg,rgba(201,169,110,0.06),rgba(201,169,110,0.01))',border:'1.5px solid rgba(201,169,110,0.22)',borderRadius:12}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.625rem'}}>
          <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'#C9A96E',background:'rgba(201,169,110,0.12)',padding:'0.15rem 0.5rem',borderRadius:4,border:'1px solid rgba(201,169,110,0.25)'}}>{modeLabel} Report</span>
          <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',color:'#C4C4CC'}}>Confidence {result.confidenceScore}%</span>
          <div style={{flex:1,height:3,background:'rgba(0,0,0,0.06)',borderRadius:999,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${result.confidenceScore}%`,background:result.confidenceScore>=80?'#10B981':result.confidenceScore>=60?'#D97706':'#EF4444',borderRadius:999,transition:'width 1s cubic-bezier(0.16,1,0.3,1)'}} />
          </div>
        </div>
        <h3 style={{fontFamily:'Cormorant Garamond,Georgia,serif',fontSize:'clamp(1rem,2.5vw,1.3rem)',fontWeight:600,color:'#0C0C0E',margin:'0 0 0.625rem 0',lineHeight:1.3}}>{result.headline}</h3>
        <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.8rem',color:'#52525B',margin:0,lineHeight:1.65}}>{result.executiveSummary}</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.3rem',marginTop:'0.875rem'}}>
          {result.dataSources?.map((s,i)=>(
            <span key={i} style={{fontFamily:'Inter,sans-serif',fontSize:'0.56rem',color:'#9CA3AF',background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.07)',padding:'0.15rem 0.5rem',borderRadius:999}}>{s}</span>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <Label>Key Metrics</Label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:'0.5rem'}}>
          {result.keyMetrics?.map((m,i)=><MetricCard key={i} m={m} />)}
        </div>
      </div>

      {/* Action Plan */}
      <div>
        <Label>Action Plan</Label>
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {result.actionSteps?.map((a,i)=><ActionCard key={i} a={a} index={i} />)}
        </div>
      </div>

      {/* Insights */}
      <div>
        <button onClick={()=>setInsOpen(o=>!o)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',cursor:'pointer',padding:'0 0 0.5rem 0'}}>
          <Label noMargin>Intelligence Insights</Label>
          <span style={{fontSize:'0.62rem',color:'#9CA3AF',transform:insOpen?'rotate(180deg)':'none',display:'inline-block',transition:'transform 0.2s'}}>▼</span>
        </button>
        {insOpen && (
          <div style={{border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,overflow:'hidden'}}>
            {result.insights?.map((ins,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'110px 1fr',gap:'0.875rem',padding:'0.75rem 0.875rem',borderBottom:i<result.insights.length-1?'1px solid rgba(0,0,0,0.05)':'none',background:i%2===0?'#FFFFFF':'#FAFAF8'}}>
                <div>
                  <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.55rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#C9A96E',margin:'0 0 0.2rem 0'}}>{ins.category}</p>
                  <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.65rem',fontWeight:700,color:'#0C0C0E',margin:0}}>{ins.dataPoint}</p>
                </div>
                <div>
                  <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.76rem',fontWeight:500,color:'#374151',margin:'0 0 0.2rem 0'}}>{ins.finding}</p>
                  <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.68rem',color:'#71717A',margin:0,lineHeight:1.45}}>{ins.implication}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Flags */}
      {result.riskFlags?.length>0 && (
        <div>
          <button onClick={()=>setRiskOpen(o=>!o)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',cursor:'pointer',padding:'0 0 0.5rem 0'}}>
            <Label noMargin>Risk Flags</Label>
            <span style={{fontSize:'0.62rem',color:'#9CA3AF',transform:riskOpen?'rotate(180deg)':'none',display:'inline-block',transition:'transform 0.2s'}}>▼</span>
          </button>
          {riskOpen && (
            <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
              {result.riskFlags.map((r,i)=>{
                const s=SEVERITY_S[r.severity]??SEVERITY_S.low
                return (
                  <div key={i} style={{padding:'0.75rem 0.875rem',background:s.bg,border:`1px solid ${s.border}`,borderRadius:8,display:'grid',gridTemplateColumns:'auto 1fr',gap:'0.75rem',alignItems:'flex-start'}}>
                    <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',fontWeight:700,letterSpacing:'0.09em',textTransform:'uppercase',color:s.text,background:'#FFF',border:`1px solid ${s.border}`,padding:'0.18rem 0.4rem',borderRadius:3,whiteSpace:'nowrap'}}>{r.severity}</span>
                    <div>
                      <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.76rem',fontWeight:600,color:'#0C0C0E',margin:'0 0 0.2rem 0'}}>{r.risk}</p>
                      <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.68rem',color:'#71717A',margin:0,lineHeight:1.4}}>Mitigation: {r.mitigation}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Label({ children, noMargin }:{ children:React.ReactNode; noMargin?:boolean }) {
  return <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#A1A1AA',margin:noMargin?0:'0 0 0.5rem 0'}}>{children}</p>
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign-in gate (analysis section locked)
// ─────────────────────────────────────────────────────────────────────────────

function SignInGate() {
  return (
    <div style={{position:'relative',borderRadius:14,overflow:'hidden'}}>
      {/* Blurred preview */}
      <div style={{filter:'blur(3px)',pointerEvents:'none',opacity:0.4,userSelect:'none'}}>
        <div style={{padding:'1.25rem 1.5rem',background:'rgba(201,169,110,0.06)',border:'1.5px solid rgba(201,169,110,0.2)',borderRadius:12,marginBottom:'0.75rem'}}>
          <div style={{height:12,width:'60%',background:'rgba(201,169,110,0.2)',borderRadius:4,marginBottom:'0.75rem'}} />
          <div style={{height:8,width:'90%',background:'rgba(0,0,0,0.08)',borderRadius:3,marginBottom:'0.4rem'}} />
          <div style={{height:8,width:'75%',background:'rgba(0,0,0,0.08)',borderRadius:3}} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.5rem'}}>
          {[1,2,3,4].map(i=>(
            <div key={i} style={{padding:'0.875rem',background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10}}>
              <div style={{height:8,width:'70%',background:'rgba(0,0,0,0.07)',borderRadius:3,marginBottom:'0.5rem'}} />
              <div style={{height:20,width:'50%',background:'rgba(0,0,0,0.1)',borderRadius:3}} />
            </div>
          ))}
        </div>
      </div>
      {/* Lock overlay */}
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(250,250,248,0.85)',backdropFilter:'blur(2px)',padding:'2rem',textAlign:'center'}}>
        <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(201,169,110,0.1)',border:'1.5px solid rgba(201,169,110,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',marginBottom:'0.875rem'}}>
          🔒
        </div>
        <h3 style={{fontFamily:'Cormorant Garamond,Georgia,serif',fontSize:'1.2rem',fontWeight:600,color:'#0C0C0E',margin:'0 0 0.375rem 0'}}>
          Intelligence Analysis
        </h3>
        <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.78rem',color:'#71717A',margin:'0 0 1.25rem 0',lineHeight:1.6,maxWidth:340}}>
          Groq 70B destekli pazar analizi için oturum açın. Platform verilerinizi doğal dille sorgulayın.
        </p>
        <Link href="/login?callbackUrl=/data-lab" style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',padding:'0.6rem 1.5rem',background:'linear-gradient(135deg,#C9A96E,#B8924F)',color:'#FFF',fontFamily:'Inter,sans-serif',fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.06em',borderRadius:8,textDecoration:'none',boxShadow:'0 2px 12px rgba(201,169,110,0.35)'}}>
          Oturum Aç →
        </Link>
        <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.65rem',color:'#C4C4CC',margin:'0.625rem 0 0 0'}}>
          Hesap yok mu?{' '}
          <Link href="/onboarding" style={{color:'#C9A96E',textDecoration:'none',fontWeight:600}}>Ücretsiz başla</Link>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function DataLabPage() {
  const { data: session, status } = useSession()

  const { enabledIds, analysisActive, toggle, setActive, enableAll, disableAll, mounted } = useConnectorState()

  const [showAddData,    setShowAddData]    = useState(false)
  const [showGrid,       setShowGrid]       = useState(false)
  const [mode,           setMode]           = useState<AnalysisMode>('sail')
  const [query,          setQuery]          = useState('')
  const [pipelineStage,  setPipelineStage]  = useState(-1)
  const [isRunning,      setIsRunning]      = useState(false)
  const [result,         setResult]         = useState<AnalysisResult|null>(null)
  const [error,          setError]          = useState<string|null>(null)
  const [isMobile,       setIsMobile]       = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const outputRef   = useRef<HTMLDivElement>(null)
  const timerRefs   = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleQueryChange = useCallback((v:string) => {
    setQuery(v)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  const activeConnectors = ALL_CONNECTORS.filter(c => analysisActive && enabledIds.has(c.id))

  const runAnalysis = useCallback(async () => {
    if (!query.trim() || isRunning || activeConnectors.length===0) return
    setIsRunning(true); setResult(null); setError(null); setPipelineStage(0)
    timerRefs.current.forEach(clearTimeout); timerRefs.current=[]
    for (let i=1;i<PIPELINE_STAGES.length;i++) {
      timerRefs.current.push(setTimeout(()=>setPipelineStage(i), i*STAGE_MS))
    }
    const pipelineDuration = PIPELINE_STAGES.length * STAGE_MS
    try {
      const [res] = await Promise.all([
        fetch('/api/data-lab/analyze',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ query, connectorIds: activeConnectors.map(c=>c.id), mode }),
        }),
        new Promise(r=>setTimeout(r, pipelineDuration)),
      ])
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error??'Analysis failed')
      setResult(data.analysis); setPipelineStage(-1)
      setTimeout(()=>outputRef.current?.scrollIntoView({behavior:'smooth',block:'start'}), 100)
    } catch(e:any) {
      setError(e.message??'Bir hata oluştu. Lütfen tekrar deneyin.')
      setPipelineStage(-1)
    } finally {
      setIsRunning(false)
    }
  }, [query, isRunning, activeConnectors, mode])

  const handleKeyDown = useCallback((e:React.KeyboardEvent) => {
    if ((e.metaKey||e.ctrlKey) && e.key==='Enter') { e.preventDefault(); runAnalysis() }
  }, [runAnalysis])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />

      {showAddData && (
        <AddDataModal
          session={session}
          enabledIds={enabledIds}
          analysisActive={analysisActive}
          onToggle={toggle}
          onClose={()=>setShowAddData(false)}
        />
      )}

      <main style={{minHeight:'100vh',background:'#FAFAF8',paddingTop:'2.5rem',paddingBottom:'6rem'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 1.25rem'}}>

          {/* ── KAIROS Banner ─────────────────────────────────────── */}
          <Link
            href="/data-lab/kairos"
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem',padding:'0.875rem 1.125rem',borderRadius:12,background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.08))',border:'1.5px solid rgba(99,102,241,0.25)',marginBottom:'1.5rem',textDecoration:'none',cursor:'pointer',transition:'border-color 0.15s'}}
          >
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.75rem',fontWeight:700,color:'#a5b4fc',margin:'0 0 0.1rem'}}>KAIROS Intelligence</p>
                <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.65rem',color:'#6366f1',margin:0}}>Spy on any Shopify or Amazon competitor — AI battle plans in 90 seconds</p>
              </div>
            </div>
            <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.65rem',fontWeight:600,color:'#818cf8',background:'rgba(99,102,241,0.1)',padding:'0.25rem 0.75rem',borderRadius:999,border:'1px solid rgba(99,102,241,0.2)',whiteSpace:'nowrap'}}>Open →</span>
          </Link>

          {/* ── Page Header ───────────────────────────────────────── */}
          <div style={{marginBottom:'2rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.75rem',marginBottom:'0.625rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
                <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'#C9A96E',background:'rgba(201,169,110,0.1)',padding:'0.2rem 0.6rem',borderRadius:4,border:'1px solid rgba(201,169,110,0.22)'}}>Data Lab</span>
                {mounted && (
                  <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.62rem',color:'#10B981',fontWeight:600}}>
                    ● {activeConnectors.length} kaynak bağlı
                  </span>
                )}
              </div>
              {/* Veri Ekle */}
              <button onClick={()=>setShowAddData(true)} style={{display:'inline-flex',alignItems:'center',gap:'0.35rem',padding:'0.4rem 0.875rem',borderRadius:999,border:'1.5px solid rgba(201,169,110,0.35)',background:'rgba(201,169,110,0.06)',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.06em',color:'#C9A96E',transition:'all 0.15s'}}>
                <span style={{fontSize:'0.85rem',lineHeight:1}}>+</span>
                Veri Ekle
                {!session && <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.52rem',color:'rgba(201,169,110,0.7)',fontWeight:400}}>(oturum aç)</span>}
              </button>
            </div>
            <h1 style={{fontFamily:'Cormorant Garamond,Georgia,serif',fontSize:isMobile?'1.7rem':'2.1rem',fontWeight:600,color:'#0C0C0E',margin:'0 0 0.4rem 0',lineHeight:1.1,letterSpacing:'-0.02em'}}>
              Veri Bağlayıcıları &amp; Analiz
            </h1>
            <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.82rem',color:'#71717A',margin:0,lineHeight:1.6,maxWidth:500}}>
              Platformlarını bağla, demo verileri incele ve doğal dille AI analizi çalıştır.
            </p>
          </div>

          {/* ────────────────────────────────────────────────────────────
              SECTION 1 — CONNECTED SOURCES
          ──────────────────────────────────────────────────────────── */}
          <div style={{marginBottom:'1.75rem'}}>
            <SectionHeading
              label="Veri Kaynakları"
              sublabel="Aktif connector'lar AI analizine dahil edilir"
              action={
                <button onClick={()=>setShowGrid(o=>!o)} style={{fontFamily:'Inter,sans-serif',fontSize:'0.65rem',color:'#9CA3AF',background:'none',border:'1px solid rgba(0,0,0,0.08)',borderRadius:6,padding:'0.3rem 0.7rem',cursor:'pointer'}}>
                  {showGrid ? 'Küçült ▲' : 'Tümünü Gör ▼'}
                </button>
              }
            />

            {/* Active chip strip (always visible) */}
            <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'0.4rem',marginBottom:showGrid?'0.875rem':'0'}}>
              {mounted && activeConnectors.length > 0 ? (
                activeConnectors.map(c=>(
                  <button key={c.id} onClick={()=>toggle(c.id)} title={`${c.label} — kaldırmak için tıkla`} style={{display:'inline-flex',alignItems:'center',gap:'0.3rem',padding:'0.3rem 0.6rem',borderRadius:999,border:`1.5px solid ${c.accentColor}40`,background:c.accentColor+'0D',cursor:'pointer',transition:'all 0.15s'}}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:c.accentColor,display:'inline-block',flexShrink:0}} />
                    <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.66rem',fontWeight:600,color:c.accentColor,whiteSpace:'nowrap'}}>{c.label}</span>
                  </button>
                ))
              ) : (
                <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.72rem',color:'#C4C4CC',fontStyle:'italic'}}>Aktif kaynak yok — aşağıdan seçin</span>
              )}
            </div>

            {/* Full grid (expandable) */}
            {showGrid && (
              <ConnectorGrid
                enabledIds={enabledIds}
                analysisActive={analysisActive}
                onToggle={toggle}
                onSetActive={setActive}
                onEnableAll={enableAll}
                onDisableAll={disableAll}
              />
            )}
          </div>

          {/* ────────────────────────────────────────────────────────────
              SECTION 2 — LIVE PLATFORM DATA
          ──────────────────────────────────────────────────────────── */}
          {mounted && activeConnectors.length > 0 && (
            <div style={{marginBottom:'1.75rem'}}>
              <SectionHeading
                label="Platform Verisi"
                sublabel="Demo canlı feed — OAuth entegrasyonu yakında"
                action={
                  <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#10B981',display:'inline-block',boxShadow:'0 0 0 3px rgba(16,185,129,0.18)'}} />
                    <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.6rem',fontWeight:700,color:'#10B981',letterSpacing:'0.08em',textTransform:'uppercase'}}>Demo Live</span>
                  </div>
                }
              />
              {activeConnectors.map(c => {
                const data = CONNECTOR_DATA[c.id]
                if (!data) return null
                return <DataCard key={c.id} c={c} data={data} isMobile={isMobile} />
              })}
            </div>
          )}

          {/* Empty state */}
          {mounted && activeConnectors.length===0 && (
            <div style={{padding:'2rem',background:'#FFFFFF',border:'1.5px dashed rgba(0,0,0,0.1)',borderRadius:12,textAlign:'center',marginBottom:'1.75rem'}}>
              <div style={{fontSize:'1.75rem',marginBottom:'0.5rem'}}>🔌</div>
              <p style={{fontFamily:'Cormorant Garamond,Georgia,serif',fontSize:'1.1rem',fontWeight:600,color:'#0C0C0E',margin:'0 0 0.375rem 0'}}>Kaynak seçilmedi</p>
              <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.75rem',color:'#9CA3AF',margin:'0 0 1rem 0',lineHeight:1.6}}>Veri görmek ve analiz çalıştırmak için en az bir platform bağlayın</p>
              <div style={{display:'flex',justifyContent:'center',gap:'0.625rem',flexWrap:'wrap'}}>
                <button onClick={()=>setShowGrid(true)} style={{padding:'0.5rem 1.25rem',background:'linear-gradient(135deg,#C9A96E,#B8924F)',color:'#FFF',fontFamily:'Inter,sans-serif',fontSize:'0.72rem',fontWeight:700,borderRadius:8,border:'none',cursor:'pointer',boxShadow:'0 2px 10px rgba(201,169,110,0.3)'}}>
                  Kaynak Seç
                </button>
                <button onClick={enableAll} style={{padding:'0.5rem 1.25rem',background:'transparent',color:'#C9A96E',fontFamily:'Inter,sans-serif',fontSize:'0.72rem',fontWeight:600,borderRadius:8,border:'1.5px solid rgba(201,169,110,0.35)',cursor:'pointer'}}>
                  Tümünü Etkinleştir
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              SECTION 3 — INTELLIGENCE ANALYSIS
          ──────────────────────────────────────────────────────────── */}
          <div>
            <SectionHeading
              label="Intelligence Analysis"
              sublabel="Groq 70B — doğal dil ile pazar sentezi"
            />

            {/* Auth gate */}
            {status!=='loading' && !session ? (
              <SignInGate />
            ) : (
              <>
                {/* Command card */}
                <div style={{background:'#FFFFFF',border:'1.5px solid rgba(0,0,0,0.09)',borderRadius:14,overflow:'hidden',marginBottom:'1.25rem',boxShadow:'0 2px 14px rgba(0,0,0,0.06)'}}>
                  {/* Mode selector */}
                  <div style={{display:'flex',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'0.5rem 0.75rem',gap:'0.3rem'}}>
                    {MODES.map(m=>(
                      <button key={m.id} onClick={()=>setMode(m.id)} title={m.desc} style={{display:'inline-flex',alignItems:'center',gap:'0.3rem',padding:'0.3rem 0.65rem',borderRadius:6,border:mode===m.id?'1.5px solid rgba(201,169,110,0.4)':'1.5px solid transparent',background:mode===m.id?'rgba(201,169,110,0.09)':'transparent',cursor:'pointer',transition:'all 0.15s'}}>
                        <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.68rem',fontWeight:600,color:mode===m.id?'#C9A96E':'#A1A1AA'}}>{m.label}</span>
                        <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.46rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:mode===m.id?'#C9A96E':'#C4C4CC',background:mode===m.id?'rgba(201,169,110,0.12)':'rgba(0,0,0,0.04)',padding:'0.1rem 0.35rem',borderRadius:3}}>{m.badge}</span>
                      </button>
                    ))}
                  </div>

                  {/* Textarea */}
                  <div style={{padding:'0.875rem 1rem 0.625rem'}}>
                    <textarea ref={textareaRef} value={query} onChange={e=>handleQueryChange(e.target.value)} onKeyDown={handleKeyDown}
                      placeholder="Hangi verileri analiz etmemi istersin? Doğal dille anlat…"
                      rows={2}
                      style={{width:'100%',resize:'none',border:'none',outline:'none',background:'transparent',fontFamily:'Inter,sans-serif',fontSize:'0.87rem',color:'#0C0C0E',lineHeight:1.65,boxSizing:'border-box',minHeight:60}}
                    />
                  </div>

                  {/* Example chips */}
                  <div style={{padding:'0 1rem 0.625rem',display:'flex',flexWrap:'wrap',gap:'0.325rem'}}>
                    {EXAMPLES.map((p,i)=>(
                      <button key={i} onClick={()=>handleQueryChange(p)} style={{fontFamily:'Inter,sans-serif',fontSize:'0.6rem',color:'#71717A',background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.07)',borderRadius:999,padding:'0.22rem 0.6rem',cursor:'pointer',textAlign:'left',lineHeight:1.3,maxWidth:isMobile?'100%':240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',transition:'all 0.15s'}}>
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Submit bar */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.6rem 1rem',borderTop:'1px solid rgba(0,0,0,0.05)',background:'#FAFAF8'}}>
                    <span style={{fontFamily:'Inter,sans-serif',fontSize:'0.58rem',color:'#C4C4CC'}}>
                      {activeConnectors.length>0
                        ? `${activeConnectors.length} kaynak · Cmd+Enter`
                        : '⚠ Önce kaynak seçin'}
                    </span>
                    <button onClick={runAnalysis}
                      disabled={isRunning||!query.trim()||activeConnectors.length===0}
                      style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',padding:'0.5rem 1.25rem',background:isRunning||!query.trim()||activeConnectors.length===0?'rgba(0,0,0,0.06)':'linear-gradient(135deg,#C9A96E,#B8924F)',color:isRunning||!query.trim()||activeConnectors.length===0?'#C4C4CC':'#FFF',fontFamily:'Inter,sans-serif',fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.06em',borderRadius:8,border:'none',cursor:isRunning||!query.trim()||activeConnectors.length===0?'not-allowed':'pointer',boxShadow:isRunning||!query.trim()||activeConnectors.length===0?'none':'0 2px 10px rgba(201,169,110,0.32)',transition:'all 0.2s'}}>
                      {isRunning ? (
                        <><span style={{width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,0.3)',borderTopColor:'#FFF',animation:'spin 0.8s linear infinite',display:'inline-block'}} />Analiz ediliyor</>
                      ) : 'Analiz Et →'}
                    </button>
                  </div>
                </div>

                {/* Pipeline loader */}
                {isRunning && pipelineStage>=0 && (
                  <div style={{marginBottom:'1.25rem'}}><PipelineLoader stage={pipelineStage} /></div>
                )}

                {/* Error */}
                {error && !isRunning && (
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.875rem 1rem',background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,marginBottom:'1.25rem'}}>
                    <span style={{fontSize:'0.9rem'}}>✕</span>
                    <p style={{fontFamily:'Inter,sans-serif',fontSize:'0.76rem',color:'#B91C1C',margin:0,flex:1}}>{error}</p>
                    <button onClick={()=>setError(null)} style={{fontFamily:'Inter,sans-serif',fontSize:'0.65rem',color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',padding:0}}>Kapat</button>
                  </div>
                )}

                {/* Analysis output */}
                {result && !isRunning && (
                  <div ref={outputRef}><AnalysisOutput result={result} mode={mode} /></div>
                )}
              </>
            )}
          </div>

        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </>
  )
}
