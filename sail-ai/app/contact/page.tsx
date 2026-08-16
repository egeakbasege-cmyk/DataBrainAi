import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/LegalPage'
import {
  SUPPORT_EMAIL,
  LEGAL_ENTITY,
  JURISDICTION,
  REFUND_DAYS,
  MERCHANT_OF_RECORD,
} from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Contact · Sail AI',
  description: 'How to reach Sail AI support.',
}

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      subtitle="One inbox, monitored by the person who builds the product. No ticket queue."
    >
      <LegalSection title="Email">
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          This is the address for everything: technical problems, billing questions,
          refund requests, privacy and data deletion requests, and press or
          partnership enquiries.
        </p>
      </LegalSection>

      <LegalSection title="Response times">
        <ul>
          <li>
            <strong>Billing and refunds</strong> — acknowledged within 1 business day.
          </li>
          <li>
            <strong>Technical issues</strong> — within 1–2 business days.
          </li>
          <li>
            <strong>Privacy and data requests</strong> — acknowledged within 1
            business day, fulfilled within 30 days as required by law.
          </li>
        </ul>
        <p>
          Support is provided in English and Turkish. Business days are Monday to
          Friday, {JURISDICTION} time.
        </p>
      </LegalSection>

      <LegalSection title="Who operates this service">
        <p>
          {LEGAL_ENTITY} is operated by an individual sole trader based in{' '}
          {JURISDICTION}. There is no incorporated company behind it, and no
          telephone support line — email is the only support channel, and it is
          answered by the operator directly.
        </p>
      </LegalSection>

      <LegalSection title="Billing enquiries">
        <p>
          Payments are handled by {MERCHANT_OF_RECORD}, our merchant of record.
          Charges and invoices appear under their name rather than{' '}
          {LEGAL_ENTITY}. If you do not recognise a charge, email us with the date
          and amount and we will identify it.
        </p>
        <p>
          To cancel, use your account settings, or email us and we will do it for
          you. For refunds see our <a href="/refund">Refund Policy</a> — you have{' '}
          {REFUND_DAYS} days, no reason needed.
        </p>
      </LegalSection>

      <LegalSection title="Reporting a security issue">
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with
          &ldquo;Security&rdquo; in the subject line. Please give us a reasonable
          window to fix the issue before disclosing it publicly. We will confirm
          receipt and keep you updated on the fix.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
