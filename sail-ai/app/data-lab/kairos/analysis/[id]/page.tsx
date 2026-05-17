import { notFound }                 from 'next/navigation'
import Link                          from 'next/link'
import { ArrowLeft, Zap, Loader2 }  from 'lucide-react'
import { prisma }                    from '@/lib/prisma'
import { KairosMetadataPanel }       from '@/components/kairos/MetadataPanel'
import { KairosChartsPanel }         from '@/components/kairos/ChartsPanel'
import { KairosAIPlaybook }          from '@/components/kairos/AIPlaybook'
import { KairosChatInterface }       from '@/components/kairos/ChatInterface'
import type { KairosAnalysisRecord, KairosAIAnalysis } from '@/lib/kairos/types'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const record  = await prisma.kairosAnalysis.findUnique({ where: { id }, select: { targetName: true, platform: true } })
  if (!record) return { title: 'Analysis Not Found — KAIROS' }
  return {
    title:       `${record.targetName || 'Analysis'} — KAIROS Intelligence`,
    description: `${record.platform} competitive intelligence report`,
  }
}

export default async function KairosAnalysisPage({ params }: Props) {
  const { id } = await params
  const record  = await prisma.kairosAnalysis.findUnique({ where: { id } })
  if (!record) notFound()

  // If still processing, show a polling UI
  if (record.status === 'PENDING' || record.status === 'SCRAPING' || record.status === 'ANALYZING') {
    return <ProcessingScreen id={id} status={record.status} targetUrl={record.targetUrl} />
  }

  if (record.status === 'ERROR') {
    const err = (record.aiAnalysis as any)?.error ?? 'Unknown error'
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400 font-semibold text-lg">Analysis Failed</p>
        <p className="text-sm text-zinc-500 max-w-md">{err}</p>
        <Link href="/data-lab/kairos" className="text-xs text-indigo-400 hover:underline mt-2">← Try another URL</Link>
      </div>
    )
  }

  const analysis: KairosAnalysisRecord = {
    id:         record.id,
    platform:   record.platform as 'SHOPIFY' | 'AMAZON',
    targetUrl:  record.targetUrl,
    targetName: record.targetName,
    status:     record.status as any,
    rawData:    record.rawData as any,
    aiAnalysis: record.aiAnalysis as any,
    createdAt:  record.createdAt.toISOString(),
    updatedAt:  record.updatedAt.toISOString(),
  }

  const aiAnalysis = analysis.aiAnalysis as KairosAIAnalysis

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/data-lab/kairos" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
            <ArrowLeft size={13} /> Back
          </Link>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap size={10} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-zinc-400">{analysis.targetName || analysis.targetUrl}</span>
          </div>
          <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            ✓ Analysis Complete
          </span>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_400px] gap-5">
          {/* LEFT — metadata + charts */}
          <div className="space-y-5 xl:max-h-[calc(100vh-80px)] xl:overflow-y-auto xl:pr-1">
            <div className="bg-[#0f0f12] border border-zinc-800 rounded-xl p-4">
              <KairosMetadataPanel analysis={analysis} />
            </div>
            <KairosChartsPanel analysis={analysis} />
          </div>

          {/* CENTRE — AI Playbook */}
          <div className="xl:max-h-[calc(100vh-80px)] xl:sticky xl:top-[72px]">
            {aiAnalysis?.vulnerabilities ? (
              <KairosAIPlaybook analysis={aiAnalysis} />
            ) : (
              <div className="h-full bg-[#0f0f12] border border-zinc-800 rounded-xl flex items-center justify-center">
                <p className="text-sm text-zinc-600">AI analysis not yet available.</p>
              </div>
            )}
          </div>

          {/* RIGHT — AI Chat */}
          <div className="xl:max-h-[calc(100vh-80px)] xl:sticky xl:top-[72px]">
            <KairosChatInterface
              analysisId={analysis.id}
              targetName={analysis.targetName || analysis.targetUrl}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Processing screen (auto-refresh) ─────────────────────────────────────────

function ProcessingScreen({ id, status, targetUrl }: { id: string; status: string; targetUrl: string }) {
  const label =
    status === 'PENDING'   ? 'Queued…' :
    status === 'SCRAPING'  ? 'Scraping store data…' :
    'Running AI analysis…'

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <Zap size={22} className="text-white" />
      </div>
      <div>
        <p className="text-zinc-100 font-semibold text-lg mb-1">Analysing Competitor</p>
        <p className="text-zinc-500 text-sm truncate max-w-sm">{targetUrl}</p>
      </div>
      <div className="flex items-center gap-2 text-indigo-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        {label}
      </div>
      {/* Auto-refresh every 4 seconds */}
      <meta httpEquiv="refresh" content={`4;url=/data-lab/kairos/analysis/${id}`} />
      <p className="text-xs text-zinc-700">Page refreshes automatically…</p>
      <Link href="/data-lab/kairos" className="text-xs text-zinc-600 hover:text-zinc-400 mt-4">← Cancel</Link>
    </div>
  )
}
