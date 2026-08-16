'use client'

/**
 * ChatComposer — Light Glass Input with Mode Dropdown
 * ─────────────────────────────────────────────────────────────────────────────
 * Frosted tiffany glass outer wrapper.
 * Mode selector: single elegant dropdown button replacing scattered pill rail.
 * Input card: white glass with mint accent border.
 */

import { RefObject, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence }                from 'framer-motion'
import type { AnalysisMode }                       from '@/components/ModeSelector'
import { InChatModeSwitcher }                      from '@/components/InChatModeSwitcher'
import { HelmButton }                              from '@/components/HelmButton'
import { VoiceInput }                              from '@/components/VoiceInput'
import { FileAttachmentPill }                      from '@/components/FileAttachmentPill'
import type { Attachment }                         from '@/components/FileAttachmentPill'
import type { SailState }                          from '@/hooks/useSailState'
import { useLanguage }                             from '@/lib/i18n/LanguageContext'
import type { TranslationKey }                     from '@/lib/i18n/translations'

// ── Palette ───────────────────────────────────────────────────────────────────

const T = {
  outerBg:     'rgba(8,9,13,0.72)',
  outerBorder: 'rgba(201,169,110,0.22)',
  cardBg:      'rgba(255,255,255,0.05)',
  cardBorder:  'rgba(201,169,110,0.28)',
  cardFocus:   'rgba(129,216,208,0.45)',
  cardShadow:  '0 0 0 1px rgba(201,169,110,0.10), 0 6px 28px rgba(0,0,0,0.30)',
  cardActive:  '0 0 0 3px rgba(129,216,208,0.12), 0 6px 36px rgba(0,0,0,0.35)',
  textInput:   '#E8EDF3',
  textMuted:   'rgba(232,237,243,0.42)',
  textFaint:   'rgba(232,237,243,0.26)',
  gold:        '#C9A96E',
  teal:        '#81d8d0',
  tealDim:     'rgba(129,216,208,0.08)',
  divider:     'rgba(201,169,110,0.14)',
} as const

// ── Mode data ─────────────────────────────────────────────────────────────────

const ALL_MODES: {
  id:      AnalysisMode
  label:   string
  color:   string
  icon:    string
  tagline: string
}[] = [
  { id: 'upwind',    label: 'Upwind',    color: '#2563EB', icon: '◎', tagline: 'Executive strategy, BLUF format' },
  { id: 'sail',      label: 'SAIL',      color: '#7C3AED', icon: '◈', tagline: 'Adaptive streaming intelligence' },
  { id: 'trim',      label: 'TRIM',      color: '#B45309', icon: '▤', tagline: '30–60–90 day milestone roadmap' },
  { id: 'catamaran', label: 'Catamaran', color: '#D97706', icon: '⊕', tagline: 'Dual-track parallel analysis' },
  { id: 'operator',  label: 'Operator',  color: '#DC2626', icon: '◆', tagline: 'High-velocity tactical decisions' },
  { id: 'synergy',   label: 'Synergy',   color: '#C9A96E', icon: '◬', tagline: 'Multi-mode synthesis view' },
  { id: 'scenario',  label: 'Scenario',  color: '#0891B2', icon: '◐', tagline: 'Bull · base · bear case modelling' },
  { id: 'downwind',  label: 'Downwind',  color: '#059669', icon: '◉', tagline: 'Guided coaching conversation' },
]

const PLACEHOLDER_KEYS = [
  'chat.placeholder.0','chat.placeholder.1','chat.placeholder.2','chat.placeholder.3',
] as const

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatComposerProps {
  input:        string
  mode:         AnalysisMode
  sailState:    SailState
  isActive:     boolean
  isMac:        boolean
  phIdx:        number
  attachment:   Attachment | null
  fileError:    string
  autoMode:     boolean
  isConversing: boolean
  convHistory:  unknown[]
  businessMode?:     boolean
  textareaRef:  RefObject<HTMLTextAreaElement>
  fileInputRef: RefObject<HTMLInputElement>
  onChange:          (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit:          () => void
  onModeChange:      (m: AnalysisMode) => void
  onAutoToggle:      () => void
  onFileSelect:      (e: React.ChangeEvent<HTMLInputElement>) => void
  onAttachClick:     () => void
  onRemoveFile:      () => void
  onVoiceTranscript: (text: string) => void
  onStartOver:       () => void
  onToggleBusiness?: () => void
}

// ── Mode Dropdown ─────────────────────────────────────────────────────────────

function ModeDropdown({
  mode,
  autoMode,
  isActive,
  onModeChange,
  onAutoToggle,
}: {
  mode:         AnalysisMode
  autoMode:     boolean
  isActive:     boolean
  onModeChange: (m: AnalysisMode) => void
  onAutoToggle: () => void
}) {
  const [open, setOpen]   = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)
  const activeMeta        = ALL_MODES.find(m => m.id === mode) ?? ALL_MODES[0]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>

      {/* Trigger button */}
      <motion.button
        onClick={() => !isActive && setOpen(o => !o)}
        disabled={isActive}
        whileHover={isActive ? {} : { scale: 1.02 }}
        whileTap={isActive ? {} : { scale: 0.97 }}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:            7,
          padding:       '6px 14px 6px 12px',
          borderRadius:   9999,
          background:     autoMode
            ? 'rgba(201,169,110,0.12)'
            : `linear-gradient(135deg, ${activeMeta.color}18 0%, rgba(8,9,13,0.45) 100%)`,
          border:        `1px solid ${autoMode ? 'rgba(201,169,110,0.32)' : `${activeMeta.color}35`}`,
          boxShadow:     `0 2px 10px rgba(0,0,0,0.05)`,
          cursor:         isActive ? 'not-allowed' : 'pointer',
          opacity:        isActive ? 0.45 : 1,
          outline:       'none',
          backdropFilter:'blur(12px)',
          transition:    'all 0.2s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Dot */}
        <motion.span
          animate={isActive
            ? { opacity: [1, 0.2, 1] }
            : { opacity: 0.85 }}
          transition={{ duration: 1.2, repeat: isActive ? Infinity : 0 }}
          style={{
            display:      'inline-block',
            width:         5,
            height:        5,
            borderRadius: '50%',
            background:    autoMode ? T.gold : activeMeta.color,
            flexShrink:    0,
            boxShadow:     isActive ? `0 0 8px ${activeMeta.color}80` : 'none',
          }}
        />

        {/* Label */}
        <span style={{
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:       10,
          fontWeight:     700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:          autoMode ? T.gold : activeMeta.color,
        }}>
          {autoMode ? '⊕ Auto' : activeMeta.label}
        </span>

        {/* Chevron */}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize:   8,
            color:       autoMode ? T.gold : activeMeta.color,
            lineHeight:  1,
            marginLeft:  1,
            opacity:     0.75,
          }}
        >
          ▾
        </motion.span>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:       'absolute',
              bottom:         'calc(100% + 10px)',
              left:            0,
              zIndex:          50,
              background:     'linear-gradient(135deg, rgba(201,169,110,0.10) 0%, rgba(8,9,13,0.88) 60%, rgba(20,184,166,0.06) 100%)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border:         '1px solid rgba(201,169,110,0.28)',
              borderRadius:    16,
              boxShadow:      '0 8px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,169,110,0.06), inset 0 1px 0 rgba(255,255,255,0.07)',
              padding:        '8px',
              width:           320,
            }}
          >
            {/* Gold hairline top */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.45), rgba(129,216,208,0.30), transparent)',
              borderRadius: '0 0 1px 1px',
            }} />

            {/* Header */}
            <div style={{
              padding:      '6px 10px 8px',
              marginBottom:  2,
            }}>
              <span style={{
                fontFamily:    'var(--font-inter), sans-serif',
                fontSize:       8.5,
                fontWeight:     700,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color:         'rgba(232,237,243,0.38)',
              }}>
                Intelligence Mode
              </span>
            </div>

            {/* Mode list */}
            {ALL_MODES.map(m => {
              const isActive = mode === m.id && !autoMode
              return (
                <motion.button
                  key={m.id}
                  onClick={() => { onModeChange(m.id); setOpen(false) }}
                  whileHover={{ background: `${m.color}0A` }}
                  style={{
                    width:         '100%',
                    display:       'flex',
                    alignItems:    'center',
                    gap:            10,
                    padding:       '9px 10px',
                    borderRadius:   10,
                    background:     isActive ? `${m.color}0E` : 'transparent',
                    border:         isActive ? `1px solid ${m.color}25` : '1px solid transparent',
                    cursor:        'pointer',
                    outline:       'none',
                    textAlign:     'left',
                    transition:    'all 0.15s',
                  }}
                >
                  <span style={{
                    fontSize:   14,
                    color:      m.color,
                    lineHeight:  1,
                    flexShrink:  0,
                    width:       18,
                    textAlign:  'center',
                  }}>
                    {m.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontFamily:    'var(--font-inter), sans-serif',
                        fontSize:       10.5,
                        fontWeight:     isActive ? 700 : 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:          isActive ? m.color : '#E8EDF3',
                      }}>
                        {m.label}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize:   7.5,
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontWeight:  700,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color:      m.color,
                          background: `${m.color}12`,
                          padding:   '1px 5px',
                          borderRadius: 3,
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize:    10,
                      color:      'rgba(232,237,243,0.45)',
                      lineHeight:  1.35,
                      display:    'block',
                    }}>
                      {m.tagline}
                    </span>
                  </div>
                </motion.button>
              )
            })}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(201,169,110,0.15)', margin: '4px 8px' }} />

            {/* AUTO option */}
            <motion.button
              onClick={() => { onAutoToggle(); setOpen(false) }}
              whileHover={{ background: 'rgba(201,169,110,0.08)' }}
              style={{
                width:         '100%',
                display:       'flex',
                alignItems:    'center',
                gap:            10,
                padding:       '9px 10px',
                borderRadius:   10,
                background:     autoMode ? 'rgba(201,169,110,0.10)' : 'transparent',
                border:         autoMode ? '1px solid rgba(201,169,110,0.28)' : '1px solid transparent',
                cursor:        'pointer',
                outline:       'none',
                textAlign:     'left',
                transition:    'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14, color: T.gold, lineHeight: 1, flexShrink: 0, width: 18, textAlign: 'center' }}>
                ⊕
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily:    'var(--font-inter), sans-serif',
                    fontSize:       10.5,
                    fontWeight:     autoMode ? 700 : 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:          autoMode ? T.gold : '#E8EDF3',
                  }}>
                    Auto
                  </span>
                  {autoMode && (
                    <span style={{
                      fontSize:   7.5, fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: T.gold, background: 'rgba(201,169,110,0.12)',
                      padding: '1px 5px', borderRadius: 3,
                    }}>Active</span>
                  )}
                </div>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, color: 'rgba(232,237,243,0.45)', lineHeight: 1.35, display: 'block' }}>
                  AI selects the best mode for your query
                </span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatComposer({
  input, mode, sailState, isActive, isMac, phIdx, attachment, fileError,
  autoMode, isConversing, convHistory, businessMode, onToggleBusiness,
  textareaRef, fileInputRef,
  onChange, onSubmit, onModeChange, onAutoToggle,
  onFileSelect, onAttachClick, onRemoveFile, onVoiceTranscript, onStartOver,
}: ChatComposerProps) {
  const { t }     = useLanguage()
  const PHLDR     = PLACEHOLDER_KEYS.map(k => t(k as TranslationKey))
  const charsLeft = 2000 - input.length
  const warn      = charsLeft < 200

  return (
    <div style={{
      flexShrink:          0,
      background:          T.outerBg,
      backdropFilter:      'blur(40px)',
      WebkitBackdropFilter:'blur(40px)',
      borderTop:           `1px solid ${T.outerBorder}`,
      padding:             '0 16px 20px',
      paddingBottom:       'max(20px, calc(20px + env(safe-area-inset-bottom)))',
      position:            'relative',
    }}>

      {/* Top teal-to-gold hairline */}
      <div style={{
        position:      'absolute',
        top:            0,
        left:          '8%',
        right:         '8%',
        height:         1,
        background:    `linear-gradient(90deg, transparent, rgba(129,216,208,0.25), rgba(201,169,110,0.28), transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Downwind session indicator */}
      <AnimatePresence>
        {isConversing && (convHistory as unknown[]).length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:         8,
              padding:    '8px 14px',
              margin:     '12px 0 -4px',
              background: 'rgba(129,216,208,0.06)',
              border:     '1px solid rgba(129,216,208,0.20)',
              borderRadius: 9,
              overflow:   'hidden',
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{
                width: 5, height: 5, borderRadius: '50%',
                background: T.teal, display: 'inline-block', flexShrink: 0,
                boxShadow: '0 0 8px rgba(129,216,208,0.45)',
              }}
            />
            <span style={{
              fontFamily: 'var(--font-inter), sans-serif', fontSize: 11,
              color: T.teal, fontWeight: 500, flex: 1,
            }}>
              Guided session · {Math.floor((convHistory as unknown[]).length / 2)} exchanges
            </span>
            <button onClick={onStartOver} style={{
              fontFamily: 'var(--font-inter), sans-serif', fontSize: 11,
              color: T.textMuted, background: 'none', border: 'none',
              cursor: 'pointer', padding: '0 4px',
            }}>
              Start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mode dropdown row ── */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:          8,
        padding:     '12px 0 8px',
        flexWrap:    'nowrap',
      }}>
        <ModeDropdown
          mode={mode}
          autoMode={autoMode}
          isActive={isActive}
          onModeChange={onModeChange}
          onAutoToggle={onAutoToggle}
        />
        <span style={{
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:       9,
          color:          T.textFaint,
          letterSpacing: '0.04em',
          flex:           1,
          overflow:       'hidden',
          whiteSpace:     'nowrap',
          textOverflow:   'ellipsis',
        }}>
          · select your intelligence mode
        </span>

        {/* Business / Personal toggle — only visible on mobile (dock hidden there) */}
        {onToggleBusiness && (
          <button
            onClick={onToggleBusiness}
            className="sail-biz-toggle"
            title={businessMode ? 'Switch to Personal mode' : 'Switch to Business mode'}
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           '0.3rem',
              flexShrink:     0,
              padding:       '3px 9px',
              background:    businessMode
                ? 'linear-gradient(135deg, rgba(6,78,59,0.70) 0%, rgba(16,185,129,0.18) 100%)'
                : 'rgba(255,255,255,0.06)',
              border:        businessMode
                ? '1px solid rgba(16,185,129,0.40)'
                : '1px solid rgba(255,255,255,0.12)',
              borderRadius:  '999px',
              cursor:        'pointer',
              fontFamily:    'var(--font-inter), sans-serif',
              fontSize:      '0.60rem',
              fontWeight:    600,
              letterSpacing: '0.05em',
              color:         businessMode ? '#34D399' : 'rgba(255,255,255,0.45)',
              whiteSpace:    'nowrap',
              transition:    'all 0.2s',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>{businessMode ? '💼' : '✨'}</span>
            <span>{businessMode ? 'BIZ' : 'Personal'}</span>
          </button>
        )}
      </div>
      <style>{`
        /* Desktop: floating dock pill handles this → hide inline toggle */
        @media (min-width: 769px) { .sail-biz-toggle { display: none !important; } }
      `}</style>

      {/* ── Light glass input card ── */}
      <div style={{
        background:          T.cardBg,
        backdropFilter:      'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        border:              isActive ? `1px solid ${T.cardFocus}` : `1px solid ${T.cardBorder}`,
        borderRadius:         16,
        overflow:            'hidden',
        boxShadow:           isActive ? T.cardActive : T.cardShadow,
        transition:          'border-color 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s cubic-bezier(0.22,1,0.36,1)',
        position:            'relative',
      }}>

        {/* Teal inner top edge when active */}
        {isActive && (
          <div style={{
            position:      'absolute',
            top:            0,
            left:          '10%',
            right:         '10%',
            height:         1,
            background:    `linear-gradient(90deg, transparent, rgba(129,216,208,0.50), transparent)`,
            pointerEvents: 'none',
            zIndex:         1,
          }} />
        )}

        {/* Attachment pill */}
        <AnimatePresence>
          {attachment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ padding: '10px 16px 0', display: 'flex', gap: 8, overflow: 'hidden' }}
            >
              <FileAttachmentPill attachment={attachment} analyzing={isActive} onRemove={onRemoveFile} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onChange}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              onSubmit()
            }
          }}
          placeholder={PHLDR[phIdx]}
          disabled={isActive}
          rows={1}
          style={{
            display:      'block',
            width:        '100%',
            minHeight:     48,
            maxHeight:     180,
            padding:      '15px 18px 10px',
            background:   'transparent',
            border:       'none',
            outline:      'none',
            resize:       'none',
            fontFamily:   'var(--font-inter), sans-serif',
            fontSize:      14,
            lineHeight:    1.7,
            color:         T.textInput,
            caretColor:    T.teal,
            letterSpacing: '-0.01em',
            opacity:        isActive ? 0.40 : 1,
            boxSizing:    'border-box',
          }}
        />

        {/* Toolbar */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 16px 13px',
          borderTop:      `1px solid ${T.divider}`,
          gap:             8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Attach */}
            <button
              type="button"
              onClick={onAttachClick}
              disabled={isActive}
              title="Attach file"
              style={{
                width:          32,
                height:         32,
                borderRadius:   8,
                background:     attachment ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.05)',
                border:         attachment
                  ? '1px solid rgba(201,169,110,0.35)'
                  : '1px solid rgba(201,169,110,0.16)',
                cursor:         isActive ? 'not-allowed' : 'pointer',
                opacity:        isActive ? 0.35 : 1,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:      0,
                transition:     'all 0.15s',
                outline:        'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={attachment ? T.gold : T.textMuted}
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.xlsx,.xls,.pdf,image/png,image/jpeg,image/webp,image/gif"
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />

            <VoiceInput disabled={isActive} onTranscript={onVoiceTranscript} />

            <span style={{
              fontFamily:    'var(--font-inter), sans-serif',
              fontSize:       10,
              fontWeight:     500,
              letterSpacing: '0.06em',
              color:          T.textFaint,
            }}>
              {isMac ? '⌘' : 'Ctrl'}↩
            </span>

            <AnimatePresence>
              {input.length > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily:         'var(--font-inter), sans-serif',
                    fontSize:            10,
                    fontWeight:          500,
                    color:               warn ? '#DC2626' : T.textFaint,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing:      '0.04em',
                  }}
                >
                  {charsLeft}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InChatModeSwitcher mode={mode} onChange={onModeChange} disabled={isActive} />
            <HelmButton state={sailState} onClick={onSubmit} disabled={isActive || !input.trim()} />
          </div>
        </div>
      </div>

      {/* File error */}
      <AnimatePresence>
        {fileError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:    12,
              color:      '#DC2626',
              margin:     '6px 4px 0',
              lineHeight:  1.5,
            }}
          >
            {fileError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
