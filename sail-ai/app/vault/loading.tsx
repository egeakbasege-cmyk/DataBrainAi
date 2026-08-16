import { PageSkeleton } from '@/components/PageSkeleton'

export default function VaultLoading() {
  return <PageSkeleton label="Loading vault" cards={3} panel={true} />
}
