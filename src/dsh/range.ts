/** DSH range selection, ported from compaction-basic/src/region.ts. */

import type { Session } from '@deepseek-ai/dsh-session'
import { toolPairingBalancedBefore } from '@deepseek-ai/dsh-compaction'

function isSystemHead(session: Session, seq: number): boolean {
  return session.eventAt(seq as any)?.type === 'system/message'
}

/**
 * Select the oldest balanced span while retaining `retainTokens` of the
 * newest surface. A system head at node 0 is never shadowed. Returns numeric
 * seqs (the caller brands them for DSH APIs).
 */
export function selectCompactableRange(
  session: Session,
  measurement: any,
  retainTokens: number,
): { start: number; end: number } | undefined {
  const priced = measurement.nodes as Array<{ seq: number; tokens: number }>
  if (priced.length === 0) return undefined

  const surface = session.surface.nodes as unknown as number[]
  if (surface.length !== priced.length || surface.some((seq, i) => seq !== priced[i]?.seq)) {
    throw new Error('dsh-pi: token measurement does not match the current surface')
  }
  const firstIdx = isSystemHead(session, surface[0]!) ? 1 : 0

  let accumulated = 0
  let keepFromIdx = priced.length
  for (let index = priced.length - 1; index >= 0; index -= 1) {
    accumulated += priced[index]!.tokens
    keepFromIdx = index
    if (accumulated >= retainTokens) break
  }
  if (keepFromIdx <= firstIdx) return undefined

  while (keepFromIdx > firstIdx) {
    if (toolPairingBalancedBefore(session, surface[keepFromIdx]! as any)) break
    keepFromIdx -= 1
  }
  if (keepFromIdx <= firstIdx) return undefined

  return { start: surface[firstIdx]!, end: surface[keepFromIdx - 1]! }
}
