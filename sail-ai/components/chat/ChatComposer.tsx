'use client'

/**
 * ChatComposer — The Masterclass Input
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed-bottom glass composer. Precision-engineered:
 *   • ModeRail: horizontal pill tabs for mode selection
 *   • Auto-grow textarea: 1→6 lines, scrolls internally above that
 *   • Attachment preview: inline above textarea
 *   • Toolbar: attach · voice · shortcut hint · char count | mode switcher · send
 *
 * Grid: 24px horizontal padding · 16px vertical · 8px gaps
 */

import { useRef, RefObject }          from 'react'
import { motion, AnimatePresence }    from 'framer-motion'
import type { AnalysisMode }          from '@/components/ModeSelector'
import { InChatModeSwitcher }         from '@/components/InChatModeSwitcher'
import { HelmButton }                 from '@/components/HelmButton'
import { VoiceInput }                 from '@/components/VoiceInput'
import { FileAttachmentPill }         from '@/components/FileAttachmentPill'
import type { Attachment }            from '@/components/FileAttachmentPill'
import type { SailState }             from '@/hooks/useSailState'
import { useLanguage }                from '@/lib/i18n/LanguageContext'
import type { TranslationKey }        from '@/lib/i18n/translations'

// ── Mode rail data ─────────────────────────────────────────────────────────────

const RAIL_MODES: { id: AnalysisMode; label: string; color: string }[] = [
  { id: 'upwind',    label: 'Upwind',    color: '#0F6CBD' },
  { id: 'sail',      label: 'SAIL',      color: '#7C3AED' },
  { id: 'trim',      label: 'TRIM',      color: '#B45309' },
  { id: 'catamaran', label: 'Catamaran', color: '#D4AF37' },
  { id: 'operator',  label: 'Operator',  color: '#CC2200' },
  { id: 'synergy',   label: 'Synergy',   color: '#C9A96E' },
  { id: 'scenario',  label: 'Scenario',  color: '#00C9B1' },
  { id: 'downwind',  label: 'Downwind',  color: '#00695C' },
]

// ── Quick pick labels ──────────────────────────────────────────────────────────

const PLACEHOLDER_KEYS = [
  'chat.placeholder.0',
  'chat.placeholder.1',
  'chat.placeholder.2',
  'chat.placeholder.3',
] as const

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatComposerProps {
  input:         string
  mode:          AnalysisMode
  sailState:     SailState
  isActive:      boolean
  isMac:         boolean
  phIdx:         number
  attachment:    Attachment | null
  fileError:     string
  autoMode:      boolean
  isConversing:  boolean
  convHistory:   unknown[]
  textareaRef:   RefObject<HTMLTextAreaElement>
  fileInputRef:  RefObject<HTMLInputElement>

  onChange:        (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit:        () => void
  onModeChange:    (m: AnalysisMode) => void
  onAutoToggle:    () => void
  onFileSelect:    (e: React.ChangeEvent<HTMLInputElement>) => void
  onAttachClick:   () => void
  onRemoveFile:    () => void
  onVoiceTranscript:(text: string) => void
  onStartOver:     () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatComposer({
  input, mode, sailState, isActive, isMac, phIdx, attachment, fileError,
  autoMode, isConversing, convHistory,
  textareaRef, fileInputRef,
  onChange, onSubmit, onModeChange, onAutoToggle,
  onFileSelect, onAttachClick, onRemoveFile, onVoiceTranscript, onStartOver,
}: ChatComposerProps) {
  const { t } = useLanguage()
  const PLACEHOLDERS = PLACEHOLDER_KEYS.map(k => t(k as TranslationKey))
  const charsLeft = 2000 - input.length
  const warn      = charsLeft < 200

  return (
    <div
      style={{
        flexShrink:          0,
        background:          'rgba(255,255,255,0.92)',
        backdropFilter:      'blur(40px)',
        WebkitBackdropFilter:'blur(40px)',
        borderTop:           '1px solid rgba(255,255,255,0.95)',
        boxShadow:           '0 -4px 32px rgba(0,0,0,0.08), 0 -1px 0 rgba(255,255,255,0.6)',
        padding:             '0 24px 20px',
      }}
    >
      {/* ── Downwind session indicator ── */}
      <AnimatePresence>
        {isConversing && (convHistory as unknown[]).length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:           8,
              padding:      '8px 12px',
              marginBottom:  8,
              background:   'rgba(0,105,92,0.06)',
              border:       '1px solid rgba(0,150,136,0.18)',
              borderRadius:  8,
              overflow:     'hidden',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00695C', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#00695C', fontWeight: 500, flex: 1 }}>
              Guided session · {Math.floor((convHistory as unknown[]).length / 2)} exchanges
            </span>
            <button
              onClick={onStartOver}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mode rail ── */}
      <div
        style={{
          display:    'flex',
          gap:         4,
          overflowX:  'auto',
          padding:    '12px 0 8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Manual mode pills */}
        {!autoMode && RAIL_MODES.map(m => {
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              disabled={isActive}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:            4,
                padding:       '5px 12px',
                borderRadius:  9999,
                background:    active ? `${m.color}12` : 'transparent',
                border:        `1px solid ${active ? `${m.color}50` : 'rgba(0,0,0,0.08)'}`,
                cursor:        isActive ? 'not-allowed' : 'pointer',
                opacity:       isActive ? 0.5 : 1,
                flexShrink:    0,
                transition:    'all 0.18s',
                outline:       'none',
              }}
            >
              {active && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0, display: 'inline-block' }} />
              )}
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:       10,
                fontWeight:     active ? 700 : 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:          active ? m.color : '#9CA3AF',
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
            display:       'flex',
            alignItems:    'center',
            gap:            4,
            padding:       '5px 12px',
            borderRadius:  9999,
            background:    autoMode ? 'rgba(201,169,110,0.12)' : 'transparent',
            border:        `1px solid ${autoMode ? 'rgba(201,169,110,0.45)' : 'rgba(0,0,0,0.08)'}`,
            cursor:        isActive ? 'not-allowed' : 'pointer',
            opacity:       isActive ? 0.5 : 1,
            flexShrink:    0,
            marginLeft:    'auto',
            transition:    'all 0.18s',
            outline:       'none',
          }}
        >
          {autoMode && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A96E', flexShrink: 0, display: 'inline-block' }}
            />
          )}
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       10,
            fontWeight:     700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:          autoMode ? '#C9A96E' : '#9CA3AF',
          }}>
            ⊕ AUTO
          </span>
        </button>
      </div>

      {/* ── Input card ── */}
      <div
        style={{
          background:          'rgba(255,255,255,0.78)',
          backdropFilter:      'blur(24px)',
          WebkitBackdropFilter:'blur(24px)',
          border:              isActive
            ? '1.5px solid rgba(20,184,166,0.45)'
            : '1.5px solid rgba(255,255,255,0.95)',
          borderRadius:        16,
          overflow:            'hidden',
          boxShadow:           isActive
            ? '0 0 0 3px rgba(20,184,166,0.08), 0 4px 20px rgba(0,0,0,0.08)'
            : '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)',
          transition:          'border-color 0.25s, box-shadow 0.25s',
        }}
      >
        {/* Attachment pill */}
        <AnimatePresence>
          {attachment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ padding: '10px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap', overflow: 'hidden' }}
            >
              <FileAttachmentPill
                attachment={attachment}
                analyzing={isActive}
                onRemove={onRemoveFile}
              />
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
          placeholder={PLACEHOLDERS[phIdx]}
          disabled={isActive}
          rows={1}
          style={{
            display:    'block',
            width:      '100%',
            minHeight:   40,
            maxHeight:   168,
            padding:    '14px 16px 10px',
            background: 'transparent',
            border:     'none',
            outline:    'none',
            resize:     'none',
            fontFamily: 'Inter, sans-serif',
            fontSize:    14,
            lineHeight:  1.65,
            color:      '#0C1929',
            caretColor: 'rgba(20,184,166,0.9)',
            letterSpacing: '-0.01em',
            opacity:    isActive ? 0.4 : 1,
            boxSizing:  'border-box',
          }}
        />

        {/* Toolbar */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '8px 16px 12px',
            borderTop:      '1px solid rgba(0,0,0,0.05)',
            gap:             8,
          }}
        >
          {/* Left: attach + voice + hints */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Attach */}
            <button
              type="button"
              onClick={onAttachClick}
              disabled={isActive}
              title="Attach file (CSV, XLSX, PDF, image)"
              style={{
                width:          32,
                height:         32,
                borderRadius:    8,
                background:     attachment ? 'rgba(201,169,110,0.08)' : 'rgba(0,0,0,0.04)',
                border:         attachment ? '1px solid rgba(201,169,110,0.35)' : '1px solid transparent',
                cursor:         isActive ? 'not-allowed' : 'pointer',
                opacity:        isActive ? 0.4 : 1,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
                transition:     'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={attachment ? '#C9A96E' : '#9CA3AF'}
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.xlsx,.xls,.pdf,image/png,image/jpeg,image/webp,image/gif"
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />

            {/* Voice */}
            <VoiceInput
              disabled={isActive}
              onTranscript={onVoiceTranscript}
            />

            {/* Keyboard shortcut */}
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:       10,
              fontWeight:     500,
              letterSpacing: '0.08em',
              color:          '#C4C8CC',
            }}>
              {isMac ? '⌘' : 'Ctrl'}↩
            </span>

            {/* Char counter */}
            <AnimatePresence>
              {input.length > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily:    'Inter, sans-serif',
                    fontSize:       10,
                    fontWeight:     500,
                    letterSpacing: '0.04em',
                    color:          warn ? '#991B1B' : '#C4C8CC',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {charsLeft}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Right: mode switcher + send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InChatModeSwitcher
              mode={mode}
              onChange={onModeChange}
              disabled={isActive}
            />
            <HelmButton
              state={sailState}
              onClick={onSubmit}
              disabled={isActive || !input.trim()}
            />
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
              color:      '#991B1B',
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
