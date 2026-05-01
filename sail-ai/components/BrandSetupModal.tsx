'use client'

/**
 * BrandSetupModal — Sail AI Brand Customisation
 *
 * First-visit overlay that lets users:
 *   1. Enter their company name (displayed in gold editorial typography)
 *   2. Select ≥2 of the 6 analysis modes they want active
 *   3. See their custom AI name rendered live before confirming
 *
 * Typography: Cormorant Garamond — high-contrast editorial serif
 *             closest to "New York or Nowhere" brand aesthetic.
 * Palette:    Antique gold (#C9A96E), deep champagne (#E8D4A0), warm ink (#1A1209).
 *
 * Storage key: sail_brand_config (localStorage)
 * Non-breaking: modal only appears when config absent; existing workflow unchanged.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence }      from 'framer-motion'
import type { AnalysisMode }            from '@/components/ModeSelector'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandConfig {
  companyName: string
  aiName:      string
  modes:       AnalysisMode[]
  savedAt:     number
}

const STORAGE_KEY = 'sail_brand_config'

// ─── Mode definitions ─────────────────────────────────────────────────────────

interface ModeOption {
  id:    AnalysisMode
  icon:  string
  label: string
  sub:   string
  pro?:  boolean
}

const MODES: ModeOption[] = [
  { id: 'upwind',    icon: '⚡', label: 'Upwind',    sub: 'Direct strategy — give data, get precision' },
  { id: 'downwind',  icon: '🧭', label: 'Downwind',  sub: 'Guided coaching — builds strategy through dialogue' },
  { id: 'sail',      icon: '🌊', label: 'AI+',       sub: 'Auto-intent — adapts depth and format to your query' },
  { id: 'trim',      icon: '✂️', label: 'Trim',      sub: 'Strategic timeline — phased milestones with targets', pro: true },
  { id: 'catamaran', icon: '⛵', label: 'Catamaran', sub: 'Dual-track: Market Growth + CX integration',          pro: true },
  { id: 'operator',  icon: '🎯', label: 'Operator',  sub: 'Universal intelligence — any domain, same depth' },
]

// ─── Hook: read / write brand config ─────────────────────────────────────────

export function useBrandConfig() {
  const [config, setConfig] = useState<BrandConfig | null>(null)
  const [ready,  setReady]  = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setConfig(JSON.parse(raw) as BrandConfig)
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  const save = (cfg: BrandConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
    setConfig(cfg)
  }

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig(null)
  }

  return { config, ready, save, clear }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (config: BrandConfig) => void
}

export function BrandSetupModal({ onComplete }: Props) {
  const [step,        setStep]        = useState<1 | 2>(1)
  const [companyName, setCompanyName] = useState('')
  const [aiName,      setAiName]      = useState('')
  const [aiNameEdited,setAiNameEdited]= useState(false)
  const [selected,    setSelected]    = useState<Set<AnalysisMode>>(new Set())
  const [nameError,   setNameError]   = useState('')
  const [modeError,   setModeError]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-derive AI name from company name unless user edited it
  useEffect(() => {
    if (!aiNameEdited && companyName.trim()) {
      setAiName(`${companyName.trim()} AI`)
    }
  }, [companyName, aiNameEdited])

  useEffect(() => {
    if (step === 1) inputRef.current?.focus()
  }, [step])

  const toggleMode = (id: AnalysisMode) => {
    setModeError('')
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStep1 = () => {
    if (!companyName.trim()) {
      setNameError('Please enter your company name')
      return
    }
    setNameError('')
    setStep(2)
  }

  const handleFinish = () => {
    if (selected.size < 2) {
      setModeError('Select at least 2 modes for best results')
      return
    }
    const cfg: BrandConfig = {
      companyName: companyName.trim(),
      aiName:      aiName.trim() || `${companyName.trim()} AI`,
      modes:       Array.from(selected) as AnalysisMode[],
      savedAt:     Date.now(),
    }
    onComplete(cfg)
  }

  // ─── Shared styles ──────────────────────────────────────────────────────────

  const GOLD_PRIMARY   = '#C9A96E'
  const GOLD_LIGHT     = '#E8D4A0'
  const GOLD_PALE      = 'rgba(201,169,110,0.12)'
  const GOLD_BORDER    = 'rgba(201,169,110,0.28)'
  const INK            = '#1A1209'
  const PARCHMENT      = '#FAFAF8'
  const MUTED          = '#7B6A4E'

  // Editorial serif — New York / Didot aesthetic
  const SERIF = '"Cormorant Garamond", "Cormorant", "IM Fell English", Georgia, serif'

  return (
    <>
      {/* Google Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');

        .brand-mode-card:hover { border-color: rgba(201,169,110,0.55) !important; background: rgba(201,169,110,0.07) !important; }
        .brand-continue-btn:hover { background: #B8935A !important; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(201,169,110,0.35) !important; }
        .brand-input:focus { border-color: rgba(201,169,110,0.6) !important; box-shadow: 0 0 0 3px rgba(201,169,110,0.12) !important; outline: none; }
        .brand-ai-input:focus { border-color: rgba(201,169,110,0.6) !important; outline: none; }
      `}</style>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(10,8,4,0.72)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            background:   PARCHMENT,
            border:       `1px solid ${GOLD_BORDER}`,
            borderRadius: '20px',
            width:        '100%',
            maxWidth:     '520px',
            overflow:     'hidden',
            boxShadow:    '0 32px 80px rgba(0,0,0,0.4), 0 2px 0 rgba(201,169,110,0.25) inset',
            position:     'relative',
          }}
        >
          {/* Gold top accent line */}
          <div style={{ height: '2px', background: `linear-gradient(90deg, transparent, ${GOLD_PRIMARY}, ${GOLD_LIGHT}, ${GOLD_PRIMARY}, transparent)` }} />

          {/* Header */}
          <div style={{ padding: '32px 36px 24px', textAlign: 'center', borderBottom: `1px solid ${GOLD_BORDER}` }}>
            {/* Live AI name preview */}
            <motion.div
              key={aiName || 'placeholder'}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontFamily:    SERIF,
                fontSize:      aiName ? 'clamp(1.6rem, 4vw, 2.4rem)' : '1.4rem',
                fontWeight:    300,
                letterSpacing: aiName ? '-0.02em' : '0.1em',
                lineHeight:    1.1,
                background:    `linear-gradient(135deg, ${GOLD_PRIMARY} 0%, ${GOLD_LIGHT} 50%, ${GOLD_PRIMARY} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
                marginBottom:  '8px',
                minHeight:     '3rem',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                fontStyle:     'italic',
              }}
            >
              {aiName || 'Your AI'}
            </motion.div>

            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {step === 1 ? 'Personalise your advisor' : 'Choose your intelligence modes'}
            </p>

            {/* Step indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
              {[1, 2].map(s => (
                <div key={s} style={{
                  width: s === step ? '20px' : '6px',
                  height: '4px',
                  borderRadius: '50px',
                  background: s === step ? GOLD_PRIMARY : GOLD_BORDER,
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 36px 32px' }}>
            <AnimatePresence mode="wait">

              {/* ── Step 1: Company name ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                >
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Company Name
                  </label>
                  <input
                    ref={inputRef}
                    className="brand-input"
                    type="text"
                    value={companyName}
                    onChange={e => { setCompanyName(e.target.value); setNameError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleStep1()}
                    placeholder="e.g. Acme, DataBrain, Volta..."
                    maxLength={32}
                    style={{
                      width:        '100%',
                      padding:      '12px 16px',
                      background:   'rgba(255,255,255,0.8)',
                      border:       `1.5px solid ${GOLD_BORDER}`,
                      borderRadius: '10px',
                      fontFamily:   SERIF,
                      fontSize:     '1.15rem',
                      fontWeight:   400,
                      color:        INK,
                      transition:   'all 0.2s',
                      boxSizing:    'border-box',
                    }}
                  />
                  {nameError && (
                    <p style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '6px', fontFamily: 'Inter, sans-serif' }}>{nameError}</p>
                  )}

                  {/* AI name customisation */}
                  <div style={{ marginTop: '20px' }}>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Your AI Name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — auto-generated)</span>
                    </label>
                    <input
                      className="brand-ai-input"
                      type="text"
                      value={aiName}
                      onChange={e => { setAiName(e.target.value); setAiNameEdited(true) }}
                      placeholder={companyName ? `${companyName} AI` : 'Your AI'}
                      maxLength={40}
                      style={{
                        width:        '100%',
                        padding:      '10px 16px',
                        background:   GOLD_PALE,
                        border:       `1px solid ${GOLD_BORDER}`,
                        borderRadius: '10px',
                        fontFamily:   SERIF,
                        fontStyle:    'italic',
                        fontSize:     '1rem',
                        color:        GOLD_PRIMARY,
                        transition:   'border-color 0.2s',
                        boxSizing:    'border-box',
                      }}
                    />
                  </div>

                  <button
                    className="brand-continue-btn"
                    onClick={handleStep1}
                    style={{
                      marginTop:    '24px',
                      width:        '100%',
                      padding:      '13px',
                      background:   GOLD_PRIMARY,
                      border:       'none',
                      borderRadius: '10px',
                      fontFamily:   'Inter, sans-serif',
                      fontWeight:   600,
                      fontSize:     '0.88rem',
                      color:        '#1A1209',
                      cursor:       'pointer',
                      letterSpacing:'0.04em',
                      transition:   'all 0.2s',
                    }}
                  >
                    Choose Your Modes →
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Mode selection ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: MUTED, marginBottom: '16px', lineHeight: 1.5 }}>
                    Select <strong style={{ color: INK }}>at least 2 modes</strong> — you can switch between them anytime.
                    Selecting 2 gives the sharpest results.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {MODES.map(m => {
                      const active = selected.has(m.id)
                      return (
                        <button
                          key={m.id}
                          className="brand-mode-card"
                          onClick={() => toggleMode(m.id)}
                          style={{
                            display:      'flex',
                            alignItems:   'center',
                            gap:          '12px',
                            padding:      '11px 14px',
                            background:   active ? `rgba(201,169,110,0.1)` : 'rgba(255,255,255,0.6)',
                            border:       `1.5px solid ${active ? GOLD_PRIMARY : GOLD_BORDER}`,
                            borderRadius: '10px',
                            cursor:       'pointer',
                            textAlign:    'left',
                            transition:   'all 0.18s',
                            position:     'relative',
                          }}
                        >
                          <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.82rem', color: INK }}>{m.label}</span>
                              {m.pro && (
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, color: GOLD_PRIMARY, background: GOLD_PALE, border: `1px solid ${GOLD_BORDER}`, padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.06em' }}>PRO</span>
                              )}
                            </div>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: MUTED, margin: 0, lineHeight: 1.4, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sub}</p>
                          </div>
                          {/* Checkmark */}
                          <div style={{
                            width:        '18px',
                            height:       '18px',
                            borderRadius: '50%',
                            border:       `1.5px solid ${active ? GOLD_PRIMARY : GOLD_BORDER}`,
                            background:   active ? GOLD_PRIMARY : 'transparent',
                            display:      'flex',
                            alignItems:   'center',
                            justifyContent: 'center',
                            flexShrink:   0,
                            transition:   'all 0.18s',
                          }}>
                            {active && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="#1A1209" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {modeError && (
                    <p style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '10px', fontFamily: 'Inter, sans-serif' }}>{modeError}</p>
                  )}

                  {/* Selection counter */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                    <button
                      onClick={() => setStep(1)}
                      style={{ background: 'none', border: 'none', color: MUTED, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: '4px 0' }}
                    >
                      ← Back
                    </button>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: selected.size >= 2 ? GOLD_PRIMARY : MUTED, fontWeight: 500 }}>
                      {selected.size} / 6 selected {selected.size >= 2 ? '✓' : `(${2 - selected.size} more needed)`}
                    </span>
                  </div>

                  <button
                    className="brand-continue-btn"
                    onClick={handleFinish}
                    disabled={selected.size < 2}
                    style={{
                      marginTop:    '12px',
                      width:        '100%',
                      padding:      '13px',
                      background:   selected.size >= 2 ? GOLD_PRIMARY : 'rgba(201,169,110,0.25)',
                      border:       'none',
                      borderRadius: '10px',
                      fontFamily:   'Inter, sans-serif',
                      fontWeight:   600,
                      fontSize:     '0.88rem',
                      color:        selected.size >= 2 ? '#1A1209' : MUTED,
                      cursor:       selected.size >= 2 ? 'pointer' : 'not-allowed',
                      letterSpacing:'0.04em',
                      transition:   'all 0.2s',
                    }}
                  >
                    {selected.size >= 2
                      ? `Launch ${aiName || companyName + ' AI'} →`
                      : `Select ${2 - selected.size} more mode${2 - selected.size !== 1 ? 's' : ''}`}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom accent */}
          <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${GOLD_BORDER}, transparent)` }} />
        </motion.div>
      </motion.div>
    </>
  )
}

// ─── Compact brand nameplate for the animation header ─────────────────────────

interface NameplateProps {
  config: BrandConfig
  onEdit?: () => void
}

export function BrandNameplate({ config, onEdit }: NameplateProps) {
  const SERIF      = '"Cormorant Garamond", "Cormorant", Georgia, serif'
  const GOLD       = '#C9A96E'
  const GOLD_LIGHT = '#E8D4A0'
  const MUTED      = '#8B7355'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');
        .brand-nameplate-edit:hover { opacity: 1 !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px 8px', position: 'relative' }}>
        {/* Company name — small cap label */}
        <div style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.58rem',
          fontWeight:    600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         MUTED,
          marginBottom:  '2px',
        }}>
          {config.companyName}
        </div>

        {/* AI name — editorial gold serif */}
        <div style={{
          fontFamily:  SERIF,
          fontStyle:   'italic',
          fontWeight:  300,
          fontSize:    'clamp(1.1rem, 3vw, 1.5rem)',
          letterSpacing: '-0.01em',
          lineHeight:  1.1,
          background:  `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 45%, ${GOLD} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor:  'transparent',
          backgroundClip:       'text',
        }}>
          {config.aiName}
        </div>

        {/* Active modes chips */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {config.modes.map(m => {
            const def = MODES.find(x => x.id === m)
            if (!def) return null
            return (
              <span key={m} style={{
                fontFamily:  'Inter, sans-serif',
                fontSize:    '0.58rem',
                fontWeight:  600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color:       GOLD,
                background:  'rgba(201,169,110,0.1)',
                border:      '1px solid rgba(201,169,110,0.22)',
                borderRadius: '4px',
                padding:     '2px 7px',
              }}>
                {def.icon} {def.label}
              </span>
            )
          })}
        </div>

        {/* Edit button */}
        {onEdit && (
          <button
            className="brand-nameplate-edit"
            onClick={onEdit}
            title="Customise your AI"
            style={{
              position: 'absolute', top: '10px', right: '12px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: MUTED, fontSize: '0.68rem', opacity: 0.5,
              fontFamily: 'Inter, sans-serif', padding: '4px',
              transition: 'opacity 0.2s',
            }}
          >
            ✎ edit
          </button>
        )}
      </div>
    </>
  )
}
