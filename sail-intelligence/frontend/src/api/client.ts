/**
 * src/api/client.ts
 *
 * Typed Axios client targeting /api/v1/.
 * - Attaches Authorization: Bearer <token> from Zustand authStore.
 * - On 401: clears auth state and redirects to /login.
 * - All response types are defined as TypeScript interfaces below.
 */

import axios, { type AxiosInstance } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: handle 401 ─────────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.replace('/login')
    }
    return Promise.reject(err)
  },
)

// ── API response types ────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token:  string
  refresh_token: string
  token_type:    string
  expires_in:    number
}

export interface ConnectorStatus {
  connectors:      Record<string, {
    domain:          string
    rate_limit_rpm:  number
    fallback_ids:    string[]
    circuit:         'closed' | 'open' | 'half_open'
  }>
  circuit_breakers: Record<string, 'closed' | 'open' | 'half_open'>
}

export interface AgentRunResponse {
  job_id:  string
  status:  string
  message: string
}

export interface AgentResult {
  job_id:           string
  status:           'queued' | 'running' | 'complete' | 'failed'
  completed_agents: string[]
  error_count:      number
  summary:          Record<string, unknown>
  pl_simulations:   PLSimulation[]
  arbitrage_ops:    ArbitrageOp[]
  entity_links:     EntityLink[]
  forecasts:        Forecast[]
  anomalies:        Anomaly[]
  archetypes:       ArchetypeAnalysis[]
  unmet_needs:      string[]
  copy_angles:      CopyAngle[]
  errors:           AgentError[]
}

export interface PLSimulation {
  entity_id:        string
  product_name:     string
  retail_price_usd: number
  sourcing_cost_usd: number
  logistics_est_usd: number
  gross_margin_pct: number
  net_margin_pct:   number
  margin_tier:      'high' | 'medium' | 'low' | 'negative'
  notes:            string
}

export interface ArbitrageOp {
  entity_id:             string
  product_name:          string
  opportunity_score:     number
  estimated_profit_usd:  number
  risk_level:            'low' | 'medium' | 'high'
  rationale:             string
}

export interface EntityLink {
  source_entity_id: string
  target_entity_id: string
  confidence:       number
  evidence:         string[]
}

export interface Forecast {
  entity_id:       string
  metric:          string
  trend_direction: 'rising' | 'falling' | 'stable' | 'volatile'
  current_value:   number
  forecast_7d:     number
  forecast_30d:    number
  confidence:      'high' | 'medium' | 'low'
  risk_flag:       string
  rationale:       string
}

export interface Anomaly {
  entity_id:      string
  metric:         string
  sigma:          number
  current_value:  number
  baseline_value: number
  severity:       'warning' | 'critical'
}

export interface ArchetypeAnalysis {
  asset_id:             string
  archetype:            string
  confidence:           number
  emotional_triggers:   string[]
  sentiment:            number
  pain_points_addressed: string[]
  copy_angle_used:      string
}

export interface CopyAngle {
  angle:            string
  archetype_target: string
  sample_headline:  string
  rationale:        string
}

export interface AgentError {
  agent?:  string
  error:   string
  fatal?:  boolean
}

export interface HITLSignal {
  type:        'hitl_queued'
  action_id:   string
  action_type: string
  payload:     Record<string, unknown>
  occurred_at: string
}

// ── API methods ───────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (username: string, password: string) =>
      apiClient.post<TokenResponse>('/auth/token', { username, password }),

    refresh: (refresh_token: string) =>
      apiClient.post<TokenResponse>('/auth/refresh', { refresh_token }),

    me: () => apiClient.get<{ sub: string; role: string }>('/auth/me'),
  },

  connectors: {
    status: () => apiClient.get<ConnectorStatus>('/connectors/status'),

    run: (connector_id: string, queries: string[]) =>
      apiClient.post('/connectors/run', { connector_id, queries }),
  },

  agents: {
    run: (payload: {
      query:         string
      entities?:     unknown[]
      price_points?: unknown[]
      ad_assets?:    unknown[]
      trend_signals?: unknown[]
    }) => apiClient.post<AgentRunResponse>('/agents/run', payload),

    results: (job_id: string) =>
      apiClient.get<AgentResult>(`/agents/results/${job_id}`),

    status: () => apiClient.get('/agents/status'),
  },

  signals: {
    queue: () => apiClient.get<{ pending_actions: HITLSignal[] }>('/signals/queue'),

    approve: (action_id: string) =>
      apiClient.post('/signals/approve', { action_id }),

    reject: (action_id: string, reason: string) =>
      apiClient.post('/signals/reject', { action_id, reason }),
  },
}
