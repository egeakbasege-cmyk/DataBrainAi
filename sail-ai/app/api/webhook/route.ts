import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature }     from '@/lib/lemonsqueezy'
import { markPro, revokePro }         from '@/lib/proStore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const payload   = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  // verifyWebhookSignature may throw if signature length mismatches
  let valid = false
  try {
    valid = verifyWebhookSignature(payload, signature)
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }
  if (!valid) {
    console.warn('[Webhook] Rejected: invalid signature')
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  // Parse after verification — malformed JSON returns 400, not 500
  let event: Record<string, unknown>
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 })
  }

  const name = (event?.meta as Record<string, unknown>)?.event_name as string | undefined
  const data = (event?.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined

  // ── Email resolution ──────────────────────────────────────────────────────
  // SECURITY: Do NOT trust custom_data.user_email — it's unverified and can be
  // forged to grant Pro status to any email. Only use Lemon Squeezy-controlled
  // fields (data.user_email, data.billing_address.email).
  const billingAddr = data?.billing_address as Record<string, unknown> | undefined
  const email: string = (
    (data?.user_email as string | undefined) ??
    (billingAddr?.email as string | undefined) ??
    ''
  ).toLowerCase().trim()

  console.log(`[Webhook] ${name ?? 'unknown'} received`)

  switch (name) {
    case 'order_created':
    case 'subscription_created':
    case 'subscription_resumed':
      if (email) await markPro(email)
      break

    case 'subscription_cancelled':
    case 'subscription_expired':
    case 'subscription_paused':
      if (email) await revokePro(email)
      break

    default:
      break
  }

  return NextResponse.json({ received: true })
}
