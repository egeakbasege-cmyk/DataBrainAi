'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [supported,  setSupported]  = useState(false)
  const [listening,  setListening]  = useState(false)
  const [status,     setStatus]     = useState<'idle' | 'listening' | 'processing' | 'error'>('idle')
  const [lang,       setLang]       = useState<'en-US' | 'tr-TR'>('en-US')
  const recogRef = useRef<any>(null)

  useEffect(() => {
    setSupported(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  }, [])

  if (!supported) return null

  function startListening() {
    if (listening || disabled) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recog = new SR()
    recog.lang = lang
    recog.continuous = false
    recog.interimResults = false

    recog.onstart  = () => { setListening(true); setStatus('listening') }
    recog.onresult = (e: any) => {
      setStatus('processing')
      const text = e.results[0][0].transcript
      onTranscript(text)
      setTimeout(() => setStatus('idle'), 600)
    }
    recog.onerror  = () => { setStatus('error'); setTimeout(() => setStatus('idle'), 2000) }
    recog.onend    = () => { setListening(false); if (status === 'listening') setStatus('idle') }

    recogRef.current = recog
    recog.start()
  }

  function stopListening() {
    recogRef.current?.stop()
    setListening(false)
    setStatus('idle')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {/* Lang toggle */}
      <button
        type="button"
        onClick={() => setLang(l => l === 'en-US' ? 'tr-TR' : 'en-US')}
        style={{
          fontSize: '0.75rem', background: 'none', border: 'none',
          cursor: 'pointer', opacity: 0.6, lineHeight: 1, padding: '2px',
        }}
        title={`Switch to ${lang === 'en-US' ? 'Turkish' : 'English'}`}
      >
        {lang === 'en-US' ? '🇺🇸' : '🇹🇷'}
      </button>

      {/* Mic button */}
      <motion.button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        whileTap={{ scale: 0.92 }}
        style={{
          width: '2rem', height: '2rem', borderRadius: '50%',
          background: listening ? 'rgba(0,150,136,0.12)' : 'transparent',
          border: `1px solid ${listening ? 'rgba(0,150,136,0.5)' : 'rgba(12,12,14,0.15)'}`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
        }}
      >
        {listening && (
          <motion.div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,150,136,0.15)',
            }}
            animate={{ scale: [1, 1.6, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={listening ? '#00695C' : '#71717A'} strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="2" width="6" height="11" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="9"  y1="22" x2="15" y2="22"/>
        </svg>
      </motion.button>

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#71717A' }}
          >
            {status === 'listening' ? 'Listening…' : status === 'processing' ? 'Processing…' : 'Not available'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
