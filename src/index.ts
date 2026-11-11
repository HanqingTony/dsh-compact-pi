/**
 * pi extension: run DSH's compaction engine on pi's context.
 *
 * Native pi compaction is cancelled; the DSH Session log is the compaction
 * source of truth, and its surface is projected back into pi's request.
 */

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { DshBridge } from './bridge.ts'

export default function dshCompaction(pi: ExtensionAPI): void {
  let bridge: DshBridge | undefined

  pi.on('session_start', async (_event, ctx) => {
    const next = new DshBridge(pi, ctx)
    try {
      await next.init()
      bridge = next
    } catch (error) {
      bridge = undefined
      const message = error instanceof Error ? error.message : String(error)
      try {
        ctx.ui?.notify?.(`[dsh-pi] init failed: ${message}`, 'error')
      } catch {
        // UI is optional in print/rpc modes.
      }
    }
  })

  // Turn off pi's native compaction. If the bridge is not ready we leave the
  // host behavior intact so a plugin failure does not strand the session.
  pi.on('session_before_compact', () => {
    return bridge?.ready ? { cancel: true } : undefined
  })

  pi.on('agent_end', (event) => {
    bridge?.noteAgentEnd(event)
  })

  // A failed provider request cannot be retried from the `context` hook. The
  // boundary is the only point where pi lets an extension request one more
  // provider pass, so compact there and ask for the continuation.
  pi.on('agent_before_settle', async (_event, ctx) => {
    if (!bridge?.overflowPending) return
    const recovered = await bridge.recoverOverflow()
    if (recovered) return { continue: true }
    return
  })

  pi.on('context', async (event, ctx) => {
    if (!bridge?.ready) return
    try {
      await bridge.sync()
      await bridge.compact(event.signal)
      const messages = bridge.messages()
      if (messages.length === 0) return
      return { messages }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      try {
        ctx.ui?.notify?.(`[dsh-pi] context failed: ${message}`, 'warning')
      } catch {
        // UI is optional.
      }
      // Returning undefined keeps pi's own projection for this request.
      return
    }
  })

  pi.on('session_shutdown', async () => {
    try {
      await bridge?.close()
    } catch {
      // Best effort; the next context/session will retry.
    }
  })

  pi.registerCommand('dsh-status', {
    description: 'Show the DSH compaction session state',
    handler: async (_args, ctx) => {
      ctx.ui?.notify?.(bridge?.status() ?? 'dsh-pi: not ready', 'info')
    },
  })

  pi.registerCommand('dsh-compact', {
    description: 'Force a DSH compaction now',
    handler: async (_args, ctx) => {
      if (!bridge?.ready) {
        ctx.ui?.notify?.('dsh-pi: not ready', 'warning')
        return
      }
      const outcome = await bridge.compact(undefined, true)
      if (outcome?.error) {
        ctx.ui?.notify?.(`dsh-pi: ${outcome.error}`, 'error')
        return
      }
      ctx.ui?.notify?.(
        outcome ? `dsh-pi: compacted ${outcome.before} -> ${outcome.after} tokens` : 'dsh-pi: nothing to compact',
        'info',
      )
    },
  })
}
