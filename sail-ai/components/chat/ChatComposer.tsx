'use client'

/**
 * ChatComposer — Dark Anchored Input with Gold Frame
 * ─────────────────────────────────────────────────────────────────────────────
 * Outer wrapper:  mint glass (50% palette allocation)
 * Input card:     dark obsidian + gold border (20% dark allocation)
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
  outerBg:    'rgba(248,253,251,0.93)',
  outerBorder:'rgba(129,199,185,0.30)',
  pillMuted:  'rgba(26,43,60,0.42)',
  pillBg:     'rgba(255,255,255,0.62)',
  pillBorder: 'rgba(129,199,185,0.24)',
  cardBg:     'rgba(10,13,20,0.93)',
  cardBorder: 'rgba(201,169,110,0.40)',
  cardFocus:  'rgba(201,169,110,0.62)',
  textInput:  '#E8EDF3',
  textMuted:  'rgba(232,237,243,0.38)',
  gold:       '#C9A96E',
  teal:       '#14B8A6',
} as const

// ── Mode rail data ────────────────────────────────────────────────────────────

const RAIL_MODES: { id: AnalysisMode; label: string; color: string }[] = [
  { id: 'upwind',    label: 'Upwind',    color: '#2563EB' },
  { id: 'sail',      label: 'SAIL',      color: '#7C3AED' },
  { id: 'trim',      label: 'TRIM',      color: '#B45309' },
  { id: 'catamaran', label: 'Catamaran', color: '#D97706' },
  { id: 'operator',  label: 'Operator',  color: '#DC2626' },
  { id: 'synergy',   label: 'Synergy',   color: '#C9A96E' },
  { id: 'scenario',  label: 'Scenario',  color: '#0891B2' },
  { id: 'downwind',  label: 'Downwind',  color: '#059669' },
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
      backdropFilter:      'blur(40px)',
      WebkitBackdropFilter:'blur(40px)',
      borderTop:           `1px solid ${T.outerBorder}`,
      padding:             '0 24px 20px',
    }}>

      {/* Downwind session indicator */}
      <AnimatePresence>
        {isConversing && (convHistory as unknown[]).length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', margin: '12px 0 -4px',
              background: 'rgba(5,150,105,0.08)',
              border: '1px solid rgba(5,150,105,0.2)',
              borderRadius: 8, overflow: 'hidden',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#059669', fontWeight: 500, flex: 1 }}>
              Guided session · {Math.floor((convHistory as unknown[]).length / 2)} exchanges
            </span>
            <button onClick={onStartOver} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(26,43,60,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mode rail — mint glass pills ── */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '14px 0 10px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {!autoMode && RAIL_MODES.map(m => {
          const active = mode === m.id
          return (
            <button key={m.id} onClick={() => onModeChange(m.id)} disabled={isActive}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                borderRadius: 9999,
                background:  active ? `${m.color}14` : T.pillBg,
                border:      `1px solid ${active ? `${m.color}45` : T.pillBorder}`,
                backdropFilter: 'blur(12px)',
                cursor:      isActive ? 'not-allowed' : 'pointer',
                opacity:     isActive ? 0.5 : 1,
                flexShrink:  0, transition: 'all 0.18s', outline: 'none',
              }}
            >
              {active && <span style={{ width: 4, height: 4, borderRadius: '50%', background: m.color, display: 'inline-block', flexShrink: 0 }} />}
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? m.color : T.pillMuted }}>
                {m.label}
              </span>
            </button>
          )
        })}

        {/* AUTO pill */}
        <button onClick={onAutoToggle} disabled={isActive}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
            borderRadius: 9999,
            background:  autoMode ? 'rgba(201,169,110,0.12)' : T.pillBg,
            border:      `1px solid ${autoMode ? 'rgba(201,169,110,0.38)' : T.pillBorder}`,
            backdropFilter: 'blur(12px)',
            cursor:      isActive ? 'not-allowed' : 'pointer',
            opacity:     isActive ? 0.5 : 1,
            flexShrink:  0, marginLeft: 'auto', transition: 'all 0.18s', outline: 'none',
          }}
        >
          {autoMode && (
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 4, height: 4, borderRadius: '50%', background: T.gold, display: 'inline-block', flexShrink: 0 }}
            />
          )}
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: autoMode ? T.gold : T.pillMuted }}>
            ⊕ AUTO
          </span>
        </button>
      </div>

      {/* ── Dark input card with gold frame ── */}
      <div style={{
        background:          T.cardBg,
        backdropFilter:      'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        border:              isActive ? `1px solid ${T.cardFocus}` : `1px solid ${T.cardBorder}`,
        borderRadius:         14,
        overflow:            'hidden',
        boxShadow:           isActive
          ? `0 0 0 3px rgba(201,169,110,0.10), 0 4px 32px rgba(0,0,0,0.35)`
          : `0 0 0 1px rgba(201,169,110,0.06), 0 4px 24px rgba(0,0,0,0.28)`,
        transition:          'border-color 0.25s, box-shadow 0.25s',
      }}>

        {/* Attachment pill */}
        <AnimatePresence>
          {attachment && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ padding: '10px 16px 0', display: 'flex', gap: 8, overflow: 'hidden' }}>
              <FileAttachmentPill attachment={attachment} analyzing={isActive} onRemove={onRemoveFile} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <textarea
          ref={textareaRef} value={input} onChange={onChange}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit() } }}
          placeholder={PHLDR[phIdx]}
          disabled={isActive} rows={1}
          style={{
            display: 'block', width: '100%', minHeight: 44, maxHeight: 168,
            padding: '14px 16px 10px', background: 'transparent', border: 'none',
            outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif',
            fontSize: 14, lineHeight: 1.65, color: T.textInput, caretColor: T.gold,
            letterSpacing: '-0.01em', opacity: isActive ? 0.45 : 1, boxSizing: 'border-box',
          }}
        />

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px 12px',
          borderTop: '1px solid rgba(201,169,110,0.12)',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Attach */}
            <button type="button" onClick={onAttachClick} disabled={isActive} title="Attach file"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: attachment ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.06)',
                border: attachment ? '1px solid rgba(201,169,110,0.35)' : '1px solid rgba(255,255,255,0.10)',
                cursor: isActive ? 'not-allowed' : 'pointer', opacity: isActive ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={attachment ? T.gold : T.textMuted}
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file"
              accept=".csv,.tsv,.xlsx,.xls,.pdf,image/png,image/jpeg,image/webp,image/gif"
              onChange={onFileSelect} style={{ display: 'none' }}
            />
            <VoiceInput disabled={isActive} onTranscript={onVoiceTranscript} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: T.textMuted }}>
              {isMac ? '⌘' : 'Ctrl'}↩
            </span>
            <AnimatePresence>
              {input.length > 0 && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 500, color: warn ? '#EF4444' : T.textMuted, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
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
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#DC2626', margin: '6px 4px 0', lineHeight: 1.5 }}>
            {fileError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
