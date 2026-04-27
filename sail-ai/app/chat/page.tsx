'use client'

/**
 * Chat Page with Data Brain Evolution Layer
 * 
 * This wrapper adds the Focus Dashboard sidebar to the existing chat page.
 */

import { useState } from 'react'
import ChatPageOriginal from './page-original'
import { FocusDashboard } from '@/components/FocusDashboard'
import { useDataBrain } from '@/hooks/useDataBrain'
import type { AgentMode } from '@/types/chat'
import type { AnalysisMode } from '@/components/ModeSelector'

export default function ChatPageWrapper() {
  const [agentMode, setAgentMode] = useState<AnalysisMode>('upwind')
  const { trackAgentMode } = useDataBrain({
    enableTracking: true,
    enableSimulation: true,
  })

  const handleModeSelect = (mode: AgentMode) => {
    trackAgentMode(mode, 0.9)
    setAgentMode(mode as AnalysisMode)
  }

  return (
    <div className="flex min-h-screen">
      {/* Original Chat Page */}
      <div className="flex-1">
        <ChatPageOriginal />
      </div>

      {/* Focus Dashboard Sidebar */}
      <aside 
        className="hidden lg:block w-80 border-l overflow-y-auto"
        style={{ 
          background: 'linear-gradient(180deg, #0C0C0E 0%, #141420 100%)',
          borderLeft: '1px solid rgba(226,226,232,0.08)'
        }}
      >
        <div className="p-4">
          <FocusDashboard 
            onModeSelect={handleModeSelect}
          />
        </div>
      </aside>
    </div>
  )
}
