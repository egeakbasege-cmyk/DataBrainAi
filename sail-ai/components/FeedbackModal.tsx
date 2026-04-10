'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Status = 'idle' | 'submitting' | 'success'

const CATEGORIES = ['Bug report', 'Feature request', 'Strategy quality', 'Other'] as const

interface Props {
  open:    boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: Props) {
  const [feedback, setFeedback] = useState('')
  const [category, setCategory] = useState<string>('Other')
  const [status,   setStatus]   = useState<Status>('idle')

  // Reset on open
  useEffect(() => {
    if (open) { setFeedback(''); setCategory('Other'); setStatus('idle') }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!feedback.trim()) return
    setStatus('submitting')
    try {
      await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ category, message: feedback }),
      })
    } catch { /* show success regardless to avoid revealing backend details */ }
    setStatus('success')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(12,12,14,0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 60,
            }}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 8,  scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position:  'fixed',
              bottom:    '5.5rem',
              right:     '1.25rem',
              width:     'min(380px, calc(100vw - 2.5rem))',
              zIndex:    61,
              background: '#FAFAF8',
              border:    '1px solid rgba(12,12,14,0.12)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {status === 'success' ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div
                  style={{
                    width: '2.5rem', height: '2.5rem',
                    border: '1px solid rgba(22,163,74,0.3)',
                    background: 'rgba(22,163,74,0.08)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600, fontSize: '1.1rem', color: '#0C0C0E', marginBottom: '0.375rem' }}>
                  Feedback received.
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#71717A', marginBottom: '1.25rem' }}>
                  We read every submission and use it to improve.
                </p>
                <button
                  onClick={onClose}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.75rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#71717A',
                    border: '1px solid rgba(12,12,14,0.14)',
                    padding: '6px 16px',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid rgba(12,12,14,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '2px' }}>
                      Feedback &amp; Support
                    </p>
                    <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1rem', fontWeight: 600, color: '#0C0C0E' }}>
                      How can we improve?
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
                    aria-label="Close"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6"  y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Category */}
                <div style={{ padding: '1rem 1.25rem 0' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '0.5rem' }}>
                    Category
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        style={{
                          fontFamily:    'Inter, sans-serif',
                          fontSize:      '0.72rem',
                          letterSpacing: '0.03em',
                          padding:       '4px 10px',
                          border:        `1px solid ${category === cat ? 'rgba(201,169,110,0.6)' : 'rgba(12,12,14,0.14)'}`,
                          background:    category === cat ? 'rgba(201,169,110,0.1)' : 'transparent',
                          color:         category === cat ? '#C9A96E' : '#71717A',
                          fontWeight:    category === cat ? 600 : 400,
                          cursor:        'pointer',
                          transition:    'all 0.15s',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div style={{ padding: '1rem 1.25rem' }}>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
                    placeholder="Describe the issue or your suggestion…"
                    rows={4}
                    required
                    style={{
                      width:        '100%',
                      background:   'transparent',
                      border:       'none',
                      borderBottom: `1px solid ${feedback.length > 0 ? 'rgba(201,169,110,0.5)' : 'rgba(12,12,14,0.12)'}`,
                      outline:      'none',
                      resize:       'none',
                      fontFamily:   'Inter, sans-serif',
                      fontSize:     '0.85rem',
                      lineHeight:   1.6,
                      color:        '#0C0C0E',
                      padding:      '0.5rem 0',
                      transition:   'border-color 0.2s',
                      boxSizing:    'border-box',
                    }}
                  />
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#A1A1AA', textAlign: 'right', marginTop: '0.25rem' }}>
                    {feedback.length} / 500
                  </p>
                </div>

                {/* Actions */}
                <div
                  style={{
                    padding:      '0.75rem 1.25rem',
                    borderTop:    '1px solid rgba(12,12,14,0.08)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'flex-end',
                    gap:          '0.75rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '0.75rem',
                      color:      '#71717A',
                      background: 'none',
                      border:     'none',
                      cursor:     'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'submitting' || !feedback.trim()}
                    style={{
                      fontFamily:    'Inter, sans-serif',
                      fontSize:      '0.72rem',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      fontWeight:    600,
                      padding:       '7px 18px',
                      background:    '#0C0C0E',
                      color:         '#FAFAF8',
                      border:        'none',
                      cursor:        status === 'submitting' || !feedback.trim() ? 'not-allowed' : 'pointer',
                      opacity:       status === 'submitting' || !feedback.trim() ? 0.4 : 1,
                      transition:    'opacity 0.15s',
                    }}
                  >
                    {status === 'submitting' ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
