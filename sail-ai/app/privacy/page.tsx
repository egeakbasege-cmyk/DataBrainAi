import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/LegalPage'
import {
  SUPPORT_EMAIL,
  LEGAL_ENTITY,
  JURISDICTION,
  SUBPROCESSORS,
  MERCHANT_OF_RECORD,
} from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy · Sail AI',
  description: 'What data Sail AI collects, why, and who it is shared with.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="What we collect, why we collect it, who we share it with, and how you get it deleted."
    >
      <LegalSection title="Who is responsible for your data">
        <p>
          {LEGAL_ENTITY} is the data controller. The service is operated by an
          individual sole trader based in {JURISDICTION}. For any privacy request,
          write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>
          <strong>Account data.</strong> Your email address, and your name and
          profile image if you sign in with Google. Used to identify your account
          and to contact you about the service.
        </p>
        <p>
          <strong>Onboarding answers.</strong> Sector, company size and stated
          priority. Used to give the assistant context so its answers are relevant.
        </p>
        <p>
          <strong>Conversations and uploads.</strong> The questions you ask, the
          files you upload for analysis, and the responses generated. Stored so you
          can return to earlier sessions.
        </p>
        <p>
          <strong>Usage counters.</strong> Number of requests per day, used to
          enforce plan limits and to detect abuse.
        </p>
        <p>
          <strong>Subscription status.</strong> Plan, renewal state and provider
          identifiers received from {MERCHANT_OF_RECORD}. We never receive or store
          your card number.
        </p>
        <p>
          <strong>Technical logs.</strong> Errors, timestamps and coarse request
          metadata, used to diagnose faults.
        </p>
      </LegalSection>

      <LegalSection title="Legal basis">
        <ul>
          <li>
            <strong>Performance of a contract</strong> — account data, conversations,
            uploads, usage counters and subscription status. Without these the
            service cannot be provided.
          </li>
          <li>
            <strong>Legitimate interests</strong> — technical logs and abuse
            prevention, balanced against a narrow retention window.
          </li>
          <li>
            <strong>Legal obligation</strong> — transaction records retained for
            tax and accounting purposes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="We do not train models on your data">
        <p>
          Your conversations and uploaded files are sent to the AI providers listed
          below only to produce your answer. We do not use your content to train or
          fine-tune models, and we do not sell or rent your data to anyone.
        </p>
      </LegalSection>

      <LegalSection title="Who we share data with">
        <p>
          We use the following sub-processors. Each receives only what it needs to
          perform its function.
        </p>
        <ul>
          {SUBPROCESSORS.map((s) => (
            <li key={s.name}>
              <strong>{s.name}</strong> — {s.purpose}
            </li>
          ))}
        </ul>
        <p>
          Some of these operate outside your country. Transfers rely on the
          providers&apos; standard contractual clauses and equivalent safeguards.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <ul>
          <li>
            <strong>Account, conversations and uploads</strong> — until you delete
            them or close your account. Deletion removes them within 30 days,
            including from backups.
          </li>
          <li>
            <strong>Usage counters</strong> — rolling window, retained no longer
            than 90 days.
          </li>
          <li>
            <strong>Technical logs</strong> — up to 90 days.
          </li>
          <li>
            <strong>Transaction records</strong> — retained as long as tax law
            requires, held by {MERCHANT_OF_RECORD} as merchant of record.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Subject to your local law, you can ask us to give you a copy of your data,
          correct it, delete it, restrict or object to processing, or transfer it
          elsewhere. You can also withdraw consent where processing relies on it.
        </p>
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We respond
          within 30 days. If you are in the EU or UK you may also complain to your
          national data protection authority; in {JURISDICTION} the authority is the
          KVKK (Kişisel Verilerin Korunması Kurumu).
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We set a session cookie so you stay signed in, and we store your language
          and interface preferences locally in your browser. These are strictly
          necessary for the service to function and are not used for advertising.
          We do not run third-party advertising or cross-site tracking.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Traffic is encrypted in transit. Data at rest sits in managed
          infrastructure with encryption enabled. Access to production data is
          limited to the operator. No system is completely secure; if a breach
          affects your data we will notify you and the relevant authority as
          required by law.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          The service is not directed at anyone under 18 and we do not knowingly
          collect their data. If you believe a minor has created an account, contact
          us and we will remove it.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If we change this policy in a way that materially affects you, we will
          notify you by email or in the application before the change takes effect.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
