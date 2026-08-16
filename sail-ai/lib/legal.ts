/**
 * lib/legal.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the identity and policy facts that appear across
 * the legal pages.
 *
 * These exist because Dodo Payments (and every other merchant of record)
 * refuses to verify an account whose website lacks a reachable contact route,
 * terms, privacy policy and a refund policy. Their review team checks the live
 * site; missing pages put the application on hold.
 *
 * Keeping the values here rather than inline in each page means the support
 * address and refund window are stated identically everywhere — a mismatch
 * between the refund page and the terms page is exactly the kind of
 * inconsistency that gets an application rejected.
 */

/**
 * Must remain an address that is actually monitored: verification reviewers
 * send a test message, and an unanswered contact route fails the check.
 */
export const SUPPORT_EMAIL = 'acquire@sailaiadvisory.com'

/** Trading name shown to customers. */
export const LEGAL_ENTITY = 'Sail AI'

/**
 * Operated by an individual (sole trader) rather than a registered company.
 *
 * This is stated openly instead of implying a corporate entity: claiming a
 * company that does not exist would misrepresent the contracting party, and
 * both consumer-protection rules and the payment provider's verification
 * require the actual counterparty to be identifiable. It also matches the
 * "Individual" account type used with the merchant of record.
 */
export const IS_REGISTERED_ENTITY = false

/**
 * Operating jurisdiction. Governs the consumer-rights language below.
 */
export const JURISDICTION = 'Türkiye'

/**
 * Refund window in days.
 *
 * 14 days matches the EU/UK statutory right of withdrawal for distance
 * contracts and Turkish distance-selling regulations, so a single number keeps
 * us compliant in every market we sell to without per-region logic.
 */
export const REFUND_DAYS = 14

/**
 * Date the current policy text took effect. Update whenever the substance of a
 * policy changes — reviewers and customers both rely on it.
 */
export const POLICY_EFFECTIVE = '2026-08-16'

/**
 * Merchant of record. Under this arrangement the payment provider is the legal
 * seller: it issues the invoice and remits VAT/sales tax in the customer's
 * jurisdiction. Naming it is a disclosure requirement, and customers need to
 * know why the charge on their statement is not "Sail AI".
 */
export const MERCHANT_OF_RECORD = 'Dodo Payments'

/** Sub-processors that receive customer data. Disclosed in the privacy policy. */
export const SUBPROCESSORS = [
  { name: 'Vercel',         purpose: 'Application hosting and content delivery' },
  { name: 'Neon',           purpose: 'Managed PostgreSQL database' },
  { name: 'Dodo Payments',  purpose: 'Payment processing and invoicing (merchant of record)' },
  { name: 'Groq',           purpose: 'Large language model inference' },
  { name: 'xAI',            purpose: 'Large language model inference' },
  { name: 'Google',         purpose: 'Optional sign-in via OAuth' },
  { name: 'Sentry',         purpose: 'Error monitoring and diagnostics' },
] as const

export const POLICY_DATE_LABEL = new Date(POLICY_EFFECTIVE).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
})
