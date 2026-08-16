import { PageSkeleton } from '@/components/PageSkeleton'

export default function DashboardLoading() {
  return <PageSkeleton label="Loading dashboard" cards={4} panel={true} />
}
