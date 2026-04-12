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

  if (!verifyWebhookSignature(payload, signature)) {
    console.error('[Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const event = JSON.parse(payload)
  const name  = event?.meta?.event_name as string
  const data  = event?.data?.attributes

  // Resolve user email: custom checkout data → billing email
  const email: string =
    event?.meta?.custom_data?.user_email ??
    data?.user_email ??
    data?.billing_address?.email ??
    ''

  console.log(`[Webhook] ${name} — email: ${email || 'unknown'}`)

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
