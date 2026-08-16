'use client'

/**
 * VoiceInput — Rebuilt with robust Web Speech API integration
 * ─────────────────────────────────────────────────────────────
 * Features:
 *  - Permission pre-check via navigator.permissions
 *  - Interim results shown in real-time (interimTranscript)
 *  - Visual pulse + waveform feedback while recording
 *  - Auto-stop on silence (configurable timeout)
 *  - EN / TR language toggle
 *  - Graceful degradation when API not supported
 *  - Proper cleanup on unmount
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Type shim for browser SpeechRecognition ───────────────────
interface SpeechRecognitionEvent extends Event {
  results:     SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  lang:             string
  continuous:       boolean
  interimResults:   boolean
  maxAlternatives:  number
  start:            () => void
  stop:             () => void
  abort:            () => void
  onstart:          ((e: Event) => void) | null
  onend:            ((e: Event) => void) | null
  onresult:         ((e: SpeechRecognitionEvent) => void) | null
  onerror:          ((e: SpeechRecognitionErrorEvent) => void) | null
  onspeechend:      ((e: Event) => void) | null
}

type MicPermission = 'unknown' | 'granted' | 'denied' | 'prompt'
type RecordStatus  = 'idle' | 'listening' | 'processing' | 'error'

function getSR(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  onTranscript: (text: string) => void
  disabled?:    boolean
}

// ── MicIcon ───────────────────────────────────────────────────
function MicIcon({ active, size = 14 }: { active?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? '#059669' : '#71717A'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9"  y1="22" x2="15" y2="22" />
    </svg>
  )
}

// ── WaveformBars — animated while listening ───────────────────
function WaveformBars() {
  const bars = [0.4, 0.85, 0.6, 1, 0.7, 0.5, 0.9]
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          style={{
            display:      'inline-block',
            width:         3,
            background:   '#059669',
            borderRadius: 2,
          }}
          animate={{ height: [4, h * 14, 4] }}
          transition={{
            duration:   0.55,
            repeat:     Infinity,
            delay:      i * 0.07,
            ease:       'easeInOut',
          }}
        />
      ))}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────
export function VoiceInput({ onTranscript, disabled }: Props) {
  const [supported,    setSupported]    = useState(false)
  const [permission,   setPermission]   = useState<MicPermission>('unknown')
  const [status,       setStatus]       = useState<RecordStatus>('idle')
  const [interim,      setInterim]      = useState('')     // live partial transcript
  const [lang,         setLang]         = useState<'en-US' | 'tr-TR'>('en-US')

  const recogRef    = useRef<SpeechRecognitionInstance | null>(null)
  const silenceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef  = useRef(true)

  // ── Initialise on mount ──────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    setSupported(!!getSR())

    // Check existing mic permission (non-blocking)
    navigator.permissions?.query({ name: 'microphone' as PermissionName })
      .then(r => {
        if (!mountedRef.current) return
        setPermission(r.state as MicPermission)
        r.onchange = () => { if (mountedRef.current) setPermission(r.state as MicPermission) }
      })
      .catch(() => { /* Firefox / old browsers ignore */ })

    return () => {
      mountedRef.current = false
      recogRef.current?.abort()
      if (silenceRef.current) clearTimeout(silenceRef.current)
    }
  }, [])

  // ── Stop helper ──────────────────────────────────────────────
  const stopListening = useCallback(() => {
    recogRef.current?.stop()
    if (silenceRef.current) clearTimeout(silenceRef.current)
    if (mountedRef.current) {
      setStatus('idle')
      setInterim('')
    }
  }, [])

  // ── Start listening ──────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!mountedRef.current || disabled || status === 'listening') return

    const SR = getSR()
    if (!SR) return

    // Explicitly request mic permission so the user sees the browser prompt
    if (permission !== 'granted') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop the stream immediately — we only needed the permission grant
        stream.getTracks().forEach(t => t.stop())
        if (mountedRef.current) setPermission('granted')
      } catch {
        if (mountedRef.current) { setPermission('denied'); setStatus('error') }
        return
      }
    }

    const recog = new SR()
    recog.lang            = lang
    recog.continuous      = true   // keep listening until we manually stop
    recog.interimResults  = true   // show partial results in real time
    recog.maxAlternatives = 1

    recog.onstart = () => {
      if (!mountedRef.current) return
      setStatus('listening')
      setInterim('')
      // Safety timeout: auto-stop after 60 s of continuous listening
      silenceRef.current = setTimeout(() => stopListening(), 60_000)
    }

    recog.onresult = (e: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return
      let finalText   = ''
      let interimText = ''

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      if (finalText) {
        setStatus('processing')
        setInterim('')
        onTranscript(finalText.trim())
        // Reset status after brief delay
        setTimeout(() => { if (mountedRef.current) setStatus('listening') }, 400)
      } else {
        setInterim(interimText)
      }
    }

    recog.onspeechend = () => {
      // Silence detected — stop after a short grace period
      if (silenceRef.current) clearTimeout(silenceRef.current)
      silenceRef.current = setTimeout(() => stopListening(), 1_500)
    }

    recog.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return
      // 'no-speech' and 'aborted' are benign — don't show error
      if (e.error === 'no-speech' || e.error === 'aborted') {
        stopListening()
        return
      }
      setStatus('error')
      setInterim('')
      setTimeout(() => { if (mountedRef.current) setStatus('idle') }, 2_500)
    }

    recog.onend = () => {
      if (!mountedRef.current) return
      setStatus('idle')
      setInterim('')
    }

    recogRef.current = recog
    try {
      recog.start()
    } catch {
      setStatus('error')
      setTimeout(() => { if (mountedRef.current) setStatus('idle') }, 2_000)
    }
  }, [disabled, lang, permission, status, onTranscript, stopListening])

  // ── Restart recognition when language changes mid-session ───
  useEffect(() => {
    if (status === 'listening') {
      recogRef.current?.stop()
      // onend will call start again — but we need the new lang, so
      // we abort instead and restart cleanly
      recogRef.current?.abort()
      setStatus('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // ── Not supported fallback ────────────────────────────────────
  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input not supported in this browser"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'transparent',
          border: '1px solid rgba(12,12,14,0.1)',
          cursor: 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.35,
        }}
      >
        <MicIcon />
      </button>
    )
  }

  const isListening = status === 'listening'
  const isError     = status === 'error'
  const isDenied    = permission === 'denied'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

      {/* ── Language toggle ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => setLang(l => l === 'en-US' ? 'tr-TR' : 'en-US')}
        title={`Switch to ${lang === 'en-US' ? 'Turkish' : 'English'}`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.78rem', lineHeight: 1, padding: '2px 1px',
          opacity: isListening ? 0.5 : 0.7,
          transition: 'opacity 0.15s',
        }}
      >
        {lang === 'en-US' ? '🇺🇸' : '🇹🇷'}
      </button>

      {/* ── Mic button ───────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled || isDenied}
        whileTap={{ scale: 0.88 }}
        title={
          isDenied      ? 'Microphone access denied — check browser settings'
          : isListening ? 'Stop recording'
          : isError     ? 'Microphone error — click to retry'
          : 'Start voice input'
        }
        style={{
          position:   'relative',
          width:       32,
          height:      32,
          borderRadius:'50%',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor:     disabled || isDenied ? 'not-allowed' : 'pointer',
          border: isListening
            ? '1.5px solid rgba(5,150,105,0.6)'
            : isError
            ? '1.5px solid rgba(153,27,27,0.45)'
            : '1px solid rgba(12,12,14,0.14)',
          background: isListening
            ? 'rgba(5,150,105,0.08)'
            : isError
            ? 'rgba(153,27,27,0.06)'
            : 'transparent',
          transition: 'all 0.18s',
          overflow:   'hidden',
        }}
      >
        {/* Pulse ring while listening */}
        {isListening && (
          <motion.span
            style={{
              position: 'absolute', inset: -1,
              borderRadius: '50%',
              border: '2px solid rgba(5,150,105,0.4)',
            }}
            animate={{ scale: [1, 1.55, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {isListening
          ? <span style={{ color: '#059669', fontSize: '0.55rem', fontWeight: 700, letterSpacing: 0 }}>■</span>
          : isError
          ? <MicIcon active={false} />
          : <MicIcon active={false} />
        }
      </motion.button>

      {/* ── Status / interim transcript label ────────────── */}
      <AnimatePresence mode="wait">
        {isListening && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, maxWidth: 160, overflow: 'hidden' }}
          >
            <WaveformBars />
            {interim ? (
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '0.68rem',
                color: '#059669',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 120,
              }}>
                {interim}
              </span>
            ) : (
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: '#059669' }}>
                Listening…
              </span>
            )}
          </motion.div>
        )}
        {status === 'processing' && (
          <motion.span
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: '#71717A' }}
          >
            Got it ✓
          </motion.span>
        )}
        {isError && (
          <motion.span
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: '#991B1B' }}
          >
            {isDenied ? 'Mic blocked' : 'Try again'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
