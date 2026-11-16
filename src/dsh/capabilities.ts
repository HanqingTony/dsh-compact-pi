/** Explicit common subset: unsupported capabilities never get silently summarized. */
import type { AgentMessage } from '@earendil-works/pi-agent-core'
export class UnsupportedCapabilityError extends Error {
  readonly code = 'DCP_UNSUPPORTED_CAPABILITY'
}
export function assertCompatible(
  model: { api?: string } | undefined,
  messages: readonly AgentMessage[],
  instructions?: string,
): void {
  if (model?.api === 'pi-virtual')
    throw new UnsupportedCapabilityError(
      'dcp: virtual routing is outside the fixed-model compatibility scope',
    )
  if (instructions?.trim())
    throw new UnsupportedCapabilityError(
      'dcp: custom summary instructions are outside the upstream argument-free manual compact contract',
    )
  for (const message of messages) {
    const content = 'content' in message ? message.content : undefined
    if (
      Array.isArray(content) &&
      content.some(
        (block) =>
          !['text', 'thinking', 'toolCall', 'image'].includes(block.type),
      )
    )
      throw new UnsupportedCapabilityError(
        'dcp: unsupported attachment block; original context is preserved',
      )
    if (
      message.role === 'assistant' &&
      Array.isArray(content) &&
      content.some((block) => block.type === 'image')
    )
      throw new UnsupportedCapabilityError(
        'dcp: assistant image output is not supported by the pi chat history contract',
      )
    if (
      ![
        'system',
        'user',
        'assistant',
        'toolResult',
        'custom',
        'bashExecution',
        'branchSummary',
        'compactionSummary',
      ].includes(message.role)
    )
      throw new UnsupportedCapabilityError(
        `dcp: unsupported message role ${message.role}`,
      )
  }
}
