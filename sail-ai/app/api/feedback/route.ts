import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'

const ALLOWED_CATEGORIES = new Set([
  'Bug', 'Feature', 'Design', 'Performance', 'Billing', 'Other',
])
const MAX_MESSAGE = 1000

export async function POST(req: NextRequest) {
  // Auth FIRST — unauthenticated feedback submission is disabled
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to send feedback.' }, { status: 401 })
  }

  let body: { category?: unknown; message?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Category: validate against allowlist to prevent log injection / fake categories
  const rawCategory = typeof body.category === 'string' ? body.category.trim() : ''
  const category    = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'Other'

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: 'Message too long (max 1000 chars).' }, { status: 400 })
  }

  // Log without PII — email omitted from Vercel function logs
  console.log('[FEEDBACK]', JSON.stringify({ category, length: message.length, at: new Date().toISOString() }))

  // Forward to webhook if configured
  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Email is sent to the internal webhook but not logged
        body:    JSON.stringify({ category, message, from: session.user.email }),
      })
    } catch { /* webhook delivery failure is non-fatal */ }
  }

  return NextResponse.json({ success: true })
}
