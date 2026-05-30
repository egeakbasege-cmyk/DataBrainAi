/**
 * features/ai-pipeline/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed contracts for the streaming AI pipeline layer.
 * All components and hooks import from here — never from ad-hoc inline types.
 */

// ── Stream lifecycle ──────────────────────────────────────────────────────────

export type StreamPhase =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'complete'
  | 'error'

// ── Typed error surface (no silent failures) ──────────────────────────────────

export type StreamErrorCode =
  | 'NETWORK'        // fetch failed / offline
  | 'TIMEOUT'        // 15s connection or 30s stream timeout
  | 'RATE_LIMIT'     // 429 from server
  | 'UNAUTHORIZED'   // 401 — session expired
  | 'SERVER_ERROR'   // 5xx
  | 'PARSE_ERROR'    // malformed SSE chunk
  | 'ABORTED'        // user-initiated cancel or mode switch
  | 'UNKNOWN'

export interface StreamError {
  code:       StreamErrorCode
  message:    string
  retryable:  boolean
  statusCode?: number
}

// ── SSE hook options ──────────────────────────────────────────────────────────

export interface SSEOptions<TMeta = unknown> {
  /** API endpoint to POST to */
  endpoint: string
  /** Request body (serialized to JSON) */
  body: Record<string, unknown>
  /** Called with each decoded text chunk */
  onChunk: (chunk: string, accumulated: string) => void
  /** Called once when the first '\n' metadata line arrives (if present) */
  onMetadata?: (meta: TMeta) => void
  /** Called once the stream closes cleanly */
  onComplete?: (fullText: string) => void
  /** Called on any error */
  onError?: (error: StreamError) => void
  /** Max ms to wait for the first byte. Default: 15000 */
  connectionTimeoutMs?: number
  /** Max ms of stream inactivity before treating as hung. Default: 30000 */
  streamTimeoutMs?: number
  /** AbortController signal from the caller (e.g. on unmount / mode switch) */
  signal?: AbortSignal
}

// ── Backoff config ────────────────────────────────────────────────────────────

export interface BackoffConfig {
  baseMs:   number   // initial delay (default 500)
  maxMs:    number   // ceiling (default 30_000)
  maxTries: number   // max retries (default 5)
  jitterMs: number   // ±jitter added to each step (default 200)
}

// ── Mode registry ─────────────────────────────────────────────────────────────

export type AnalysisMode =
  | 'upwind'
  | 'downwind'
  | 'sail'
  | 'trim'
  | 'catamaran'
  | 'operator'
  | 'synergy'
  | 'scenario'

export type ModeResponseFormat = 'stream' | 'json'

export interface ModeDescriptor {
  id:             AnalysisMode
  label:          string
  tagline:        string
  icon:           string
  color:          string
  format:         ModeResponseFormat
  endpoint:       string
}

// ── Chat submit payload ───────────────────────────────────────────────────────

export interface ChatSubmitPayload {
  message:        string
  mode:           AnalysisMode
  apiKey?:        string
  context?:       string
  fileContent?:   string
  imageBase64?:   string
  imageMimeType?: string
  language?:      string
  businessMode?:  boolean
  agentMode?:     string
  sessionId?:     string
  messages?:      { role: 'user' | 'assistant'; content: string }[]
  primaryConstraint?: string
  synergyModes?:  AnalysisMode[]
  connector_ids?: string[]
  user_urls?:     string[]
}
