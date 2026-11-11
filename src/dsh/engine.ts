/** Real DSH compaction engine wired to a pi host. */

import { Context } from '@deepseek-ai/cordis'
import BasicCompactionEngine from '@deepseek-ai/dsh-compaction-basic'
import { ToolResultPruner } from '@deepseek-ai/dsh-compaction-tool-result-pruner'
import type { Session } from '@deepseek-ai/dsh-session'
import { createLlm, type PiHost } from './llm.ts'
import { meter } from './meter.ts'
import { selectCompactableRange } from './range.ts'

export interface EngineBundle {
  ctx: any
  engine: any
  pruner: any
}

export function createEngine(host: PiHost): EngineBundle {
  const ctx: any = new Context()
  ctx.provide('llm', createLlm(host))
  ctx.provide('tokenMeter', meter)
  ctx.provide('sessions', { flush: async () => {} })
  const pruner = new ToolResultPruner(ctx)
  const modelMax = Number(host.model()?.maxTokens ?? 8192)
  const maxTokens = Math.max(1024, Math.min(65_536, Number.isFinite(modelMax) && modelMax > 0 ? modelMax : 8192))
  const engine = new BasicCompactionEngine(ctx, {
    auto: false,
    thresholdRatio: 0.8,
    headroomTokens: 65_536,
    retainRatio: 0.16,
    maxTokens,
    compactionRetries: 1,
    maxOverflowRetries: 1,
  })
  return { ctx, engine, pruner }
}

export function budget(host: PiHost): { contextWindow: number; threshold: number; retain: number } | undefined {
  const model = host.model()
  const contextWindow = Number(model?.contextWindow ?? 0)
  if (!contextWindow) return undefined
  const output = Number(model?.maxTokens ?? 8192)
  const headroom = 65_536
  const byRatio = Math.floor(contextWindow * 0.8)
  const byHeadroom = contextWindow - output - headroom
  const threshold = byHeadroom > 0 ? Math.min(byRatio, byHeadroom) : byRatio
  const retain = Math.max(0, Math.floor(0.16 * (contextWindow - output)))
  return { contextWindow, threshold, retain }
}

export interface CompactOutcome {
  result: any
  before: number
  after: number
}

export async function compactIfNeeded(
  engine: any,
  session: Session,
  host: PiHost,
  signal?: AbortSignal,
  force = false,
  pruner?: any,
): Promise<CompactOutcome | undefined> {
  const limits = budget(host)
  if (!limits) return undefined
  let before = meter.measure(session).totalTokens
  const emergency = limits.contextWindow > 0 && before > Math.floor(limits.contextWindow * 0.95)
  if (!force && !emergency && before < limits.threshold) return undefined

  // DSH's model-free pass: trim oversized tool outputs before choosing a
  // summary range. It may avoid the model call entirely.
  if (pruner && (force || emergency || before >= limits.threshold)) {
    pruner.pruneSession(session)
    before = meter.measure(session).totalTokens
    if (!force && !emergency && before < limits.threshold) return undefined
  }

  const range = selectCompactableRange(session, meter.measure(session), force || emergency ? 0 : limits.retain)
  if (!range) return undefined

  const model = host.model()
  const agent = {
    session,
    options: { provider: model?.provider, model: model?.id },
    runMaintenance: async (task: (signal: AbortSignal) => Promise<any>) => task(new AbortController().signal),
  }
  const result = await engine.compactRegion(range.start, range.end, agent, signal)
  return { result, before, after: meter.measure(session).totalTokens }
}
