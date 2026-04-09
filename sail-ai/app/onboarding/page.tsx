import { DiagnosticFlow } from '@/components/DiagnosticFlow'

export const metadata = {
  title: 'Business Health Diagnostic — Sail AI',
  description: 'A 4-step assessment that benchmarks your business and pre-loads the AI with your context.',
}

export default function OnboardingPage() {
  return <DiagnosticFlow />
}
