import Link                            from 'next/link'
import { ExternalLink, ShoppingBag, Package, Clock } from 'lucide-react'
import { timeAgo, PLATFORM_COLOR, STATUS_COLOR, truncate } from '@/lib/utils'

interface Props {
  id:         string
  platform:   string
  targetUrl:  string
  targetName: string
  status:     string
  createdAt:  string
}

export function HistoryCard({ id, platform, targetUrl, targetName, status, createdAt }: Props) {
  const Icon = platform === 'SHOPIFY' ? ShoppingBag : Package
  const platformStyle = PLATFORM_COLOR[platform] ?? 'text-zinc-400 bg-zinc-400/10'
  const statusStyle   = STATUS_COLOR[status] ?? 'text-zinc-400'
  const isComplete    = status === 'COMPLETE'

  return (
    <Link
      href={isComplete ? `/analysis/${id}` : '#'}
      className={`block group bg-[#0f0f12] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all duration-200 ${!isComplete ? 'opacity-60 cursor-default' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${platformStyle}`}>
            <Icon size={10} />
            {platform}
          </span>
        </div>
        <span className={`text-xs font-medium shrink-0 ${statusStyle}`}>
          {status === 'COMPLETE' ? '✓ Done' : status}
        </span>
      </div>

      <div className="mt-2">
        <p className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
          {truncate(targetName || targetUrl, 50)}
        </p>
        <p className="text-xs text-zinc-600 mt-0.5 truncate">
          {truncate(targetUrl, 55)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-zinc-600">
          <Clock size={10} />
          {timeAgo(createdAt)}
        </span>
        {isComplete && (
          <span className="flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
            View report <ExternalLink size={10} />
          </span>
        )}
      </div>
    </Link>
  )
}
