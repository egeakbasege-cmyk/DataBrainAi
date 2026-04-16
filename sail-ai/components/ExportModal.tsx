'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExecutiveResponse } from '@/types/architecture'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  open:    boolean
  onClose: () => void
  result:  ExecutiveResponse
  sector?: string
}

export function ExportModal({ open, onClose, result, sector }: Props) {
  const { t } = useLanguage()
  const [email,   setEmail]   = useState('')
  const [note,    setNote]    = useState('')
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const subject = `${t('export.blockInsight')} — ${sector ?? 'Strategy'}`

  const matrixBlock = result.matrixOptions?.length
    ? `\n${t('export.blockMatrix')}\n` +
      result.matrixOptions.map((opt, i) =>
        `${i + 1}. ${opt.title}\n   ${opt.description}\n   ${t('export.successRate')} ${Math.round(opt.sectorMedianSuccessRate * 100)}% · ` +
        `${t('export.timeline')} ${opt.implementationTimeDays}d · ${t('export.density')} ${opt.densityScore}`
      ).join('\n')
    : ''

  const horizonBlock = result.executionHorizons
    ? `\n\n${t('export.blockHorizons')}\n` +
      `${t('export.sprint30')}\n${result.executionHorizons.thirtyDays.map(s => `• ${s}`).join('\n')}\n\n` +
      `${t('export.sprint60')}\n${result.executionHorizons.sixtyDays.map(s => `• ${s}`).join('\n')}\n\n` +
      `${t('export.sprint90')}\n${result.executionHorizons.ninetyDays.map(s => `• ${s}`).join('\n')}`
    : ''

  const body =
    `${t('export.blockInsight')}\n${result.insight}` +
    matrixBlock +
    horizonBlock +
    (note ? `\n\n${t('export.noteBlock')}\n${note}` : '')

  function handleSend() {
    if (!email || !email.includes('@')) return
    setStatus('sending')
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto, '_blank')
    setStatus('sent')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 60 }}
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.34, 1.1, 0.64, 1] }}
            style={{
              position:  'fixed',
              bottom:    0, left: 0, right: 0,
              background: '#FFFFFF',
              borderTop:  '1px solid rgba(12,12,14,0.1)',
              padding:    '1.5rem 1.25rem 2rem',
              zIndex:     61,
              maxWidth:   '480px',
              margin:     '0 auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#0C0C0E' }}>
                {t('export.title')}
              </span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {status === 'sent' ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✓</div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#0C0C0E', fontWeight: 500 }}>{t('export.sent')}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', marginTop: '0.25rem' }}>{t('export.sentSub')}</p>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA', display: 'block', marginBottom: '0.375rem' }}>
                    {t('export.emailLabel')}
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid rgba(12,12,14,0.15)', background: 'transparent', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA', display: 'block', marginBottom: '0.375rem' }}>
                    {t('export.noteLabel')}
                  </label>
                  <textarea
                    value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder={t('export.notePlaceholder')}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid rgba(12,12,14,0.15)', background: 'transparent', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={handleSend} disabled={status === 'sending' || !email}
                  style={{ width: '100%', padding: '0.8rem', background: email ? '#0C0C0E' : '#D4D4D8', color: '#FAFAF8', border: 'none', cursor: email ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' }}
                >
                  {status === 'sending' ? t('export.sending') : t('export.send')}
                </button>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>
                  {t('export.disclaimer')}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
