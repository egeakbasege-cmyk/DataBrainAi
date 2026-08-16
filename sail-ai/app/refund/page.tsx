import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/LegalPage'
import {
  SUPPORT_EMAIL,
  REFUND_DAYS,
  MERCHANT_OF_RECORD,
  LEGAL_ENTITY,
} from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Refund Policy · Sail AI',
  description: `Sail AI offers a no-questions-asked refund within ${REFUND_DAYS} days.`,
}

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      subtitle={`If Sail AI is not right for you, you have ${REFUND_DAYS} days to get your money back. No explanation required.`}
    >
      <LegalSection title={`The ${REFUND_DAYS}-day guarantee`}>
        <p>
          Request a refund within {REFUND_DAYS} days of a charge and we will refund
          it in full. You do not need to give a reason, and we will not ask you to
          justify it.
        </p>
        <p>
          This applies to your first subscription payment and to each renewal
          charge, counted from the date the charge was made.
        </p>
      </LegalSection>

      <LegalSection title="How to request one">
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the
          address on your account, or use our{' '}
          <a href="/contact">contact page</a>. Include the email you subscribed with.
          Nothing else is needed.
        </p>
        <p>
          We acknowledge requests within one business day. Once approved, the refund
          is issued by {MERCHANT_OF_RECORD} back to your original payment method.
          Card refunds typically appear within 5–10 business days depending on your
          bank; {LEGAL_ENTITY} has no control over that timing.
        </p>
      </LegalSection>

      <LegalSection title="What happens to your account">
        <p>
          A refund cancels the subscription and removes paid features at the same
          time. Your account, conversations and uploaded data remain intact, and you
          can keep using the free tier or resubscribe later.
        </p>
      </LegalSection>

      <LegalSection title="After the window">
        <p>
          Beyond {REFUND_DAYS} days we do not refund charges already taken, but you
          can cancel at any time from your account settings to prevent the next
          renewal. Cancelling keeps your access until the end of the period you have
          already paid for.
        </p>
        <p>
          If you were charged after cancelling, or charged twice, or the service was
          unavailable for a sustained period, contact us and we will correct it
          regardless of how much time has passed.
        </p>
      </LegalSection>

      <LegalSection title="Your statutory rights">
        <p>
          This policy is offered in addition to, and does not limit, the rights you
          have under consumer law. Consumers in the EU and UK have a 14-day right of
          withdrawal for distance contracts, and comparable protections apply under
          Turkish distance-selling rules. Where your statutory rights are more
          generous than this policy, those rights apply.
        </p>
      </LegalSection>

      <LegalSection title="Abuse">
        <p>
          Repeatedly subscribing and refunding to obtain continuous free access is
          the one case where we may decline. We will explain the decision in writing
          if it ever happens.
        </p>
      </LegalSection>

      <LegalSection title="Chargebacks">
        <p>
          If something has gone wrong, please email us first — we can resolve a
          refund faster than a bank dispute, which typically takes several weeks.
          Filing a chargeback without contacting us may result in the account being
          suspended while the dispute is investigated.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
