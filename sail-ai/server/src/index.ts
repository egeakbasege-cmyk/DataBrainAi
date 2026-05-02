import express    from 'express'
import cors       from 'cors'
import { chatRouter }       from './routes/chat'
import { executeRouter }    from './routes/execute'
import { mobileAuthRouter } from './routes/mobileAuth'

const app  = express()
const PORT = Number(process.env.PORT ?? 8080)

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.VERCEL_URL ?? '',
    process.env.NEXT_PUBLIC_APP_URL ?? '',
    /\.vercel\.app$/,
    // Capacitor mobile app origins
    'capacitor://localhost',    // iOS Capacitor WebView
    'http://localhost',         // Android Capacitor WebView
    'http://localhost:3000',    // local web dev
    'http://localhost:8100',    // Ionic dev server (if used)
  ].filter(Boolean),
  methods:         ['POST', 'GET', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization', 'X-User-Email',
                    'X-Client-Language', 'X-Aetheris-Session'],
  exposedHeaders:  ['X-Auth-Token'],
  credentials:     true,
}))

app.use(express.json({ limit: '20mb' }))

// ── Health check — used by Railway to verify deployment ──────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', ts: Date.now() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
// Mobile JWT auth (no NextAuth dependency — works in Capacitor static builds)
app.use('/api/auth/mobile', mobileAuthRouter)

// v1 — Aetheris ExecutiveResponse schema-enforced endpoint (primary)
app.use('/api/v1', executeRouter)

// Legacy — streaming plain-text endpoint (backwards compat during migration)
app.use('/api/ai', chatRouter)

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aetheris backend running on port ${PORT}`)
})
