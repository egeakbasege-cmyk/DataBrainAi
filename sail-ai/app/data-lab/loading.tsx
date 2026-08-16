import { PageSkeleton } from '@/components/PageSkeleton'

export default function DataLabLoading() {
  return <PageSkeleton label="Loading data lab" cards={3} panel={true} />
}
