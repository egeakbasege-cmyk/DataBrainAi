/**
 * app/api/cron/monitor/route.ts — Proactive Business Health Monitor
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/cron/monitor
 *
 * Runs daily at 08:00 UTC via Vercel Cron.
 * Protected by CRON_SECRET bearer token.
 *
 * What it does:
 *   1. Fetches all Pro users with their BusinessProfile
 *   2. Categorises each profile:
 *      - STALE  : last updated > 7 days ago  → "time to review" nudge
 *      - EMPTY  : Pro user with no profile   → first-use onboarding nudge
 *      - ACTIVE : updated ≤ 7 days ago       → skip
 *   3. Sends a single HTML digest email per qualifying user via Resend
 *   4. Returns a JSON summary (200) with counts — safe for Vercel logs
 *
 * Environment variables required:
 *   CRON_SECRET   — shared secret set in Vercel dashboard + vercel.json
 *   RESEND_API_KEY — Resend API key for transactional email
 *   NEXT_PUBLIC_BASE_URL — public base URL (e.g. https://sail.ai)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'

// ── Config ────────────────────────────────────────────────────────────────────

const STALE_THRESHOLD_DAYS = 7

/** Escape HTML special chars so user-controlled strings are safe in email HTML */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
const FROM_ADDRESS         = 'Sail AI <alerts@sail-ai.com>'
const REPLY_TO             = 'support@sail-ai.com'

// ── Resend email sender ───────────────────────────────────────────────────────

async function sendEmail({
  to, subject, html,
}: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Monitor] RESEND_API_KEY not set — skipping email to', to)
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from:     FROM_ADDRESS,
        reply_to: REPLY_TO,
        to:       [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Monitor] Resend error:', err)
      return false
    }
    return true
  } catch (err) {
    console.error('[Monitor] fetch error:', err)
    return false
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sail-ai.com'

function staleProfileEmail(name: string, sector: string, daysSince: number): string {
  const greeting   = name   ? `Hi ${esc(name.split(' ')[0])},` : 'Hi,'
  const sectorLine = sector ? `for your <strong>${esc(sector)}</strong> business` : 'for your business'

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F9F7;font-family:Inter,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border:1px solid rgba(0,0,0,0.06);">
    <!-- Gold hairline -->
    <div style="height:2px;background:linear-gradient(90deg,transparent,#C9A96E,transparent);"></div>

    <div style="padding:32px 36px 28px;">
      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:600;color:#0C0C0E;margin:0 0 6px;">
        Sail <span style="font-family:Inter,sans-serif;font-size:9px;font-weight:700;background:linear-gradient(135deg,rgba(20,184,166,0.85),rgba(14,165,148,0.9));color:#FFF;padding:1px 5px;border-radius:3px;vertical-align:middle;">AI+</span>
      </p>
      <p style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#C9A96E;margin:0 0 28px;">
        Business Intelligence Alert
      </p>

      <p style="font-size:15px;color:#0C0C0E;line-height:1.6;margin:0 0 16px;">${greeting}</p>

      <p style="font-size:14px;color:#3A3A3C;line-height:1.7;margin:0 0 20px;">
        It's been <strong>${daysSince} days</strong> since you last updated your strategic metrics ${sectorLine}.
        Fresh data leads to sharper Sail AI insights — stale metrics can quietly skew your recommendations.
      </p>

      <p style="font-size:14px;color:#3A3A3C;line-height:1.7;margin:0 0 28px;">
        A 60-second review of your numbers in the Data Vault keeps your AI context current and your strategy grounded in reality.
      </p>

      <a href="${baseUrl}/vault"
         style="display:inline-block;padding:11px 24px;background:#0C0C0E;color:#FFFFFF;font-family:Inter,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">
        Review My Metrics →
      </a>

      <p style="font-size:12px;color:#A1A1AA;margin:32px 0 0;line-height:1.6;">
        You're receiving this because you're a Sail AI Professional subscriber.<br>
        <a href="${baseUrl}/vault" style="color:#C9A96E;">Manage preferences</a>
      </p>
    </div>

    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,169,110,0.3),transparent);"></div>
    <div style="padding:16px 36px;text-align:center;">
      <p style="font-size:11px;color:#A1A1AA;margin:0;">
        Sail AI — Sovereign intelligence for independent operators.
      </p>
    </div>
  </div>
</body>
</html>`
}

function emptyProfileEmail(name: string): string {
  const greeting = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi,'

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F9F7;font-family:Inter,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border:1px solid rgba(0,0,0,0.06);">
    <div style="height:2px;background:linear-gradient(90deg,transparent,#C9A96E,transparent);"></div>

    <div style="padding:32px 36px 28px;">
      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:600;color:#0C0C0E;margin:0 0 6px;">
        Sail <span style="font-family:Inter,sans-serif;font-size:9px;font-weight:700;background:linear-gradient(135deg,rgba(20,184,166,0.85),rgba(14,165,148,0.9));color:#FFF;padding:1px 5px;border-radius:3px;vertical-align:middle;">AI+</span>
      </p>
      <p style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#C9A96E;margin:0 0 28px;">
        Unlock Cross-Session Intelligence
      </p>

      <p style="font-size:15px;color:#0C0C0E;line-height:1.6;margin:0 0 16px;">${greeting}</p>

      <p style="font-size:14px;color:#3A3A3C;line-height:1.7;margin:0 0 16px;">
        You're a Sail AI Professional subscriber — but your Data Vault is still empty.
        This means every analysis session starts without context, and Sail AI can't personalise recommendations to your actual business numbers.
      </p>

      <p style="font-size:14px;color:#3A3A3C;line-height:1.7;margin:0 0 28px;">
        Adding your sector and 3–5 key metrics takes under two minutes and unlocks:
      </p>

      <ul style="padding-left:20px;margin:0 0 28px;">
        <li style="font-size:14px;color:#3A3A3C;line-height:1.8;margin-bottom:6px;">Personalised strategies calibrated to your actual numbers</li>
        <li style="font-size:14px;color:#3A3A3C;line-height:1.8;margin-bottom:6px;">Cross-session memory — no re-entering context every chat</li>
        <li style="font-size:14px;color:#3A3A3C;line-height:1.8;">Proactive alerts when your metrics need attention</li>
      </ul>

      <a href="${baseUrl}/vault"
         style="display:inline-block;padding:11px 24px;background:#C9A96E;color:#FFFFFF;font-family:Inter,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">
        Set Up My Data Vault →
      </a>

      <p style="font-size:12px;color:#A1A1AA;margin:32px 0 0;line-height:1.6;">
        You're receiving this because you're a Sail AI Professional subscriber.<br>
        <a href="${baseUrl}/vault" style="color:#C9A96E;">Manage preferences</a>
      </p>
    </div>

    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,169,110,0.3),transparent);"></div>
    <div style="padding:16px 36px;text-align:center;">
      <p style="font-size:11px;color:#A1A1AA;margin:0;">
        Sail AI — Sovereign intelligence for independent operators.
      </p>
    </div>
  </div>
</body>
</html>`
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── 1. Auth: ALWAYS verify CRON_SECRET — fail-closed ────────────────────────
  //    If the secret is not configured we return 503 (not 200) so the endpoint
  //    is never accessible without a properly provisioned environment.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Endpoint not configured.' }, { status: 503 })
  }
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? ''
  const token      = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stats = {
    totalPro:    0,
    staleAlerts: 0,
    emptyAlerts: 0,
    emailsSent:  0,
    skipped:     0,
    errors:      0,
  }

  try {
    // ── 2. Fetch all Pro users with their BusinessProfile ─────────────────────
    const proUsers = await prisma.user.findMany({
      where:  { isPro: true, email: { not: null } },
      select: {
        email:           true,
        name:            true,
        businessProfile: {
          select: { sector: true, metrics: true, updatedAt: true },
        },
      },
    })

    stats.totalPro = proUsers.length
    const now = Date.now()

    for (const user of proUsers) {
      if (!user.email) continue

      const profile = user.businessProfile

      // ── Case A: No profile at all ─────────────────────────────────────────
      if (!profile) {
        stats.emptyAlerts++
        const ok = await sendEmail({
          to:      user.email,
          subject: 'Unlock the full power of Sail AI — set up your Data Vault',
          html:    emptyProfileEmail(user.name ?? ''),
        })
        if (ok) stats.emailsSent++
        else    stats.errors++
        continue
      }

      // ── Case B: Check staleness ───────────────────────────────────────────
      const metricsArr = Array.isArray(profile.metrics) ? profile.metrics : []
      const updatedAt  = new Date(profile.updatedAt).getTime()
      const daysSince  = Math.floor((now - updatedAt) / 86_400_000)

      if (daysSince >= STALE_THRESHOLD_DAYS && metricsArr.length > 0) {
        stats.staleAlerts++
        const ok = await sendEmail({
          to:      user.email,
          subject: `Your Sail AI metrics are ${daysSince} days old — quick review recommended`,
          html:    staleProfileEmail(user.name ?? '', profile.sector ?? '', daysSince),
        })
        if (ok) stats.emailsSent++
        else    stats.errors++
      } else {
        stats.skipped++
      }
    }

    console.log('[Monitor] Cron complete', JSON.stringify({ totalPro: stats.totalPro, emailsSent: stats.emailsSent, errors: stats.errors }))
    return NextResponse.json({ ok: true, ...stats })

  } catch (err: unknown) {
    // Never expose internal error details (Prisma messages, connection strings)
    console.error('[Monitor] Fatal error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ ok: false, error: 'Internal error.' }, { status: 500 })
  }
}
