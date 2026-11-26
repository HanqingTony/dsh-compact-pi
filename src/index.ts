/** Installable pi extension using DSH's compaction services and pi's log API. */
import type {
  ExtensionAPI,
  ExtensionContext,
} from '@earendil-works/pi-coding-agent'
import { DshBridge } from './bridge.ts'
import { loadConfig, saveSummaryModel, summaryModelLabel } from './config.ts'
import { describeSummary } from './compaction-info.ts'

export default function dcp(pi: ExtensionAPI): void {
  let bridge: DshBridge | undefined
  let displayContext: ExtensionContext | undefined
  pi.registerMarkdownTransformer(
    (markdown, context) => {
      if (context.messageType !== 'summary') return markdown
      return describeSummary(
        markdown,
        context.messageId,
        displayContext?.sessionManager,
      )
    },
    { messageTypes: ['summary'] },
  )
  pi.on('session_start', async (_event, ctx) => {
    bridge = undefined
    displayContext = ctx
    try {
      bridge = new DshBridge(pi, ctx, await loadConfig(ctx.cwd))
    } catch (error) {
      ctx.ui.notify(`dcp: initialization failed: ${String(error)}`, 'error')
    }
  })
  pi.on('input', (_event, ctx) => {
    if (!bridge?.isCompacting) return
    ctx.ui.notify(
      'dcp: compaction is in progress; input was not submitted. Please retry after it finishes.',
      'warning',
    )
    return { action: 'handled' }
  })
  pi.on('context', async (event, ctx) => {
    if (!bridge) return
    displayContext = ctx
    bridge.updateContext(ctx)
    const signal = ctx.signal
    // Pi can transform context once more after a tool was cancelled. The host
    // still owns the aborted signal; do not start maintenance or throw from this hook.
    if (signal?.aborted)
      return { messages: bridge.replay(event.messages) }
    try {
      return { messages: await bridge.context(event.messages, signal) }
    } catch (error) {
      if (!signal?.aborted)
        ctx.ui.notify(
          `dcp: context compaction failed: ${String(error)}`,
          'warning',
        )
      // Already committed checkpoints still apply if a new attempt failed.
      // The bridge's replay is exposed through a separate synchronous path.
      return { messages: bridge.replay(event.messages) }
    }
  })
  pi.on('session_before_compact', async (event, ctx) => {
    if (!bridge) return
    displayContext = ctx
    bridge.updateContext(ctx)
    // Threshold admission is handled by the DSH pressure policy in context.
    if (event.reason !== 'manual') return { cancel: true }
    try {
      const compaction = await bridge.prepareNative(event)
      return compaction ? { compaction } : { cancel: true }
    } catch (error) {
      ctx.ui.notify(
        `dcp: manual compaction failed: ${String(error)}`,
        'warning',
      )
      return { cancel: true }
    }
  })
  pi.on('agent_end', (event) => bridge?.noteAgentEnd(event))
  pi.on('session_compact', () => bridge?.recoveredByHost())
  pi.on('agent_before_settle', async (_event, ctx) => {
    if (!bridge) return
    displayContext = ctx
    bridge.updateContext(ctx)
    let continued = false
    try {
      if (bridge.overflowPending)
        continued = await bridge.recoverOverflow(ctx.signal)
    } catch (error) {
      ctx.ui.notify(
        `dcp: overflow recovery unavailable: ${String(error)}`,
        'warning',
      )
    }
    const entries = bridge.boundaryEntries()
    if (continued || entries.length) return { entries, continue: continued }
    return
  })
  pi.on('session_shutdown', async () => {
    await bridge?.close()
    bridge = undefined
    displayContext = undefined
  })
  pi.registerCommand('dcp-status', {
    description: 'Show DSH compaction policy and current branch checkpoints',
    handler: async (_args, ctx) => {
      ctx.ui.notify(bridge?.status() ?? 'dcp: not initialized', 'info')
    },
  })
  pi.registerCommand('dcp-summary-model', {
    description: 'Choose or reset the project default model for DCP summaries',
    handler: async (args, ctx) => {
      const active = bridge
      if (!active) {
        ctx.ui.notify('dcp: not initialized', 'warning')
        return
      }
      const option = args.trim()
      if (option && option !== 'reset') {
        ctx.ui.notify('Usage: /dcp-summary-model [reset]', 'warning')
        return
      }
      const status = active.summaryModelStatus()
      if (!option && !ctx.hasUI) {
        ctx.ui.notify(status, 'info')
        return
      }
      if (!ctx.isIdle() || active.isCompacting) {
        ctx.ui.notify('dcp: change the summary model while the agent is idle', 'warning')
        return
      }
      let model: { provider: string; id: string } | undefined
      if (!option) {
        const models = new Map(ctx.modelRegistry.getAvailable()
          .filter((candidate) => candidate.api !== 'pi-virtual')
          .map((candidate) => [`${candidate.provider}/${candidate.id}`, candidate]))
        const auto = 'Auto (restore upstream selection)'
        const choice = await ctx.ui.select(status, [auto, ...[...models.keys()].sort()])
        if (choice === undefined) return
        model = models.get(choice)
        if (!model && choice !== auto) return
      }
      if (bridge !== active || !ctx.isIdle() || active.isCompacting) return
      try {
        await saveSummaryModel(ctx.cwd, model)
      } catch (error) {
        ctx.ui.notify(`dcp: could not save summary model: ${String(error)}`, 'error')
        return
      }
      const label = summaryModelLabel(model ? {
        summarizationProvider: model.provider,
        summarizationModel: model.id,
      } : {})
      ctx.ui.notify(`dcp: saved summary model default: ${label}`, 'info')
      if (bridge === active && ctx.isIdle() && !active.isCompacting) await ctx.reload()
    },
  })
  pi.registerCommand('dcp-compact', {
    description: 'Compact with DeepSeek Harness (same as /compact)',
    handler: async (args, ctx) => {
      if (!bridge) {
        ctx.ui.notify('dcp: not initialized', 'warning')
        return
      }
      if (!ctx.isIdle()) {
        ctx.ui.notify(
          'dcp: manual compaction requires an idle agent',
          'warning',
        )
        return
      }
      if (args.trim()) {
        ctx.ui.notify(
          'dcp: /dcp-compact takes no arguments, matching DSH /compact',
          'warning',
        )
        return
      }
      ctx.compact({
        onComplete: () => ctx.ui.notify('dcp: DSH checkpoint saved', 'info'),
        onError: (error) => ctx.ui.notify(`dcp: ${error.message}`, 'error'),
      })
    },
  })
}
