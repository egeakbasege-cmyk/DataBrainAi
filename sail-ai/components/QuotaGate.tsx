'use client'

/**
 * QuotaGate — global paywall trigger
 * ─────────────────────────────────────────────────────────────────────────────
 * The daily free limit is enforced on the server (`lib/quota.ts`), which
 * answers with HTTP 402 + `{ code: 'QUOTA_EXCEEDED' }`. Previously nothing on
 * the client listened for that, so a user who hit the limit just saw a generic
 * failure — and `PaywallModal` was only reachable from two hand-wired spots in
 * `app/chat/page.tsx`.
 *
 * There are a dozen `fetch('/api/...')` call sites spread across pages, hooks
 * and features. Rather than patching each one (and forgetting the next one that
 * gets added), we install a single response interceptor here: any 402 carrying
 * the quota code surfaces the upgrade modal, everywhere, automatically.
 *
 * The interceptor is deliberately non-invasive:
 *   • the original Response is returned untouched, so existing error handling
 *     in every caller keeps working exactly as before;
 *   • the body is read from a clone, never from the stream the caller consumes;
 *   • a non-402 response short-circuits before any cloning happens.
 */

import { useEffect, useState } from 'react'
import { PaywallModal } from './PaywallModal'

const QUOTA_EVENT = 'sail:quota-exceeded'

export function QuotaGate() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const original = window.fetch
    // Guard against double-install under React strict mode / fast refresh.
    if ((original as { __sailQuotaPatched?: boolean }).__sailQuotaPatched) return

    const patched: typeof window.fetch = async (...args) => {
      const res = await original(...args)
      if (res.status !== 402) return res

      // Inspect a clone so the caller still gets an unread body.
      try {
        const body = await res.clone().json()
        if (body?.code === 'QUOTA_EXCEEDED') {
          window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: body }))
        }
      } catch {
        // Non-JSON 402 — nothing actionable, leave it to the caller.
      }
      return res
    }

    ;(patched as { __sailQuotaPatched?: boolean }).__sailQuotaPatched = true
    window.fetch = patched

    const onQuota = () => setOpen(true)
    window.addEventListener(QUOTA_EVENT, onQuota)

    return () => {
      window.removeEventListener(QUOTA_EVENT, onQuota)
      window.fetch = original
    }
  }, [])

  return <PaywallModal open={open} onClose={() => setOpen(false)} />
}

/** Manual trigger for pro-only features that never hit the network. */
export function triggerPaywall(reason?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: { code: 'QUOTA_EXCEEDED', reason } }))
}
