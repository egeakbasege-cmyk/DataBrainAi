import { PageSkeleton } from '@/components/PageSkeleton'

export default function ConnectorsLoading() {
  return <PageSkeleton label="Loading connectors" cards={6} panel={false} />
}
