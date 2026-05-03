/**
 * lib/skills/piiScrubber.ts
 *
 * PII redaction utility — regex only, no external libraries.
 * Safe for Vercel Edge Runtime (no Node.js APIs used).
 *
 * Patterns covered:
 *   email          → [REDACTED_EMAIL]
 *   TC Kimlik No   → [REDACTED_TC_ID]   (Turkish national ID, exactly 11 digits)
 *   IBAN           → [REDACTED_IBAN]    (TR + international, 15–34 chars)
 *   Phone          → [REDACTED_PHONE]   (TR 05xx, +90, +XX international)
 *   Credit card    → [REDACTED_CC]      (Luhn-pattern 13–19 digit groups)
 */

export interface ScrubResult {
  scrubbedText:   string
  redactedCount:  number     // total individual replacements across all patterns
  tags:           string[]   // entity types found, e.g. ["email", "phone"]
}

// ── Pattern registry ──────────────────────────────────────────────────────────

interface PiiPattern {
  tag:         string
  replacement: string
  regex:       RegExp
}

const PII_PATTERNS: PiiPattern[] = [
  // ── Email ──────────────────────────────────────────────────────────────────
  {
    tag:         'email',
    replacement: '[REDACTED_EMAIL]',
    // Standard email pattern; handles subdomains, TLDs up to 6 chars, + aliases
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g,
  },

  // ── Turkish TC Kimlik No ───────────────────────────────────────────────────
  // Exactly 11 decimal digits, first digit non-zero. Must not be part of a
  // longer digit sequence (word boundaries).
  {
    tag:         'tc_id',
    replacement: '[REDACTED_TC_ID]',
    regex: /(?<!\d)[1-9]\d{10}(?!\d)/g,
  },

  // ── IBAN ──────────────────────────────────────────────────────────────────
  // TR-specific: TR + 24 digits (26 chars total).
  // International: 2 letters + 2 digits + up to 30 alphanumeric (15–34 chars).
  // Optional spaces/hyphens every 4 chars (printed format).
  {
    tag:         'iban',
    replacement: '[REDACTED_IBAN]',
    regex: /\b(?:TR\d{2}[\s\-]?(?:\d{4}[\s\-]?){5}\d{2}|[A-Z]{2}\d{2}[\s\-]?[A-Z0-9]{1,30})\b/gi,
  },

  // ── Phone numbers ─────────────────────────────────────────────────────────
  // TR mobile: 05xx or +905xx (10-11 digits after prefix)
  // International: +XX(X) followed by 7–12 digits, optional separators
  {
    tag:         'phone',
    replacement: '[REDACTED_PHONE]',
    regex: /(?:(?:\+90|0090|0)\s?(?:[2-9]\d{2}|5\d{2})[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,9})/g,
  },

  // ── Credit card ───────────────────────────────────────────────────────────
  // Luhn-compatible visual pattern: 13–19 digits with optional space/hyphen
  // separators every 4 digits. Excludes TC IDs already caught above (starts
  // validation with 13+ chars).
  {
    tag:         'credit_card',
    replacement: '[REDACTED_CC]',
    regex: /\b(?:\d{4}[\s\-]?){3,4}\d{1,4}\b(?![\s\-]?\d)/g,
  },
]

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * scrubPII
 *
 * Applies all PII_PATTERNS to `text` in order. Returns the redacted text,
 * the total number of replacements made, and an array of entity types found.
 *
 * Order matters: email and TC-ID are applied before credit card to prevent
 * digit-sequence false positives.
 */
export function scrubPII(text: string): ScrubResult {
  let scrubbedText   = text
  let redactedCount  = 0
  const tagSet       = new Set<string>()

  for (const { tag, replacement, regex } of PII_PATTERNS) {
    // Reset lastIndex (all regexes use /g flag)
    regex.lastIndex = 0

    const matches = scrubbedText.match(regex)
    if (matches && matches.length > 0) {
      redactedCount += matches.length
      tagSet.add(tag)
      scrubbedText = scrubbedText.replace(regex, replacement)
    }

    // Reset again after replace (safety for reuse across calls)
    regex.lastIndex = 0
  }

  return {
    scrubbedText,
    redactedCount,
    tags: Array.from(tagSet),
  }
}
