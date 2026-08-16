import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import { markPro, revokePro }         from '@/lib/proStore'

/**
 * app/api/webhook/dodo/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dodo Payments webhook receiver.
 *
 * Dodo follows the Standard Webhooks spec: three headers (`webhook-id`,
 * `webhook-timestamp`, `webhook-signature`) and an HMAC-SHA256 over
 * `{id}.{timestamp}.{rawBody}`. Verification is implemented directly with node
 * crypto rather than pulling in the `standardwebhooks` package — it is ~20 lines
 * and avoids another dependency in the payment path.
 *
 * Two properties this endpoint must hold, both learned from the Lemon Squeezy
 * receiver:
 *   1. The signature is checked against the *raw* body. Parsing first and
 *      re-serialising would change byte order and break verification.
 *   2. Entitlements are granted from Dodo-controlled fields only. `metadata` is
 *      echoed back from whatever the checkout call supplied and must never be
 *      the basis for granting Pro, or a forged request could elevate any
 *      account.
 */

export const dynamic = 'force-dynamic'

/** Reject replays of captured requests older than five minutes. */
const TOLERANCE_SECONDS = 60 * 5

function verify(raw: string, headers: Headers, secret: string): boolean {
  const id        = headers.get('webhook-id')
  const timestamp = headers.get('webhook-timestamp')
  const signature = headers.get('webhook-signature')
  if (!id || !timestamp || !signature) return false

  const sent = Number(timestamp)
  if (!Number.isFinite(sent)) return false
  if (Math.abs(Date.now() / 1000 - sent) > TOLERANCE_SECONDS) return false

  // Standard Webhooks secrets are base64, conventionally prefixed `whsec_`.
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${raw}`)
    .digest('base64')

  // The header carries a space-delimited list of `v<version>,<signature>` so
  // secrets can be rotated. Accept the request if any v1 entry matches.
  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',')
    if (version !== 'v1' || !value) return false
    const a = Buffer.from(value)
    const b = Buffer.from(expected)
    // timingSafeEqual throws on length mismatch, which is itself a non-match.
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  })
}

export async function POST(req: NextRequest) {
  const secret = process.env.DODO_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const raw = await req.text()

  if (!verify(raw, req.headers, secret)) {
    console.warn('[Dodo] Rejected: invalid signature')
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 })
  }

  const customer = event.data?.customer as { email?: string } | undefined
  const email = (customer?.email ?? '').toLowerCase().trim()

  console.log(`[Dodo] ${event.type ?? 'unknown'} received`)

  switch (event.type) {
    // Grant on first activation, on each renewal, and when an account that was
    // paused or dunning-suspended comes back.
    case 'subscription.active':
    case 'subscription.renewed':
    case 'subscription.unpaused':
    case 'subscription.plan_changed':
      if (email) markPro(email)
      break

    // Revoke on any terminal or suspended state. `on_hold` is included because
    // it means payment recovery has already failed — continuing to serve Pro
    // would be giving the product away.
    case 'subscription.cancelled':
    case 'subscription.expired':
    case 'subscription.failed':
    case 'subscription.paused':
    case 'subscription.on_hold':
      if (email) revokePro(email)
      break

    // A won dispute leaves entitlement intact; a lost one means the money is
    // gone, so access goes with it.
    case 'dispute.lost':
    case 'refund.succeeded':
      if (email) revokePro(email)
      break

    default:
      break
  }

  // Always acknowledge a verified event. Returning non-2xx for events we simply
  // do not handle would put the endpoint into Dodo's retry/disable cycle.
  return NextResponse.json({ received: true })
}
