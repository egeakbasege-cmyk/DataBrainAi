import { PageSkeleton } from '@/components/PageSkeleton'

export default function PricingLoading() {
  return <PageSkeleton label="Loading plans" cards={3} panel={false} />
}
