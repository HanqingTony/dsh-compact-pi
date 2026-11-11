/** DSH LLM seam backed by pi's model registry. */

import type { DshContentBlock, DshMessage } from './messages.ts'

export interface PiHost {
  model(): any
  findModel(provider?: string, model?: string): any
  complete(model: any, context: any, options: any): Promise<any>
  systemPrompt(): string
}

function textOf(content: any): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((block: any) => block?.type === 'text')
    .map((block: any) => String(block.text ?? ''))
    .join('\n')
}

function dshToPiBlock(block: DshContentBlock): any {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: String(block.text ?? '') }
    case 'reasoning':
      return { type: 'thinking', thinking: String(block.text ?? '') }
    case 'tool-call':
      return {
        type: 'toolCall',
        id: String(block.id ?? ''),
        name: String(block.name ?? ''),
        arguments: safeJson(block.arguments),
      }
    case 'image':
      return { type: 'image', data: block.data, mimeType: block.mimeType }
    default:
      return undefined
  }
}

function safeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function dshMessageToPi(message: DshMessage): any {
  switch (message.role) {
    case 'user':
      return { role: 'user', content: (message.content ?? []).map(dshToPiBlock).filter(Boolean) }
    case 'assistant':
      return { role: 'assistant', content: (message.content ?? []).map(dshToPiBlock).filter(Boolean) }
    case 'tool': {
      const text = textOf(message.content)
      return {
        role: 'toolResult',
        toolCallId: String(message.toolCallId ?? message.source?.callId ?? ''),
        toolName: '',
        content: text ? [{ type: 'text', text }] : [],
        isError: message.isError === true,
      }
    }
    default:
      return undefined
  }
}

function usageToDsh(usage: any): any {
  if (!usage) return undefined
  return {
    inputTokens: Number(usage.input ?? usage.inputTokens ?? 0),
    outputTokens: Number(usage.output ?? usage.outputTokens ?? 0),
    cacheReadTokens: Number(usage.cacheRead ?? usage.cacheReadTokens ?? 0),
    cacheWriteTokens: Number(usage.cacheWrite ?? usage.cacheWriteTokens ?? 0),
    reasoningTokens: Number(usage.reasoning ?? 0),
    totalTokens: Number(usage.totalTokens ?? 0),
  }
}

/**
 * DSH `ctx.llm.stream(options)` replacement. The compaction backend calls it
 * with the replayed prefix + instruction; we forward the conversation to pi's
 * model registry and re-emit the answer as DSH stream chunks so the real
 * `summarizeWithLlm` code path (prompt, framing, text projection) is preserved.
 */
export function createLlm(host: PiHost): any {
  return {
    async *stream(options: any): AsyncGenerator<any> {
      const model = host.findModel(options.provider, options.model) ?? host.model()
      if (!model) throw new Error('dsh-pi: no pi model available for summarization')

      const messages: any[] = []
      let systemPrompt = ''
      for (const message of options.messages ?? []) {
        if (message.role === 'system') {
          systemPrompt += `${textOf(message.content)}\n`
          continue
        }
        const mapped = dshMessageToPi(message)
        if (mapped) messages.push(mapped)
      }
      const tools = Array.isArray(options.tools)
        ? options.tools.map((tool: any) => ({ name: tool.name, description: tool.description, parameters: tool.parameters }))
        : undefined

      let response: any
      try {
        response = await host.complete(
          model,
          {
            systemPrompt: systemPrompt.trim() || host.systemPrompt(),
            messages,
            ...(tools && tools.length > 0 ? { tools } : {}),
          },
          {
            maxTokens: options.maxTokens,
            signal: options.signal,
            sessionId: options.sessionId,
            cacheRetention: 'short',
          },
        )
      } catch (error) {
        throw error
      }
      if (response?.stopReason === 'error' || response?.stopReason === 'aborted') {
        throw new Error(response.errorMessage ?? `dsh-pi: summarization stopped: ${response.stopReason}`)
      }

      const text = Array.isArray(response?.content)
        ? response.content.filter((block: any) => block?.type === 'text').map((block: any) => String(block.text ?? '')).join('')
        : ''
      if (!text.trim()) throw new Error('dsh-pi: summarization produced no text')

      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'block-end', index: 0, block: { type: 'text', text } }
      const usage = usageToDsh(response?.usage)
      if (usage) yield { type: 'usage', usage }
      yield {
        type: 'finish',
        reason: response?.stopReason === 'length' ? { kind: 'max-tokens' } : { kind: 'stop' },
      }
    },

    async resolveModelInfo(provider: string, modelId: string): Promise<any> {
      const model = host.findModel(provider, modelId) ?? host.model()
      return {
        context: model?.contextWindow ? { contextWindow: model.contextWindow } : undefined,
        defaultMaxTokens: model?.maxTokens,
      }
    },
  }
}
