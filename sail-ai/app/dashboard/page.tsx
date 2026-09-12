import SwissPrecisionDashboard from '@/components/dashboard/SwissPrecisionDashboard'

export default function DashboardPage() {
  return <SwissPrecisionDashboard />
}

export const metadata = {
  title: 'Dashboard | Sail AI',
  description: 'A precise view of the signals moving your revenue engine.',
}

export const dynamic = 'force-dynamic'
