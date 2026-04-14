import Anthropic from '@anthropic-ai/sdk'
import type { Response } from 'express'
import type { Message } from '../types'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const MODEL = () => process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-5'

/**
 * Stream a Claude response directly into the Express `res` object.
 * Content-Type must be set before calling this function.
 *
 * Handles both text-only and vision (image + text) inputs.
 */
export async function streamToResponse(opts: {
  system:       string
  messages:     Message[]
  res:          Response
  imageBase64?: string
  mimeType?:    string
}): Promise<void> {
  const { system, messages, res, imageBase64, mimeType } = opts

  type AnthropicMsg = Anthropic.Messages.MessageParam

  const anthropicMessages: AnthropicMsg[] = messages.slice(0, -1).map(m => ({
    role:    m.role,
    content: m.content,
  }))

  const lastMsg = messages[messages.length - 1]

  // Vision path — attach image to the final user message
  if (imageBase64 && mimeType && lastMsg?.role === 'user') {
    anthropicMessages.push({
      role: 'user',
      content: [
        {
          type:   'image',
          source: {
            type:         'base64',
            media_type:   mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data:         imageBase64,
          },
        },
        { type: 'text', text: lastMsg.content },
      ],
    })
  } else if (lastMsg) {
    anthropicMessages.push({ role: lastMsg.role, content: lastMsg.content })
  }

  const stream = getClient().messages.stream({
    model:      MODEL(),
    max_tokens: 2048,
    system,
    messages:   anthropicMessages,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      res.write(event.delta.text)
    }
  }
}
