import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genai.getGenerativeModel({
  model:             'gemini-1.5-flash',
  systemInstruction: SYSTEM_PROMPT,
  generationConfig:  { maxOutputTokens: 1200, temperature: 0.4 },
})

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

        const result = await model.generateContentStream(buildUserMessage(message))

        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            buffer += text
            controller.enqueue(encoder.encode(buffer))
          }
        }

        // Strip markdown fences if Gemini wraps output
        if (buffer.startsWith('```')) {
          buffer = buffer.split('\n', 2)[1]
          buffer = buffer.substring(0, buffer.lastIndexOf('```')).trim()
        }

        controller.enqueue(encoder.encode(buffer))
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
      'Content-Type':      'text/plain; charset=utf-8',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
