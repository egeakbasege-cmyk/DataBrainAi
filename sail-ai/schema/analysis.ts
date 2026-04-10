import { z } from 'zod'

// ── Chat endpoint ──────────────────────────────────────────────────
export const ChatRequestSchema = z.object({
  message: z
    .string({ message: 'Message is required.' })
    .min(1,    'Message cannot be empty.')
    .max(2000, 'Message is too long (max 2000 characters).'),
  context: z.string().max(5000).optional(),
  apiKey:  z.string().min(10).optional(),
})

export type ChatRequestType = z.infer<typeof ChatRequestSchema>

// ── Structured analysis endpoint ───────────────────────────────────
export const MetricsSchema = z.object({
  revenue:        z.number().min(0).optional(),
  growthRate:     z.number().min(-100).max(10_000).optional(),
  margin:         z.number().min(-100).max(100).optional(),
  customerCount:  z.number().int().min(0).optional(),
  churnRate:      z.number().min(0).max(100).optional(),
  conversionRate: z.number().min(0).max(100).optional(),
  competitors:    z.array(z.string().max(60)).max(10).optional(),
}).optional()

export const AnalysisRequestSchema = z.object({
  sector: z
    .string({ message: 'Sector is required.' })
    .min(2, 'Sector name is too short.')
    .max(80, 'Sector name is too long.'),
  metrics:   MetricsSchema,
  context:   z.string().max(5000).optional(),
  focusArea: z
    .enum(['growth', 'risk', 'efficiency', 'innovation'])
    .default('growth'),
  tone: z
    .enum(['professional', 'creative', 'academic'])
    .default('professional'),
})

export type AnalysisRequestType = z.infer<typeof AnalysisRequestSchema>

// ── Registration ───────────────────────────────────────────────────
export const RegisterRequestSchema = z.object({
  name: z
    .string({ message: 'Name is required.' })
    .min(1,   'Name cannot be empty.')
    .max(100, 'Name is too long.'),
  email: z
    .string({ message: 'Email is required.' })
    .email('Please enter a valid email address.'),
  password: z
    .string({ message: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.'),
})

export type RegisterRequestType = z.infer<typeof RegisterRequestSchema>
