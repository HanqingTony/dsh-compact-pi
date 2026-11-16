/** DSH transactions over exact pi request snapshots; pi owns every durable write. */
import { createHash } from 'node:crypto'
import path from 'node:path'
import { homedir } from 'node:os'
import {
  IMAGE_OFFLOAD_REQUIRED_CODE,
  LlmError,
} from '../vendor/dsh-runtime.mjs'
import packageInfo from '../package.json' with { type: 'json' }
import dshInfo from '../vendor/manifest.json' with { type: 'json' }
import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { convertToLlm } from '../vendor/pi-messages.mjs'
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionBeforeCompactEvent,
  CompactionResult,
  SessionBoundaryDraft,
} from '@earendil-works/pi-coding-agent'
import { createSyncState, syncPiEntries, closeTurn } from './dsh/sync.ts'
import {
  createEngine,
  executeCompaction,
  enterSession,
  type EngineBundle,
  type CompatibleAgent,
  budget,
  completionBudget,
} from './dsh/engine.ts'
import { dshMessageToPi } from './dsh/messages.ts'
import { assertCompatible } from './dsh/capabilities.ts'
import type { PiHost } from './dsh/llm.ts'
import type { DcpConfig } from './config.ts'
import type { DshEvent } from '../vendor/dsh-runtime.mjs'

import {
  compactionInfo,
  compactionDetails,
  type CompactionInfo,
} from './compaction-info.ts'

export const JOURNAL = 'dcp/transaction-v1'
type Slot = { keep: number } | { message: AgentMessage; origin?: number }
export interface Transaction {
  version: 1
  createdAt: number
  before: string[]
  after: Slot[]
  tokensBefore: number
  tokensAfter: number
  events?: DshEvent[]
  info?: CompactionInfo
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([key, value]) => key !== 'timestamp' && value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${JSON.stringify(key)}:${canonical(value)}`)
      .join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
export function fingerprint(message: AgentMessage): string {
  return createHash('sha256').update(canonical(message)).digest('hex')
}
export function replay(
  messages: readonly AgentMessage[],
  records: readonly Transaction[],
): AgentMessage[] {
  return replayWithTransactions(messages, records).messages
}

function replayWithTransactions(
  messages: readonly AgentMessage[],
  records: readonly Transaction[],
) {
  let current = [...messages]
  let origins: (number | undefined)[] = messages.map((_, index) => index)
  const applied: Transaction[] = []
  for (const record of records) {
    if (record.version !== 1 || record.before.length > current.length) continue
    if (
      !record.before.every(
        (hash, index) => hash === fingerprint(current[index]!),
      )
    )
      continue
    applied.push(record)
    const prefix = record.after.map((slot) =>
      'keep' in slot ? current[slot.keep]! : slot.message,
    )
    origins = [
      ...record.after.map((slot) =>
        'keep' in slot
          ? origins[slot.keep]
          : slot.origin === undefined
            ? undefined
            : origins[slot.origin],
      ),
      ...origins.slice(record.before.length),
    ]
    current = [...prefix, ...current.slice(record.before.length)]
  }
  return { messages: current, applied, origins }
}

export class DshBridge {
  private ctx: ExtensionContext
  private readonly pi: Pick<
    ExtensionAPI,
    'appendEntry' | 'getAllTools' | 'getActiveTools'
  >
  private readonly config: DcpConfig
  private running = false
  private bundle: Promise<EngineBundle> | undefined
  private agent: CompatibleAgent | undefined
  private agentLeaf: string | null | undefined
  private lastTokens = 0
  overflowPending = false
  ready = true
  get isCompacting(): boolean {
    return this.running
  }

  constructor(
    pi: Pick<ExtensionAPI, 'appendEntry' | 'getAllTools' | 'getActiveTools'>,
    ctx: ExtensionContext,
    config: DcpConfig = { policy: {}, audit: true },
  ) {
    this.pi = pi
    this.ctx = ctx
    this.config = config
  }
  updateContext(ctx: ExtensionContext): void {
    this.ctx = ctx
  }
  private records(): Transaction[] {
    // Branch membership is authoritative. A checkpoint from an abandoned branch
    // must never affect requests on the branch currently selected in pi.
    return this.ctx.sessionManager.getBranch().flatMap((entry) => {
      if (
        entry.type !== 'custom' ||
        ![JOURNAL, 'zcp/transaction-v1'].includes(entry.customType)
      )
        return []
      const record = entry.data as Transaction | undefined
      if (record?.version !== 1) return []
      if (
        !Array.isArray(record.before) ||
        !record.before.every((hash) => typeof hash === 'string') ||
        !Array.isArray(record.after) ||
        !record.after.every(
          (slot) =>
            slot &&
            (('keep' in slot &&
              Number.isInteger(slot.keep) &&
              slot.keep >= 0 &&
              slot.keep < record.before.length) ||
              ('message' in slot &&
                slot.message &&
                typeof slot.message.role === 'string')),
        )
      )
        throw new Error('dcp: malformed transaction in session log')
      return [record]
    })
  }
  private host(): PiHost {
    return {
      attachmentHome: () =>
        path.join(
          this.ctx.sessionManager.getSessionFile()
            ? path.dirname(this.ctx.sessionManager.getSessionFile()!)
            : (process.env.PI_CODING_AGENT_DIR ??
                path.join(homedir(), '.pi/agent')),
          '.dcp-assets',
        ),
      notify: (message, level) => this.ctx.ui.notify(message, level),
      model: () => this.ctx.model,
      findModel: (provider, model) =>
        provider && model
          ? this.ctx.modelRegistry.find(provider, model)
          : undefined,
      complete: (model, context, options) =>
        this.ctx.modelRegistry.complete(model, context, options),
      systemPrompt: () => this.ctx.getSystemPrompt(),
    }
  }
  private snapshotMessages(): AgentMessage[] {
    return this.ctx.sessionManager
      .buildSessionProjection()
      .messages.filter((message) => message.role !== 'system')
  }

  /** Runs only over a captured request. Never opens or rewrites pi's session file. */
  private async run(
    input: readonly AgentMessage[],
    signal: AbortSignal | undefined,
    force: boolean,
    instructions?: string,
    trigger: CompactionInfo['trigger'] = force ? 'manual' : 'pressure',
  ) {
    assertCompatible(this.ctx.model, input, instructions)
    if (this.running) throw new Error('dcp: compaction already in progress')
    this.running = true
    const started = performance.now()
    const baseSession = this.ctx.sessionManager.getSessionId()
    const baseLeaf = this.ctx.sessionManager.getLeafId()
    if (
      this.agentLeaf &&
      !this.ctx.sessionManager
        .getBranch()
        .some((entry) => entry.id === this.agentLeaf)
    )
      this.agent = undefined
    this.agentLeaf = baseLeaf
    const host = this.host()
    const bundle = await (this.bundle ??= createEngine(
      host,
      this.config.policy,
    ).catch((error) => {
      this.running = false
      this.bundle = undefined
      throw error
    }))
    let leave: (() => void) | undefined
    const operationSignal = signal ?? new AbortController().signal
    try {
      operationSignal.throwIfAborted()
      const session = bundle.sessions.prepare(
        this.ctx.sessionManager.getSessionId(),
        {
          meta: { cwd: this.ctx.cwd, isSeeded: false, delegationDepth: 0 },
        },
      )
      leave = enterSession(bundle, session)
      const state = createSyncState()
      syncPiEntries(
        session,
        [
          {
            type: 'message',
            id: 'system',
            message: { role: 'system', content: host.systemPrompt() },
          },
        ],
        state,
      )
      const model = host.model()
      if (!model) throw new Error('dcp: select a model before compacting')
      const active = new Set(this.pi.getActiveTools())
      const tools = this.pi
        .getAllTools()
        .filter((tool) => active.has(tool.name))
        .map(({ name, description, parameters }) => ({
          name,
          description,
          parameters,
        }))
      // pi tool schemas carry TypeBox runtime metadata (including non-enumerable
      // fields). DSH accepts plain JSON only; persist the same wire representation
      // that pi serializes for providers, rather than the live schema objects.
      session.append(
        'request/header',
        JSON.parse(
          JSON.stringify({
            header: {
              config: {
                provider: model.provider,
                model: model.id,
                maxTokens: completionBudget(host),
              },
              ...(tools.length ? { tools } : {}),
            },
            reason: 'initial',
          }),
        ),
      )
      const usageAfter = Math.max(
        0,
        ...this.records().map((record) => record.createdAt ?? 0),
      )
      const entries = input.map((message, index) => {
        let mapped = convertToLlm([message])[0] ?? {
          role: 'user',
          content: [],
          timestamp: 0,
        }
        // Provider usage predating a replacement prices the old transcript.
        // The upstream meter can only reuse samples for the current envelope.
        if (
          mapped.role === 'assistant' &&
          (mapped.timestamp <= usageAfter ||
            mapped.provider !== model.provider ||
            mapped.model !== model.id)
        )
          mapped = {
            ...mapped,
            usage: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                total: 0,
              },
            },
          }
        return { type: 'message', id: `input-${index}`, message: mapped }
      })
      await bundle.images.prepare(
        entries.map((entry) => entry.message),
        operationSignal,
      )
      syncPiEntries(session, entries, state, {
        imageToDsh: bundle.images.toDsh,
      })
      const originalSeqs = new Set(session.surface.nodes)
      const tokensBefore = bundle.meter.measure(session).totalTokens
      let failure: unknown
      let outcome: Awaited<ReturnType<typeof executeCompaction>> | undefined
      let persisted: Transaction | undefined
      const assertBranch = () => {
        if (
          this.ctx.model?.provider !== model.provider ||
          this.ctx.model?.id !== model.id
        )
          throw new Error(
            'dcp: model changed during compaction; only a fixed route is supported',
          )
        const branch = this.ctx.sessionManager.getBranch()
        if (
          baseSession !== this.ctx.sessionManager.getSessionId() ||
          (baseLeaf && !branch.some((entry) => entry.id === baseLeaf))
        )
          throw new Error('dcp: active branch changed during compaction')
        const added = baseLeaf
          ? branch.slice(branch.findIndex((entry) => entry.id === baseLeaf) + 1)
          : branch
        if (
          added.some((entry) =>
            [
              'message',
              'custom_message',
              'context_edit',
              'compaction',
              'branch_summary',
            ].includes(entry.type),
          )
        )
          throw new Error(
            'dcp: context changed during compaction; concurrent input is outside the compatibility scope',
          )
      }
      const render = () => {
        assertBranch()
        const names = new Map<string, string>()
        for (const message of input)
          if (message.role === 'assistant')
            for (const block of message.content)
              if (block.type === 'toolCall') names.set(block.id, block.name)
        const after: Slot[] = []
        const output: AgentMessage[] = []
        const origins: (number | undefined)[] = []
        for (const seq of session.surface.nodes) {
          const event = session.eventAt(seq)!
          const message = session.deriveEventMessage(event)
          if (!message || message.role === 'system') continue
          const match = /^input-(\d+)$/.exec(message.id ?? '')
          const index = match ? Number(match[1]) : undefined
          if (
            index !== undefined &&
            originalSeqs.has(seq) &&
            !message.content.some(
              (block: any) => block.type === 'image' && block.offloaded,
            )
          ) {
            after.push({ keep: index })
            output.push(input[index]!)
            origins.push(index)
          } else {
            const mapped = dshMessageToPi(
              message,
              event.time,
              names,
              bundle.images.toPi,
            ) as AgentMessage | undefined
            if (!mapped) throw new Error(`dcp: cannot project ${event.type}`)
            after.push({
              message: mapped,
              ...(index === undefined ? {} : { origin: index }),
            })
            output.push(mapped)
            origins.push(index)
          }
        }
        const changed =
          input.length !== output.length ||
          input.some(
            (message, index) =>
              fingerprint(message) !== fingerprint(output[index]!),
          )
        const events = session.snapshotEvents()
        const transaction: Transaction | undefined = changed
          ? {
              version: 1,
              createdAt: Date.now(),
              before: input.map(fingerprint),
              after,
              tokensBefore: outcome?.before ?? tokensBefore,
              tokensAfter: bundle.meter.measure(session).totalTokens,
              info: compactionInfo(
                {
                  trigger,
                  tokensBefore: outcome?.before ?? tokensBefore,
                  tokensAfter: bundle.meter.measure(session).totalTokens,
                  messagesBefore: input.length,
                  messagesAfter: output.length,
                  durationMs: performance.now() - started,
                },
                events,
              ),
              ...(this.config.audit ? { events } : {}),
            }
          : undefined
        return {
          messages: output,
          origins,
          transaction: persisted ?? transaction,
          failure,
          events,
          outcome,
          persisted: Boolean(persisted),
        }
      }
      bundle.flush = async () => {
        const result = render()
        if (result.transaction) {
          this.pi.appendEntry(JOURNAL, result.transaction)
          persisted = result.transaction
        }
      }
      if (!this.agent)
        this.agent = {
          session,
          options: { provider: model.provider, model: model.id },
          runMaintenance: (task) => task(operationSignal),
        }
      this.agent.session = session
      this.agent.options = { provider: model.provider, model: model.id }
      // The bridge and pi compaction controller already own the exclusive slot.
      // We deliberately do not emulate DSH's queue-during-maintenance feature.
      this.agent.runMaintenance = (task) => task(operationSignal)
      if (trigger === 'manual') closeTurn(session, state)
      try {
        outcome = await executeCompaction(
          bundle,
          this.agent,
          trigger,
          operationSignal,
        )
        // This is the adapter's request-admission failure, handled by the unmodified
        // upstream agent/request-error listener. Each pass must make durable progress.
        while (trigger !== 'manual') {
          operationSignal.throwIfAborted()
          const surface = session.surface.nodes
            .map((seq) => session.deriveEventMessage(session.eventAt(seq)!))
            .filter(Boolean)
          try {
            bundle.images.assertRequest(surface, model)
            break
          } catch (error) {
            if (
              !(error instanceof LlmError) ||
              error.code !== IMAGE_OFFLOAD_REQUIRED_CODE
            )
              throw error
            const revision = session.seq
            const action = await bundle.ctx.waterfall(
              'agent/request-error',
              {
                agent: this.agent,
                signal: operationSignal,
                failure: error.failure,
              },
              async () => ({ kind: 'throw' }),
            )
            if (action?.kind !== 'retry' || session.seq === revision)
              throw error
          }
        }
      } catch (error) {
        failure = error
      }
      const result = render()
      if (operationSignal.aborted) {
        // Upstream offload/prune decisions already committed remain durable on cancellation.
        if (result.transaction && !result.persisted)
          this.pi.appendEntry(JOURNAL, result.transaction)
        operationSignal.throwIfAborted()
      }
      this.lastTokens = bundle.meter.measure(session).totalTokens
      if (failure && !result.transaction) throw failure
      return result
    } finally {
      this.running = false
      bundle.flush = undefined
      leave?.()
    }
  }

  replay(messages: readonly AgentMessage[]): AgentMessage[] {
    return replay(messages, this.records())
  }

  async context(
    messages: readonly AgentMessage[],
    signal?: AbortSignal,
  ): Promise<AgentMessage[]> {
    const current = replay(messages, this.records())
    const result = await this.run(current, signal, false)
    if (result.transaction && !result.persisted)
      this.pi.appendEntry(JOURNAL, result.transaction)
    if (result.failure)
      this.ctx.ui.notify(
        `dcp: kept committed context changes; operation failed: ${String(result.failure)}`,
        'warning',
      )
    return result.messages
  }

  /** Manual/host compaction is committed as a normal pi compaction entry. */
  async prepareNative(
    event: SessionBeforeCompactEvent,
  ): Promise<CompactionResult | undefined> {
    const projection = this.ctx.sessionManager.buildSessionProjection()
    const raw: AgentMessage[] = projection.messages.filter(
      (message) => message.role !== 'system',
    )
    const current = replay(raw, this.records())
    const result = await this.run(
      current,
      event.signal,
      true,
      event.customInstructions,
      event.reason === 'overflow' ? 'overflow' : 'manual',
    )
    if (result.failure) {
      if (
        result.transaction &&
        !result.persisted &&
        (result.failure as { code?: string }).code !== 'persistence'
      )
        this.pi.appendEntry(JOURNAL, result.transaction)
      throw result.failure
    }
    const firstOriginal = result.origins.findIndex(
      (index) => index !== undefined,
    )
    if (!result.transaction || firstOriginal <= 0) return undefined
    const kept = result.messages[firstOriginal]!
    // The retained boundary must refer to a real pi entry, never to a synthetic
    // checkpoint. Content hashes survive ordinary projection/reload cloning.
    const hash = fingerprint(kept)
    const owner = projection.entries.find((entry) =>
      entry.messages.some((message) => fingerprint(message) === hash),
    )
    if (!owner)
      throw new Error(
        'dcp: retained boundary no longer belongs to the current pi projection',
      )
    const summary = convertToLlm(result.messages.slice(0, firstOriginal))
      .map((message) =>
        typeof message.content === 'string'
          ? message.content
          : message.content
              .filter((block) => block.type === 'text')
              .map((block) => block.text)
              .join('\n'),
      )
      .join('\n\n')
    return {
      summary,
      firstKeptEntryId: owner.sourceEntry.id,
      tokensBefore: event.preparation.tokensBefore,
      estimatedTokensAfter: result.transaction.tokensAfter,
      details: {
        ...compactionDetails(result.transaction.info),
        ...(this.config.audit ? { events: result.events } : {}),
      },
    }
  }

  /** Fold request-time changes into pi's native projection at a safe boundary. */
  boundaryEntries(): SessionBoundaryDraft[] {
    const projection = this.ctx.sessionManager.buildSessionProjection()
    const raw: AgentMessage[] = projection.messages.filter(
      (message) => message.role !== 'system',
    )
    const replayed = replayWithTransactions(raw, this.records())
    const current = replayed.messages
    const checkpoint = [...replayed.applied]
      .reverse()
      .find((record) =>
        record.info
          ? record.info.summaries > 0
          : record.after.some(
              (slot) =>
                'message' in slot &&
                JSON.stringify(slot.message).includes('<compacted-summary>'),
            ),
      )
    const drafts: SessionBoundaryDraft[] = []
    for (const entry of projection.entries) {
      if (entry.sourceEntry.type !== 'message') continue
      for (const original of entry.messages) {
        if (
          !['user', 'assistant', 'toolResult', 'custom'].includes(
            original.role,
          ) ||
          !('content' in original)
        )
          continue
        const rawIndex = raw.indexOf(original)
        const replacementIndex = replayed.origins.indexOf(rawIndex)
        // Older journals do not record origins for rewritten tool results.
        const replacement =
          replacementIndex >= 0
            ? current[replacementIndex]
            : original.role === 'toolResult'
              ? current.find(
                  (message) =>
                    message.role === 'toolResult' &&
                    message.toolCallId === original.toolCallId,
                )
              : undefined
        if (
          replacement &&
          'content' in replacement &&
          fingerprint(replacement) !== fingerprint(original)
        )
          drafts.push({
            type: 'context_edit',
            targetId: entry.sourceEntry.id,
            replacement: { content: replacement.content },
          })
      }
    }
    const head = current[0]
    const firstKept = current.findIndex((message) => raw.includes(message))
    if (
      head?.role === 'user' &&
      JSON.stringify(head.content).includes('<compacted-summary>') &&
      firstKept > 0
    ) {
      const kept = current[firstKept]!
      const owner = projection.entries.find((entry) =>
        entry.messages.includes(kept),
      )
      if (owner && owner.sourceEntry.type !== 'compaction') {
        const summary = convertToLlm(current.slice(0, firstKept))
          .map((message) =>
            typeof message.content === 'string'
              ? message.content
              : message.content
                  .filter((block) => block.type === 'text')
                  .map((block) => block.text)
                  .join('\n'),
          )
          .join('\n\n')
        drafts.push({
          type: 'compaction',
          summary,
          firstKeptEntryId: owner.sourceEntry.id,
          details: {
            ...compactionDetails(checkpoint?.info),
            source: 'request-checkpoint',
          },
        })
      }
    }
    return drafts
  }

  noteAgentEnd(event: { messages: AgentMessage[] }): void {
    const message = [...event.messages]
      .reverse()
      .find((message) => message.role === 'assistant')
    if (!message || message.role !== 'assistant') return
    const overflow =
      message.stopReason === 'error' &&
      /context.{0,20}(window|length|limit)|too many tokens|maximum context|token limit|context_length_exceeded|input.{0,10}too long/i.test(
        message.errorMessage ?? '',
      )
    this.overflowPending = overflow
    if (!overflow && this.bundle && this.agent)
      void this.bundle.then((bundle) =>
        bundle.ctx.emit('agent/status', { agent: this.agent, status: 'idle' }),
      )
  }
  recoveredByHost(): void {
    this.overflowPending = false
  }
  async recoverOverflow(signal?: AbortSignal): Promise<boolean> {
    if (!this.overflowPending) return false
    this.overflowPending = false
    const current = replay(this.snapshotMessages(), this.records())
    const result = await this.run(current, signal, true, undefined, 'overflow')
    if (!result.transaction || !result.outcome?.retry) return false
    if (!result.persisted) this.pi.appendEntry(JOURNAL, result.transaction)
    return true
  }
  async close(): Promise<void> {
    if (this.bundle) {
      const bundle = await this.bundle
      await bundle.ctx.fiber.dispose()
      this.bundle = undefined
      this.agent = undefined
    }
  }
  status(): string {
    let policy: string
    try {
      const limits = budget(this.host(), this.config.policy)
      policy = limits
        ? `window=${limits.contextWindow} threshold=${limits.threshold} retain=${limits.retain}`
        : 'no model selected'
    } catch (error) {
      policy = `policy unavailable: ${String(error)}; configure .pi/dcp.json for this model`
    }
    return `dcp v${packageInfo.dcpVersion} (dsh-compact-pi) | DSH ${dshInfo.version} (${dshInfo.commit.slice(0, 12)})\ncheckpoints=${this.records().length}; tokens~${this.lastTokens}\n${policy}\nCompatibility: fixed model; text/tools/images; no input during compaction\nHost: real Cordis plugins, unmodified source snapshot\nPersistence: pi append-only log (current branch)`
  }
}
