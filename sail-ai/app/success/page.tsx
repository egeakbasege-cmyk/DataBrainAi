'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

/**
 * Post-payment landing (Dodo `return_url`).
 *
 * Kept deliberately self-contained and static: entitlement is granted
 * server-side by the webhook, so this screen only confirms the order and
 * routes the customer back into the product. It never reads payment state
 * from the client, which could be spoofed.
 */
export default function SuccessPage() {
  return (
    <main
      style={{
        position:       'fixed',
        inset:           0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '1.5rem',
        background:     'radial-gradient(120% 90% at 50% -10%, rgba(201,169,110,0.14) 0%, transparent 55%), linear-gradient(160deg, #080F1E 0%, #0D1B35 100%)',
        overflowY:      'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width:        'min(92vw, 460px)',
          textAlign:    'center',
          background:   'linear-gradient(160deg, rgba(13,27,53,0.65) 0%, rgba(8,15,30,0.65) 100%)',
          border:       '1px solid rgba(201,169,110,0.22)',
          borderRadius: 18,
          padding:      '2.75rem 2rem 2.25rem',
          boxShadow:    '0 32px 96px rgba(0,0,0,0.5)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', marginBottom: '2rem' }}>
          <Logo size={24} />
          <span style={{
            fontFamily:    'var(--font-cormorant), Georgia, serif',
            fontWeight:     700,
            fontSize:       '0.8rem',
            letterSpacing: '0.14em',
            color:         '#C9A96E',
            textTransform: 'uppercase',
          }}>
            Sail AI
          </span>
        </div>

        {/* Animated check seal */}
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 16 }}
          style={{
            width:          72,
            height:         72,
            margin:        '0 auto 1.5rem',
            borderRadius:  '50%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            background:    'linear-gradient(135deg, #B8902A 0%, #C9A96E 50%, #D4B877 100%)',
            boxShadow:     '0 0 0 8px rgba(201,169,110,0.10), 0 10px 30px rgba(201,169,110,0.30)',
          }}
        >
          <motion.svg
            width="34" height="34" viewBox="0 0 24 24" fill="none"
            stroke="#0C0C0E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden
          >
            <motion.path
              d="M4 12.5l5 5L20 6.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.5, ease: 'easeInOut' }}
            />
          </motion.svg>
        </motion.div>

        <h1 style={{
          fontFamily:    'var(--font-cormorant), Georgia, serif',
          fontSize:      '2rem',
          fontWeight:     600,
          lineHeight:     1.15,
          color:         '#F5F0E6',
          margin:        '0 0 0.75rem',
        }}>
          Payment confirmed
        </h1>

        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize:   '0.9rem',
          lineHeight:  1.6,
          color:      'rgba(255,255,255,0.62)',
          margin:     '0 auto 1.75rem',
          maxWidth:    360,
          fontWeight:  300,
        }}>
          Thank you — your <strong style={{ color: '#C9A96E', fontWeight: 600 }}>Sail AI Pro</strong> subscription
          is now active. Unlimited analyses, session memory, and every specialist mode are unlocked across your account.
        </p>

        <Link
          href="/chat"
          style={{
            display:        'block',
            width:          '100%',
            padding:        '0.9rem 1.25rem',
            background:     'linear-gradient(135deg, #B8902A 0%, #C9A96E 50%, #D4B877 100%)',
            border:         '1px solid rgba(201,169,110,0.4)',
            borderRadius:   10,
            fontFamily:     'var(--font-inter), sans-serif',
            fontSize:       '0.875rem',
            fontWeight:      600,
            letterSpacing:  '0.04em',
            color:          '#0C0C0E',
            textDecoration: 'none',
            boxShadow:      '0 4px 16px rgba(201,169,110,0.3)',
          }}
        >
          Continue to Sail AI
        </Link>

        <Link
          href="/"
          style={{
            display:        'inline-block',
            marginTop:      '1rem',
            fontFamily:     'var(--font-inter), sans-serif',
            fontSize:       '0.78rem',
            color:          'rgba(255,255,255,0.4)',
            textDecoration: 'none',
            letterSpacing:  '0.04em',
          }}
        >
          Return home
        </Link>

        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize:   '0.65rem',
          color:      'rgba(255,255,255,0.25)',
          marginTop:  '1.5rem',
          lineHeight:  1.6,
        }}>
          A receipt has been emailed to you · Manage or cancel anytime from settings
        </p>
      </motion.div>
    </main>
  )
}
