export type AgentMode    = 'auto' | 'strategy' | 'analysis' | 'execution' | 'review'
export type AnalysisMode = 'upwind' | 'downwind'

export interface Message {
  role:    'user' | 'assistant'
  content: string
}

export interface ChatPayload {
  message:        string
  context?:       string
  fileContent?:   string
  imageBase64?:   string
  imageMimeType?: string
  mode?:          AnalysisMode
  agentMode?:     AgentMode
  messages?:      Message[]
}

export interface BenchmarkDoc {
  sector:     string
  metric:     string
  value:      string
  source:     string
  summary:    string
  similarity?: number
}
