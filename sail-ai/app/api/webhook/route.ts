/**
 * app/api/webhook/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical payment webhook.
 *
 * Dodo Payments is the only supported provider, so this top-level path simply
 * delegates to the Dodo receiver in `./dodo/route`. Both `/api/webhook` and
 * `/api/webhook/dodo` therefore resolve to the exact same signature-verified
 * handler — point the Dodo dashboard at whichever URL you prefer.
 *
 * (This file previously hosted a Lemon Squeezy receiver. That provider was
 * retired because its store account never activated, permanently pinning every
 * checkout to test mode.)
 */

export { POST, dynamic } from './dodo/route'
