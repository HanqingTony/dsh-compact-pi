/** Token measurement compatible with the subset compaction-basic consumes. */

import type { Session } from '@deepseek-ai/dsh-session'

export function estimateMessage(message: any): number {
  if (!message) return 0
  const text = JSON.stringify(message)
  return Math.max(1, Math.ceil(text.length / 4))
}

export function measure(session: Session): any {
  const nodes = session.surface.nodes.map((seq) => {
    const event = session.eventAt(seq)
    const message = event ? session.deriveEventMessage(event) : undefined
    const tokens = estimateMessage(message)
    return { seq, tokens, heuristicTokens: tokens }
  })
  return {
    nodes,
    totalTokens: nodes.reduce((sum, node) => sum + node.tokens, 0),
  }
}

export const meter = { measure, estimateMessage }
