/** DSH LLM seam backed by pi's model registry. */

import { dshMessageToPi as mapMessage } from './messages.ts'
import { LlmError } from '../../vendor/dsh-runtime.mjs'
import type { ImageBridge } from './images.ts'

export interface PiHost {
  attachmentHome?(): string
  model(): any
  findModel(provider?: string, model?: string): any
  complete(model: any, context: any, options: any): Promise<any>
  notify?(message: string, level: 'warning' | 'error'): void
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
export function createLlm(host: PiHost, images?: ImageBridge): any {
  return {
    imageRequestPricing: () => undefined,
    async *stream(options: any): AsyncGenerator<any> {
      const model =
        host.findModel(options.provider, options.model) ??
        (host.model()?.provider === options.provider &&
        host.model()?.id === options.model
          ? host.model()
          : undefined)
      if (!model)
        throw new Error('dcp: no pi model available for summarization')

      options.signal?.throwIfAborted()
      const imageToPi = images
        ? await images.requestMapper(
            options.messages ?? [],
            model,
            options.signal,
          )
        : undefined
      const messages: any[] = []
      const systemPrompts: string[] = []
      for (const message of options.messages ?? []) {
        if (message.role === 'system') {
          systemPrompts.push(textOf(message.content))
          continue
        }
        const mapped = mapMessage(message, Date.now(), undefined, imageToPi)
        if (mapped) messages.push(mapped)
      }
      const tools = Array.isArray(options.tools)
        ? options.tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          }))
        : undefined

      const response = await host.complete(
        model,
        {
          systemPrompt: systemPrompts.join('\n\n') || host.systemPrompt(),
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
      options.signal?.throwIfAborted()
      if (
        response?.stopReason === 'error' ||
        response?.stopReason === 'aborted'
      ) {
        throw new Error(
          response.errorMessage ??
            `dcp: summarization stopped: ${response.stopReason}`,
        )
      }

      if (response?.content?.some((block: any) => block.type === 'image'))
        throw new LlmError(
          'compaction summary cannot contain image output',
          'UNSUPPORTED_CONTENT',
        )
      const text = Array.isArray(response?.content)
        ? response.content
            .filter((block: any) => block?.type === 'text')
            .map((block: any) => String(block.text ?? ''))
            .join('')
        : ''
      if (!text.trim()) throw new Error('dcp: summarization produced no text')

      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'block-end', index: 0, block: { type: 'text', text } }
      const usage = usageToDsh(response?.usage)
      if (usage) yield { type: 'usage', usage }
      yield {
        type: 'finish',
        reason:
          response?.stopReason === 'length'
            ? { kind: 'max-tokens' }
            : { kind: 'stop' },
      }
    },

    async resolveModelInfo(provider: string, modelId: string): Promise<any> {
      const model = host.findModel(provider, modelId) ?? host.model()
      return {
        context: model?.contextWindow
          ? { contextWindow: model.contextWindow }
          : undefined,
        defaultMaxTokens: model?.maxTokens,
      }
    },
  }
}
