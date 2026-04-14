import express    from 'express'
import cors       from 'cors'
import { chatRouter } from './routes/chat'

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
  res.json({ status: 'ok', ts: Date.now() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/ai', chatRouter)

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sail AI backend running on port ${PORT}`)
})
