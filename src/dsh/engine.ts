/** Real Cordis host: upstream plugins own all pressure, retention and retry policy. */
import {
  Context,
  LocalAttachmentStore,
  ImageOffloadPlugin,
  CONTEXT_WINDOW_EXCEEDED_CODE,
  BasicCompactionEngine,
  ToolResultPruner,
  TokenMeter,
  SessionProjectionRegistry,
  SessionStore,
  resolveConfig,
  resolveTargetPolicy,
  resolveCompactSpec,
  type Session,
  type Policy,
} from '../../vendor/dsh-runtime.mjs'
import { createLlm, type PiHost } from './llm.ts'
import { ImageBridge } from './images.ts'
import { homedir } from 'node:os'
import path from 'node:path'

export interface CompatibleAgent {
  session: Session
  options: { provider: string; model: string }
  runMaintenance<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T>
}
export interface EngineBundle {
  ctx: Context
  images: ImageBridge
  engine: BasicCompactionEngine
  pruner: ToolResultPruner
  meter: TokenMeter
  sessions: SessionStore
  /** Installed by the pi carrier for the currently exclusive operation. */
  flush?: (session: Session) => Promise<void>
}
export async function createEngine(
  host: PiHost,
  config: Policy = {},
): Promise<EngineBundle> {
  const ctx = new Context()
  try {
    if (host.notify)
      ctx.logger.exporter({
        levels: { default: 1 },
        export: (record: { type: string; args: unknown[] }) =>
          host.notify?.(
            `dcp: ${record.args.map(String).join(' ')}`,
            record.type === 'error' ? 'error' : 'warning',
          ),
      })
    await ctx.plugin(LocalAttachmentStore, {
      dshHome:
        host.attachmentHome?.() ??
        path.join(
          process.env.PI_CODING_AGENT_DIR ?? path.join(homedir(), '.pi/agent'),
          'dcp-assets',
        ),
    })
    const images = new ImageBridge(ctx.get('attachments'))
    // The plugins consume agent lifecycle events; pi retains ownership of the actual loop.
    ctx.provide('agents', new Map<string, CompatibleAgent>())
    await ctx.plugin({
      name: 'pi-compaction-llm',
      apply: (service: Context) =>
        service.provide('llm', createLlm(host, images)),
    })
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(ImageOffloadPlugin)
    await ctx.plugin(TokenMeter)
    await ctx.plugin(ToolResultPruner)
    await ctx.plugin(BasicCompactionEngine, config)
    const bundle: EngineBundle = {
      ctx,
      images,
      engine: ctx.get('compaction'),
      pruner: ctx.get('toolResultPruner'),
      meter: ctx.get('tokenMeter'),
      sessions: ctx.get('sessions'),
    }
    ctx.on('session/flush', async (session: Session) => {
      if (!bundle.flush)
        throw new Error(
          'dcp: no pi persistence carrier installed for this operation',
        )
      await bundle.flush(session)
    })
    return bundle
  } catch (error) {
    await ctx.fiber.dispose()
    throw error
  }
}
export function completionBudget(host: PiHost): number {
  return Number(host.model()?.maxTokens ?? 0)
}
export function budget(host: PiHost, config: Policy = {}) {
  const model = host.model()
  if (!model?.contextWindow) return undefined
  const spec = resolveCompactSpec(
    resolveTargetPolicy(resolveConfig(config), {
      provider: model.provider,
      model: model.id,
    }),
    Number(model.contextWindow),
    completionBudget(host),
  )
  return {
    contextWindow: Number(model.contextWindow),
    threshold: spec.thresholdTokens,
    retain: spec.retainTokens,
    maxOverflowRetries: spec.maxOverflowRetries,
  }
}
export function enterSession(
  bundle: EngineBundle,
  session: Session,
): () => void {
  const leave = bundle.sessions.enter(session)
  try {
    bundle.sessions.announce(session)
    return leave
  } catch (error) {
    leave()
    throw error
  }
}

/** Translate a pi operation into the upstream plugin's public event/command seam. */
export async function executeCompaction(
  bundle: EngineBundle,
  agent: CompatibleAgent,
  trigger: 'pressure' | 'manual' | 'overflow',
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const before = bundle.meter.measure(agent.session).totalTokens
  const revision = agent.session.seq
  let result,
    retry = false
  if (trigger === 'manual')
    result = await bundle.engine.compactNow(agent, signal)
  else if (trigger === 'pressure') {
    await bundle.ctx.waterfall(
      'agent/pre-step',
      { agent, signal },
      async () => ({ kind: 'continue' }),
    )
  } else {
    const action = await bundle.ctx.waterfall(
      'agent/request-error',
      {
        agent,
        signal,
        failure: {
          code: CONTEXT_WINDOW_EXCEEDED_CODE,
          message: 'Provider confirmed context window exceeded',
        },
      },
      async () => ({ kind: 'throw' }),
    )
    retry = action?.kind === 'retry'
  }
  return {
    result,
    retry,
    before,
    after: bundle.meter.measure(agent.session).totalTokens,
    changed: revision !== agent.session.seq,
  }
}
