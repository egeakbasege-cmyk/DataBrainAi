'use client'

/**
 * ChatComposer — Dark Obsidian Input with Gold Crown
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified dark surface — obsidian outer wrapper + deeper obsidian input card.
 * Mode rail: dark glass pills with vibrant mode color accents.
 * Input card: layered dark glass, gold border, luminous gold send helm.
 */

import { RefObject }               from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisMode }       from '@/components/ModeSelector'
import { InChatModeSwitcher }      from '@/components/InChatModeSwitcher'
import { HelmButton }              from '@/components/HelmButton'
import { VoiceInput }              from '@/components/VoiceInput'
import { FileAttachmentPill }      from '@/components/FileAttachmentPill'
import type { Attachment }         from '@/components/FileAttachmentPill'
import type { SailState }          from '@/hooks/useSailState'
import { useLanguage }             from '@/lib/i18n/LanguageContext'
import type { TranslationKey }     from '@/lib/i18n/translations'

// ── Palette ───────────────────────────────────────────────────────────────────

const T = {
  outerBg:     'rgba(8,11,18,0.97)',
  outerBorder: 'rgba(201,169,110,0.16)',
  pilBg:       'rgba(255,255,255,0.05)',
  pillBorder:  'rgba(255,255,255,0.08)',
  pillMuted:   'rgba(232,237,243,0.38)',
  cardBg:      'rgba(13,16,26,0.96)',
  cardBorder:  'rgba(201,169,110,0.32)',
  cardFocus:   'rgba(201,169,110,0.55)',
  cardShadow:  '0 0 0 1px rgba(201,169,110,0.08), 0 8px 40px rgba(0,0,0,0.45)',
  cardActive:  '0 0 0 3px rgba(201,169,110,0.10), 0 8px 48px rgba(0,0,0,0.50)',
  textInput:   '#DDE3EC',
  textMuted:   'rgba(221,227,236,0.35)',
  textFaint:   'rgba(221,227,236,0.20)',
  gold:        '#C9A96E',
  teal:        '#14B8A6',
  divider:     'rgba(201,169,110,0.10)',
} as const

// ── Mode rail data ────────────────────────────────────────────────────────────

const RAIL_MODES: { id: AnalysisMode; label: string; color: string; icon: string }[] = [
  { id: 'upwind',    label: 'Upwind',    color: '#4F8EF7', icon: '◎' },
  { id: 'sail',      label: 'SAIL',      color: '#A78BFA', icon: '◈' },
  { id: 'trim',      label: 'TRIM',      color: '#FBA928', icon: '▤' },
  { id: 'catamaran', label: 'Catamaran', color: '#FBBF24', icon: '⊕' },
  { id: 'operator',  label: 'Operator',  color: '#F87171', icon: '◆' },
  { id: 'synergy',   label: 'Synergy',   color: '#C9A96E', icon: '◬' },
  { id: 'scenario',  label: 'Scenario',  color: '#38BDF8', icon: '◐' },
  { id: 'downwind',  label: 'Downwind',  color: '#34D399', icon: '◉' },
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatComposer({
  input, mode, sailState, isActive, isMac, phIdx, attachment, fileError,
  autoMode, isConversing, convHistory,
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
      backdropFilter:      'blur(48px)',
      WebkitBackdropFilter:'blur(48px)',
      borderTop:           `1px solid ${T.outerBorder}`,
      padding:             '0 24px 20px',
      position:            'relative',
    }}>

      {/* Top gold hairline glow */}
      <div style={{
        position:      'absolute',
        top:            0,
        left:          '8%',
        right:         '8%',
        height:         1,
        background:    `linear-gradient(90deg, transparent, ${T.gold}45, transparent)`,
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
              display:       'flex',
              alignItems:    'center',
              gap:            8,
              padding:       '8px 14px',
              margin:        '12px 0 -4px',
              background:    'rgba(52,211,153,0.06)',
              border:        '1px solid rgba(52,211,153,0.18)',
              borderRadius:   9,
              overflow:      'hidden',
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#34D399', display: 'inline-block', flexShrink: 0,
                boxShadow: '0 0 8px rgba(52,211,153,0.50)',
              }}
            />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 11,
              color: '#34D399', fontWeight: 500, flex: 1,
            }}>
              Guided session · {Math.floor((convHistory as unknown[]).length / 2)} exchanges
            </span>
            <button onClick={onStartOver} style={{
              fontFamily: 'Inter, sans-serif', fontSize: 11,
              color: T.textMuted, background: 'none', border: 'none',
              cursor: 'pointer', padding: '0 4px',
            }}>
              Start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mode rail — dark glass pills ── */}
      <div style={{
        display:           'flex',
        gap:                4,
        overflowX:         'auto',
        padding:           '14px 0 10px',
        scrollbarWidth:    'none',
        msOverflowStyle:   'none',
      }}>
        {!autoMode && RAIL_MODES.map(m => {
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              disabled={isActive}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:           4,
                padding:      '5px 13px',
                borderRadius:  9999,
                background:    active
                  ? `linear-gradient(135deg, ${m.color}18 0%, ${m.color}0C 100%)`
                  : T.pilBg,
                border:       `1px solid ${active ? `${m.color}45` : T.pillBorder}`,
                boxShadow:     active ? `0 0 14px ${m.color}18` : 'none',
                backdropFilter:'blur(12px)',
                cursor:        isActive ? 'not-allowed' : 'pointer',
                opacity:       isActive ? 0.45 : 1,
                flexShrink:    0,
                transition:   'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                outline:      'none',
              }}
            >
              {active && (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: m.color, display: 'inline-block',
                    flexShrink: 0, boxShadow: `0 0 6px ${m.color}80`,
                  }}
                />
              )}
              <span style={{
                fontSize:   9,
                color:      active ? m.color : m.icon,
                lineHeight:  1,
              }}>
                {m.icon}
              </span>
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:       9,
                fontWeight:     active ? 700 : 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color:          active ? m.color : T.pillMuted,
              }}>
                {m.label}
              </span>
            </button>
          )
        })}

        {/* AUTO pill */}
        <button
          onClick={onAutoToggle}
          disabled={isActive}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:           5,
            padding:      '5px 13px',
            borderRadius:  9999,
            background:    autoMode
              ? 'linear-gradient(135deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.08) 100%)'
              : T.pilBg,
            border:       `1px solid ${autoMode ? 'rgba(201,169,110,0.40)' : T.pillBorder}`,
            boxShadow:     autoMode ? '0 0 16px rgba(201,169,110,0.16)' : 'none',
            backdropFilter:'blur(12px)',
            cursor:        isActive ? 'not-allowed' : 'pointer',
            opacity:       isActive ? 0.45 : 1,
            flexShrink:    0,
            marginLeft:   'auto',
            transition:   'all 0.2s cubic-bezier(0.22,1,0.36,1)',
            outline:      'none',
          }}
        >
          {autoMode && (
            <motion.span
              animate={{ opacity: [1, 0.25, 1], scale: [1, 0.7, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                width: 4, height: 4, borderRadius: '50%',
                background: T.gold, display: 'inline-block',
                flexShrink: 0, boxShadow: `0 0 8px ${T.gold}80`,
              }}
            />
          )}
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       9,
            fontWeight:     700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:          autoMode ? T.gold : T.pillMuted,
          }}>
            ⊕ AUTO
          </span>
        </button>
      </div>

      {/* ── Dark input card with gold crown ── */}
      <div style={{
        background:          T.cardBg,
        backdropFilter:      'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        border:              isActive ? `1px solid ${T.cardFocus}` : `1px solid ${T.cardBorder}`,
        borderRadius:         16,
        overflow:            'hidden',
        boxShadow:           isActive ? T.cardActive : T.cardShadow,
        transition:          'border-color 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s cubic-bezier(0.22,1,0.36,1)',
        position:            'relative',
      }}>

        {/* Inner top gold edge highlight when active */}
        {isActive && (
          <div style={{
            position:      'absolute',
            top:            0,
            left:          '10%',
            right:         '10%',
            height:         1,
            background:    `linear-gradient(90deg, transparent, ${T.gold}60, transparent)`,
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
            display:     'block',
            width:       '100%',
            minHeight:    48,
            maxHeight:    180,
            padding:     '15px 18px 10px',
            background:  'transparent',
            border:      'none',
            outline:     'none',
            resize:      'none',
            fontFamily:  'Inter, sans-serif',
            fontSize:     14,
            lineHeight:   1.7,
            color:        T.textInput,
            caretColor:   T.gold,
            letterSpacing:'-0.01em',
            opacity:       isActive ? 0.40 : 1,
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
                  : '1px solid rgba(255,255,255,0.09)',
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
              fontFamily:    'Inter, sans-serif',
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
                    fontFamily:         'Inter, sans-serif',
                    fontSize:            10,
                    fontWeight:          500,
                    color:               warn ? '#F87171' : T.textFaint,
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
              fontFamily: 'Inter, sans-serif',
              fontSize:    12,
              color:      '#F87171',
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
