import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'

export async function POST(req: NextRequest) {
  let body: { category?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { category = 'Other', message = '' } = body

  if (!message.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  if (message.length > 500) {
    return NextResponse.json({ error: 'Message too long.' }, { status: 400 })
  }

  const session = await auth()
  const userEmail = session?.user?.email ?? 'anonymous'

  // Log to console (visible in Vercel Function Logs)
  console.log('[FEEDBACK]', JSON.stringify({
    category,
    message: message.trim(),
    from:    userEmail,
    at:      new Date().toISOString(),
  }))

  // Optional: forward to a webhook URL if configured
  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ category, message, from: userEmail }),
      })
    } catch { /* Don't fail if webhook delivery fails */ }
  }

  return NextResponse.json({ success: true })
}
