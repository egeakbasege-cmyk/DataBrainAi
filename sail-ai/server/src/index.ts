import express    from 'express'
import cors       from 'cors'
import { chatRouter }    from './routes/chat'
import { executeRouter } from './routes/execute'

const app  = express()
const PORT = Number(process.env.PORT ?? 8080)

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.VERCEL_URL ?? '',
    process.env.NEXT_PUBLIC_APP_URL ?? '',
    /\.vercel\.app$/,
    // local dev
    'http://localhost:3000',
  ].filter(Boolean),
  methods: ['POST', 'GET'],
}))

app.use(express.json({ limit: '20mb' }))

// ── Health check — used by Railway to verify deployment ──────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', ts: Date.now() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
// v1 — Aetheris ExecutiveResponse schema-enforced endpoint (primary)
app.use('/api/v1', executeRouter)

// Legacy — streaming plain-text endpoint (backwards compat during migration)
app.use('/api/ai', chatRouter)

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aetheris backend running on port ${PORT}`)
})
