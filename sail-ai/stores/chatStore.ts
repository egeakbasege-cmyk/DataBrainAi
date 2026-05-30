/**
 * stores/chatStore.ts — Chat Domain Store
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for ALL chat state:
 *   • messages thread
 *   • per-mode streaming phase & text
 *   • active mode
 *   • attachment & file state
 *
 * Replaces the 30+ useState calls scattered across app/chat/page.tsx
 */

import { create }                from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AnalysisMode }     from '@/features/ai-pipeline/types'

// ── Message model ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'sending' | 'streaming' | 'complete' | 'error'

export interface ChatMessage {
  id:        string
  role:      MessageRole
  content:   string
  mode:      AnalysisMode
  status:    MessageStatus
  error?:    string
  createdAt: number
}

// ── Attachment ────────────────────────────────────────────────────────────────

export interface Attachment {
  name:      string
  size:      number
  mimeType:  string
  isImage:   boolean
  content:   string        // base64 (images) or extracted text
  preview?:  string        // data-url for image preview
}

// ── Mode streaming slice ──────────────────────────────────────────────────────

type StreamPhase = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error'

export interface ModeStreamState {
  phase:  StreamPhase
  text:   string
  error:  string | null
}

const freshStream = (): ModeStreamState => ({ phase: 'idle', text: '', error: null })

// ── Store shape ───────────────────────────────────────────────────────────────

interface ChatState {
  // Mode
  mode:       AnalysisMode
  autoMode:   boolean

  // Input
  input:       string
  attachment:  Attachment | null
  fileError:   string

  // Messages thread (multi-turn)
  messages:    ChatMessage[]

  // Per-mode streaming state
  streams:     Record<AnalysisMode, ModeStreamState>

  // Conversation history (Downwind multi-turn)
  convHistory: { role: 'user' | 'assistant'; content: string }[]

  // ── Actions ───────────────────────────────────────────────────────────────

  setMode:       (m: AnalysisMode) => void
  setAutoMode:   (v: boolean)      => void
  setInput:      (v: string)       => void
  setAttachment: (a: Attachment | null) => void
  setFileError:  (e: string)       => void

  /** Add a user message to the thread */
  addUserMessage: (content: string, mode: AnalysisMode) => string

  /** Start an assistant message (returns the id) */
  startAssistantMessage: (mode: AnalysisMode) => string

  /** Append streaming chunk to an assistant message */
  appendChunk: (id: string, chunk: string) => void

  /** Mark message as complete */
  finalizeMessage: (id: string, content: string) => void

  /** Mark message as error */
  errorMessage: (id: string, errorText: string) => void

  /** Update per-mode streaming state */
  setStream: (mode: AnalysisMode, patch: Partial<ModeStreamState>) => void

  /** Reset a mode's stream to idle */
  clearStream: (mode: AnalysisMode) => void

  /** Append to Downwind conversation history */
  appendConvHistory: (role: 'user' | 'assistant', content: string) => void

  /** Hard reset — clear everything */
  resetAll: () => void
}

// ── Initial streams map ───────────────────────────────────────────────────────

const ALL_MODES: AnalysisMode[] = ['upwind','downwind','sail','trim','catamaran','operator','synergy','scenario']

function initialStreams(): Record<AnalysisMode, ModeStreamState> {
  return Object.fromEntries(ALL_MODES.map(m => [m, freshStream()])) as Record<AnalysisMode, ModeStreamState>
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, _get) => ({
    mode:        'upwind',
    autoMode:    false,
    input:       '',
    attachment:  null,
    fileError:   '',
    messages:    [],
    streams:     initialStreams(),
    convHistory: [],

    setMode:       (m) => set({ mode: m }),
    setAutoMode:   (v) => set({ autoMode: v }),
    setInput:      (v) => set({ input: v }),
    setAttachment: (a) => set({ attachment: a }),
    setFileError:  (e) => set({ fileError: e }),

    addUserMessage: (content, mode) => {
      const id = crypto.randomUUID()
      const msg: ChatMessage = {
        id, role: 'user', content, mode, status: 'complete', createdAt: Date.now(),
      }
      set(s => ({ messages: [...s.messages, msg] }))
      return id
    },

    startAssistantMessage: (mode) => {
      const id = crypto.randomUUID()
      const msg: ChatMessage = {
        id, role: 'assistant', content: '', mode, status: 'streaming', createdAt: Date.now(),
      }
      set(s => ({ messages: [...s.messages, msg] }))
      return id
    },

    appendChunk: (id, chunk) => set(s => ({
      messages: s.messages.map(m =>
        m.id === id ? { ...m, content: m.content + chunk, status: 'streaming' } : m
      ),
    })),

    finalizeMessage: (id, content) => set(s => ({
      messages: s.messages.map(m =>
        m.id === id ? { ...m, content, status: 'complete' } : m
      ),
    })),

    errorMessage: (id, errorText) => set(s => ({
      messages: s.messages.map(m =>
        m.id === id ? { ...m, status: 'error', error: errorText } : m
      ),
    })),

    setStream: (mode, patch) => set(s => ({
      streams: { ...s.streams, [mode]: { ...s.streams[mode], ...patch } },
    })),

    clearStream: (mode) => set(s => ({
      streams: { ...s.streams, [mode]: freshStream() },
    })),

    appendConvHistory: (role, content) => set(s => ({
      convHistory: [...s.convHistory, { role, content }],
    })),

    resetAll: () => set({
      input:       '',
      attachment:  null,
      fileError:   '',
      messages:    [],
      streams:     initialStreams(),
      convHistory: [],
    }),
  }))
)

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectMode        = (s: ChatState) => s.mode
export const selectMessages    = (s: ChatState) => s.messages
export const selectStream      = (mode: AnalysisMode) => (s: ChatState) => s.streams[mode]
export const selectIsAnyActive = (s: ChatState) =>
  Object.values(s.streams).some(st => st.phase === 'streaming' || st.phase === 'connecting')
