/**
 * pi <-> DSH message/event mapping.
 *
 * The pi session is the source of new turns; the DSH Session is the
 * compaction source of truth. This module only maps the subset needed for
 * compaction: system/user/assistant/tool messages and tool calls.
 */

export type PiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; thinkingSignature?: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'toolCall'; id: string; name: string; arguments: unknown }

export type PiMessage =
  | { role: 'user'; content: string | PiContentBlock[]; timestamp?: number }
  | { role: 'assistant'; content: PiContentBlock[]; timestamp?: number }
  | { role: 'toolResult'; toolCallId: string; toolName?: string; content: PiContentBlock[]; isError?: boolean; timestamp?: number }
  | { role: 'system'; content: string; timestamp?: number }

export interface DshContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  arguments?: string
  data?: string
  mimeType?: string
  [key: string]: unknown
}

export interface DshMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  id?: string
  content: DshContentBlock[]
  source?: Record<string, unknown>
  toolCallId?: string
  isError?: boolean
  [key: string]: unknown
}

export function newId(): string {
  return globalThis.crypto.randomUUID()
}

export function piContentToDsh(content: PiMessage['content']): DshContentBlock[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  if (!Array.isArray(content)) return [{ type: 'text', text: String(content ?? '') }]
  const out: DshContentBlock[] = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    switch (block.type) {
      case 'text':
        out.push({ type: 'text', text: block.text })
        break
      case 'thinking':
        out.push({ type: 'reasoning', text: block.thinking })
        break
      case 'toolCall':
        out.push({
          type: 'tool-call',
          id: block.id,
          name: block.name,
          arguments: typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments ?? {}),
        })
        break
      case 'image':
        out.push({ type: 'image', data: block.data, mimeType: block.mimeType })
        break
      default:
        break
    }
  }
  return out
}

export function dshContentToPi(content: DshContentBlock[] | undefined): PiContentBlock[] {
  const out: PiContentBlock[] = []
  for (const block of content ?? []) {
    if (!block || typeof block !== 'object') continue
    switch (block.type) {
      case 'text':
        out.push({ type: 'text', text: String(block.text ?? '') })
        break
      case 'reasoning':
        out.push({ type: 'thinking', thinking: String(block.text ?? '') })
        break
      case 'tool-call': {
        let args: unknown = {}
        try {
          args = JSON.parse(String(block.arguments ?? '{}'))
        } catch {
          args = {}
        }
        out.push({ type: 'toolCall', id: String(block.id ?? ''), name: String(block.name ?? ''), arguments: args })
        break
      }
      case 'image':
        if (typeof block.data === 'string' && typeof block.mimeType === 'string') {
          out.push({ type: 'image', data: block.data, mimeType: block.mimeType })
        }
        break
      default:
        break
    }
  }
  return out
}

export function dshMessageToPi(message: DshMessage, time: number, toolNames?: Map<string, string>): PiMessage | undefined {
  switch (message.role) {
    case 'system':
      return undefined // pi replays its own prompt/tools
    case 'user':
      return { role: 'user', content: dshContentToPi(message.content), timestamp: time }
    case 'assistant':
      return {
        role: 'assistant',
        content: dshContentToPi(message.content),
        // pi's getContextUsage() calls calculateContextTokens(message.usage)
        // for every non-aborted/error assistant; a missing usage would crash it.
        api: 'dsh',
        provider: String(message.source?.provider ?? 'dsh'),
        model: String(message.source?.model ?? 'dsh'),
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: 'stop',
        timestamp: time,
      }
    case 'tool': {
      const text = (message.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => String(b.text ?? ''))
        .join('\n')
      return {
        role: 'toolResult',
        toolCallId: String(message.toolCallId ?? message.source?.callId ?? ''),
        toolName: toolNames?.get(String(message.toolCallId ?? message.source?.callId ?? '')) ?? '',
        content: text ? [{ type: 'text', text }] : [],
        isError: message.isError === true,
        timestamp: time,
      }
    }
    default:
      return undefined
  }
}
