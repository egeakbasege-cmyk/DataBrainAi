import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { message } = await req.json()

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'Message is required.' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let buffer = ''

        const aiStream = await client.messages.stream({
          model:      'claude-sonnet-4-6',
          max_tokens: 1200,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: 'user', content: buildUserMessage(message) }],
        })

        for await (const chunk of aiStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            buffer += chunk.delta.text
            controller.enqueue(encoder.encode(buffer))
          }
        }

        // Ensure final complete JSON is flushed
        const final = await aiStream.finalMessage()
        const text  = final.content[0]?.type === 'text' ? final.content[0].text : buffer
        controller.enqueue(encoder.encode(text))
        controller.close()
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: err.message || 'Generation failed.' }))
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
