/** pi extension bridge: hooks + DSH Session + sidecar. */

import { promises as fs } from 'node:fs'
import { createEngine, compactIfNeeded, budget, type EngineBundle } from './dsh/engine.ts'
import { meter } from './dsh/meter.ts'
import { projectSurface } from './dsh/projection.ts'
import { closeTurn, createSyncState, nextTurn, syncPiEntries, type SyncState } from './dsh/sync.ts'
import { dshFileFor, isDshFileSync, loadOrCreateSession, readDshFile, writeDshFile } from './dsh/store.ts'
import { restoreSession, type DshHeader } from './dsh/session.ts'
import type { PiHost } from './dsh/llm.ts'

interface BridgeFiles {
  dsh: string | undefined
  meta: string | undefined
}

function filesFor(sessionFile: string | undefined): BridgeFiles {
  const dsh = dshFileFor(sessionFile)
  return {
    dsh,
    meta: dsh ? `${dsh}.meta.json` : undefined,
  }
}

function makeHost(ctx: any): PiHost {
  return {
    model: () => ctx.model,
    findModel: (provider?: string, model?: string) => {
      if (provider && model) return ctx.modelRegistry.find(provider, model)
      return undefined
    },
    complete: (model: any, context: any, options: any) => ctx.modelRegistry.complete(model, context, options),
    systemPrompt: () => ctx.getSystemPrompt(),
  }
}

export class DshBridge {
  readonly pi: any
  private readonly ctx: any
  private readonly files: BridgeFiles
  private session: any
  private header: DshHeader | undefined
  private syncState: SyncState = createSyncState()
  private engine: EngineBundle | undefined
  private host: PiHost | undefined
  private lastEventCount = 0
  private errorNotified = false
  private nativeMode = false
  private piFile: string | undefined
  private dshMtime = 0
  private dshSize = 0
  ready = false
  loaded = false
  overflowPending = false

  constructor(pi: any, ctx: any) {
    this.pi = pi
    this.ctx = ctx
    const piFile = ctx.sessionManager.getSessionFile?.()
    this.piFile = piFile
    this.nativeMode = isDshFileSync(piFile)
    this.files = this.nativeMode ? { dsh: piFile, meta: undefined } : filesFor(piFile)
  }

  async init(): Promise<void> {
    const sessionId = this.ctx.sessionManager.getSessionId?.() ?? `pi-${Date.now()}`
    const cwd = this.ctx.cwd ?? this.ctx.sessionManager.getCwd?.()
    const loaded = await loadOrCreateSession(this.files.dsh, sessionId, cwd)
    this.session = loaded.session
    this.header = loaded.header
    this.loaded = loaded.loaded
    this.host = makeHost(this.ctx)
    this.engine = createEngine(this.host)
    this.syncState.turn = nextTurn(this.session)
    this.lastEventCount = this.session.snapshotEvents().length

    if (!loaded.loaded) {
      // Defer the first sync to the first `context` call: the system prompt is
      // not necessarily built yet during session_start, and the DSH system head
      // should carry the real prompt.
    } else {
      if (this.nativeMode) {
        // pi's core codec already wrote this file; the host entries are a
        // projection of it, not new material. Never replay them.
        for (const entry of this.entries()) {
          if (entry?.type === 'message' && entry.id) this.syncState.seen.add(entry.id)
        }
      } else {
        const meta = await this.readMeta()
        const entries = this.entries()
        if (meta?.syncedEntryIds?.length) {
          this.syncState.seen = new Set(meta.syncedEntryIds)
        } else {
          // A DSH file produced elsewhere: treat it as the source of truth and
          // do not replay the host session's existing messages into it.
          for (const entry of entries) {
            if (entry?.type === 'message' && entry.id) this.syncState.seen.add(entry.id)
          }
        }
      }
      this.lastEventCount = this.session.snapshotEvents().length
    }
    await this.refreshNativeStamp()
    this.ready = true
  }

  entries(): any[] {
    try {
      return this.ctx.sessionManager.buildContextEntries?.() ?? this.ctx.sessionManager.getEntries?.() ?? []
    } catch {
      return []
    }
  }

  async sync(): Promise<number> {
    if (!this.ready) return 0
    await this.maybeSwitchToNative()
    if (this.nativeMode) {
      await this.reloadIfChanged()
      return 0
    }
    const count = syncPiEntries(this.session, this.entries(), this.syncState, { systemPrompt: this.ctx.getSystemPrompt?.() })
    if (count > 0) await this.persist()
    return count
  }

  /**
   * pi creates the session file on the first persisted message, i.e. after
   * session_start. Detect the core codec's DSH file lazily and switch from the
   * plugin's sidecar to the single native log.
   */
  private async maybeSwitchToNative(): Promise<void> {
    if (this.nativeMode) return
    const file = this.ctx.sessionManager.getSessionFile?.() ?? this.piFile
    if (!file || !isDshFileSync(file)) return
    this.nativeMode = true
    this.piFile = file
    this.files = { dsh: file, meta: undefined }
    const parsed = await readDshFile(file)
    if (parsed) {
      this.session = restoreSession(parsed.header, parsed.events)
      this.header = parsed.header
      this.loaded = true
      this.syncState = createSyncState()
      this.syncState.turn = nextTurn(this.session)
      for (const entry of this.entries()) {
        if (entry?.type === 'message' && entry.id) this.syncState.seen.add(entry.id)
      }
      for (const seq of this.session.surface.nodes) {
        if (this.session.eventAt(seq)?.type === 'system/message') {
          this.syncState.systemSeq = Number(seq)
          break
        }
      }
      this.lastEventCount = this.session.snapshotEvents().length
    }
    await this.refreshNativeStamp()
  }

  private async refreshNativeStamp(): Promise<void> {
    if (!this.nativeMode || !this.files.dsh) return
    try {
      const stat = await fs.stat(this.files.dsh)
      this.dshMtime = stat.mtimeMs
      this.dshSize = stat.size
    } catch {
      // Missing file: stay at 0 so the next reload retries.
    }
  }

  private async reloadIfChanged(): Promise<void> {
    if (!this.nativeMode || !this.files.dsh) return
    let stat
    try {
      stat = await fs.stat(this.files.dsh)
    } catch {
      return
    }
    if (stat.mtimeMs === this.dshMtime && stat.size === this.dshSize) return
    const parsed = await readDshFile(this.files.dsh)
    if (!parsed) return
    this.session = restoreSession(parsed.header, parsed.events)
    this.header = parsed.header
    this.syncState = createSyncState()
    this.syncState.turn = nextTurn(this.session)
    for (const entry of this.entries()) {
      if (entry?.type === 'message' && entry.id) this.syncState.seen.add(entry.id)
    }
    for (const seq of this.session.surface.nodes) {
      if (this.session.eventAt(seq)?.type === 'system/message') {
        this.syncState.systemSeq = Number(seq)
        break
      }
    }
    this.dshMtime = stat.mtimeMs
    this.dshSize = stat.size
    this.lastEventCount = this.session.snapshotEvents().length
  }

  /** Watch the failed run for a provider-confirmed context overflow. */
  noteAgentEnd(event: any): void {
    const messages = Array.isArray(event?.messages) ? event.messages : []
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i]
      if (message?.role !== 'assistant') continue
      const text = String(message.errorMessage ?? '')
      if (message.stopReason === 'length' || /context (window|length)|too many tokens|maximum context|token limit|overflow|length limit/i.test(text)) {
        this.overflowPending = true
      }
      return
    }
  }

  /** One compact-and-continue attempt after a detected overflow. */
  async recoverOverflow(signal?: AbortSignal): Promise<boolean> {
    if (!this.overflowPending) return false
    this.overflowPending = false
    const outcome = await this.compact(signal, true)
    return Boolean(outcome && !outcome.error)
  }

  async compact(signal?: AbortSignal, force = false): Promise<any> {
    if (!this.ready || !this.engine || !this.host) return undefined
    try {
      const outcome = await compactIfNeeded(this.engine.engine, this.session, this.host, signal, force, this.engine.pruner)
      if (outcome) {
        await this.persist()
        return outcome
      }
      return undefined
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!this.errorNotified) {
        this.errorNotified = true
        try {
          this.ctx.ui?.notify?.(`[dsh-pi] compaction failed: ${message}`, 'warning')
        } catch {
          // UI is optional (print/rpc modes).
        }
      }
      return { error: message }
    }
  }

  messages(): any[] {
    if (!this.ready) return []
    return projectSurface(this.session)
  }

  async close(): Promise<void> {
    if (!this.ready) return
    await this.sync()
    closeTurn(this.session, this.syncState)
    await this.persist()
  }

  async persist(): Promise<void> {
    await this.maybeSwitchToNative()
    if (!this.files.dsh || !this.header) return
    const events = this.session.snapshotEvents()
    await writeDshFile(this.files.dsh, this.header, events)
    this.lastEventCount = events.length
    await this.refreshNativeStamp()
    if (this.files.meta) {
      const meta = {
        version: 1,
        piSessionId: this.ctx.sessionManager.getSessionId?.(),
        syncedEntryIds: [...this.syncState.seen],
        eventCount: events.length,
        updatedAt: Date.now(),
      }
      await fs.writeFile(this.files.meta, JSON.stringify(meta), 'utf8')
    }
  }

  async readMeta(): Promise<any | undefined> {
    if (!this.files.meta) return undefined
    try {
      return JSON.parse(await fs.readFile(this.files.meta, 'utf8'))
    } catch {
      return undefined
    }
  }

  status(): string {
    if (!this.ready) return 'dsh-pi: not ready'
    const events = this.session.snapshotEvents().length
    const measurement = meter.measure(this.session)
    const limits = this.host ? budget(this.host) : undefined
    return [
      `dsh-pi: ${this.loaded ? 'loaded' : 'new'} DSH session${this.nativeMode ? ' (native pi codec)' : ''}`,
      `events=${events} surface=${this.session.surface.nodes.length} tokens~${measurement.totalTokens}`,
      limits ? `window=${limits.contextWindow} threshold=${limits.threshold} retain=${limits.retain}` : 'no model budget',
      this.files.dsh ? `file=${this.files.dsh}` : 'no persistent session file',
    ].join('\n')
  }
}
