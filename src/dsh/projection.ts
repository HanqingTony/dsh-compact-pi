/** Project the DSH session surface back into pi model messages. */

import type { Session } from '@deepseek-ai/dsh-session'
import { dshMessageToPi, type PiMessage } from './messages.ts'

export function projectSurface(session: Session): PiMessage[] {
  const toolNames = new Map<string, string>()
  for (const seq of session.surface.nodes) {
    const event = session.eventAt(seq)
    const message: any = event ? session.deriveEventMessage(event) : undefined
    if (message?.role !== 'assistant') continue
    for (const block of message.content ?? []) {
      if (block?.type === 'tool-call' && block.id) toolNames.set(String(block.id), String(block.name ?? ''))
    }
  }

  const out: PiMessage[] = []
  for (const seq of session.surface.nodes) {
    const event = session.eventAt(seq)
    if (!event) continue
    const message = session.deriveEventMessage(event)
    if (!message) continue
    const mapped = dshMessageToPi(message as any, event.time, toolNames)
    if (mapped) out.push(mapped)
  }
  return out
}
