import { notFound }          from 'next/navigation'
import Link                    from 'next/link'
import { ArrowLeft, Zap }      from 'lucide-react'
import prisma                  from '@/lib/db'
import { MetadataPanel }       from '@/components/analysis/MetadataPanel'
import { ChartsPanel }         from '@/components/analysis/ChartsPanel'
import { AIPlaybook }          from '@/components/analysis/AIPlaybook'
import { ChatInterface }       from '@/components/analysis/ChatInterface'
import type { AnalysisRecord, AIAnalysis } from '@/types'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const record = await prisma.analysisResult.findUnique({
    where:  { id },
    select: { targetName: true, platform: true },
  })
  if (!record) return { title: 'Analysis Not Found — KAIROS' }
  return {
    title: `${record.targetName || 'Analysis'} — KAIROS Data Lab`,
    description: `${record.platform} competitive intelligence report`,
  }
}

export default async function AnalysisPage({ params }: Props) {
  const { id } = await params

  const record = await prisma.analysisResult.findUnique({ where: { id } })
  if (!record || record.status === 'ERROR') notFound()

  const analysis: AnalysisRecord = {
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

  const aiAnalysis = analysis.aiAnalysis as AIAnalysis

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft size={13} />
            Back
          </Link>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap size={10} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-zinc-400">
              {analysis.targetName || analysis.targetUrl}
            </span>
          </div>
          <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            ✓ Analysis Complete
          </span>
        </div>
      </header>

      {/* Main split layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_400px] gap-5">

          {/* LEFT — Store metadata + charts */}
          <div className="space-y-5 xl:max-h-[calc(100vh-80px)] xl:overflow-y-auto xl:pr-1">
            <div className="bg-[#0f0f12] border border-zinc-800 rounded-xl p-4">
              <MetadataPanel analysis={analysis} />
            </div>
            <ChartsPanel analysis={analysis} />
          </div>

          {/* CENTRE — AI Playbook (full height) */}
          <div className="xl:max-h-[calc(100vh-80px)] xl:sticky xl:top-[72px]">
            {aiAnalysis?.vulnerabilities ? (
              <AIPlaybook analysis={aiAnalysis} />
            ) : (
              <div className="h-full bg-[#0f0f12] border border-zinc-800 rounded-xl flex items-center justify-center">
                <p className="text-sm text-zinc-600">AI analysis not yet available.</p>
              </div>
            )}
          </div>

          {/* RIGHT — AI Chat copilot */}
          <div className="xl:max-h-[calc(100vh-80px)] xl:sticky xl:top-[72px]">
            <ChatInterface
              analysisId={analysis.id}
              targetName={analysis.targetName || analysis.targetUrl}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
