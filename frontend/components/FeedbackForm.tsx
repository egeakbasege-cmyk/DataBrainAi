'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Status = 'idle' | 'submitting' | 'success'

const CATEGORIES = ['Bug report', 'Feature request', 'Strategy quality', 'Other']

export default function FeedbackForm({ onClose }: { onClose?: () => void }) {
  const [feedback,  setFeedback]  = useState('')
  const [category,  setCategory]  = useState('Other')
  const [status,    setStatus]    = useState<Status>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return
    setStatus('submitting')
    // Wired to real endpoint — replace with your feedback API if needed
    await new Promise((res) => setTimeout(res, 900))
    setStatus('success')
  }

  const handleCancel = () => {
    setFeedback('')
    setCategory('Other')
    setStatus('idle')
    onClose?.()
  }

  return (
    <motion.div
      className="w-full max-w-md"
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <div
        className="p-8 rounded-card"
        style={{
          background:           'rgba(255,255,255,0.75)',
          backdropFilter:       'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border:               '1px solid rgba(229,231,235,0.9)',
          boxShadow:            '0 4px 30px rgba(0,0,0,0.06)',
        }}
      >
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              className="text-center py-4 space-y-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-heading font-bold text-ink text-lg">Thanks for the feedback.</p>
              <p className="font-sans text-sm text-dim">We read every submission and use it to improve.</p>
              <button
                onClick={handleCancel}
                className="font-sans text-xs text-muted hover:text-ink transition-colors mt-2 underline">
                Close
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>
                <h2 className="font-heading font-bold text-ink text-xl mb-1">
                  Feedback &amp; Support
                </h2>
                <p className="font-sans text-xs text-muted">
                  Report a problem or suggest an improvement.
                </p>
              </div>

              {/* Category chips */}
              <div className="space-y-2">
                <span className="font-sans text-xs font-medium text-dim uppercase tracking-widest-2">
                  Category
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="font-sans text-xs px-3.5 py-1.5 rounded-pill border transition-all"
                      style={{
                        background:  category === cat ? '#FACC15' : 'transparent',
                        borderColor: category === cat ? '#FACC15' : '#E5E7EB',
                        color:       category === cat ? '#1E293B' : '#64748B',
                        fontWeight:  category === cat ? 600 : 400,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Borderless textarea */}
              <div className="space-y-1">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="How can we improve your experience?"
                  rows={4}
                  required
                  className="w-full bg-transparent resize-none outline-none py-2 font-sans text-sm text-ink placeholder-muted"
                  style={{
                    borderBottom: `1px solid ${feedback.length > 0 ? '#FACC15' : '#E5E7EB'}`,
                    transition:   'border-color 0.2s ease',
                    borderRadius: 0,
                    boxShadow:    'none',
                  }}
                />
                <div className="flex justify-end">
                  <span className="font-sans text-xs text-muted">{feedback.length} / 500</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="font-sans text-sm text-muted hover:text-ink transition-colors px-4 py-2 rounded-pill"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={status === 'submitting' || !feedback.trim()}
                  className="font-heading font-bold text-ink text-sm px-6 py-2.5 rounded-pill transition-all disabled:opacity-50"
                  style={{ background: '#FACC15' }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {status === 'submitting' ? 'Sending…' : 'Send Feedback'}
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
