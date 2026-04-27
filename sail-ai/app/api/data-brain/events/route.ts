/**
 * Data Brain™ Event Ingestion API
 * 
 * Receives batched events from the EventStream Service.
 * Lightweight endpoint - events are logged, not stored long-term.
 */

import { type NextRequest } from 'next/server'
import { auth } from '@/auth'

export const runtime = 'edge'

interface EventPayload {
  type: string
  timestamp: number
  sessionId: string
  userId?: string
  data: Record<string, unknown>
}

interface EventBatch {
  events: EventPayload[]
  sentAt: number
}

export async function POST(req: NextRequest) {
  // Optional auth - events can be anonymous
  const session = await auth().catch(() => null)
  
  let batch: EventBatch
  try {
    batch = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(batch.events)) {
    return Response.json({ error: 'Invalid batch format' }, { status: 400 })
  }

  // Process events
  const processed = batch.events.map((event) => ({
    ...event,
    serverTimestamp: Date.now(),
    userId: session?.user?.id || event.userId || 'anonymous',
  }))

  // Log for now - can be sent to analytics service later
  if (process.env.NODE_ENV === 'development') {
    console.log('[DataBrain Events]', processed.length, 'events')
  }

  // TODO: Send to your analytics service
  // Examples:
  // - await sendToMixpanel(processed)
  // - await sendToSegment(processed)
  // - await sendToSupabase(processed)

  return Response.json({ 
    received: processed.length,
    status: 'ok' 
  })
}

// For GET requests - SSE endpoint (future implementation)
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null)
  
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Return stream status
  return Response.json({
    status: 'active',
    endpoint: 'events',
    version: '1.0',
  })
}
