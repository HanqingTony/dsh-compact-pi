/**
 * Synchronous DSH session codec used by the pi session-manager patch.
 *
 * The patched `loadEntriesFromFile` / `_persist` call these functions from
 * pi's ESM module through createRequire(). Keep this module synchronous.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import * as path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session/types'
import { createSyncState, syncPiEntries, type SyncState } from './dsh/sync.ts'
import { projectSurface } from './dsh/projection.ts'
import { headerForSession, type DshHeader } from './dsh/session.ts'
import type { PiMessage } from './dsh/messages.ts'

const DSH_VERSION = SESSION_FORMAT_VERSION

export interface PiHeader {
  type: 'session'
  version: number
  id: string
  timestamp: string
  cwd: string
  parentSession?: string
}

interface Cached {
  session: Session
  header: DshHeader
  state: SyncState
  writtenCount: number
  piHeader: PiHeader
  mtimeMs: number
  size: number
}

const cache = new Map<string, Cached>()

function makeDshHeader(pi: PiHeader): DshHeader {
  const createdAt = Date.parse(pi.timestamp)
  return {
    type: 'session',
    version: DSH_VERSION,
    id: pi.id,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    ...(pi.cwd ? { cwd: pi.cwd } : {}),
    ...(pi.parentSession ? { parentSession: pi.parentSession } : {}),
    isSeeded: false,
    delegationDepth: 0,
  }
}

function piHeaderFromDsh(header: DshHeader): PiHeader {
  return {
    type: 'session',
    version: 3,
    id: header.id,
    timestamp: new Date(header.createdAt).toISOString(),
    ...(header.cwd ? { cwd: header.cwd } : {}),
    ...(header.parentSession ? { parentSession: header.parentSession } : {}),
  }
}

function readRows(file: string): { header: DshHeader; events: any[] } {
  const rows = readFileSync(file, 'utf8').split('\n').filter((line) => line.trim().length > 0)
  if (rows.length === 0) throw new Error(`${file}: empty file`)
  const header = JSON.parse(rows[0])
  if (header?.type !== 'session') throw new Error(`${file}: not a session header`)
  const dshHeader: DshHeader = {
    type: 'session',
    version: Number(header.version ?? DSH_VERSION),
    id: String(header.id),
    createdAt: Number(header.createdAt ?? Date.now()),
    cwd: header.cwd,
    parentSession: header.parentSession,
    isSeeded: header.isSeeded === true,
    delegationDepth: Number(header.delegationDepth ?? 0),
    agentPreset: header.agentPreset,
  }
  return { header: dshHeader, events: rows.slice(1).map((row) => JSON.parse(row)) }
}

export function isDshFile(file: string): boolean {
  try {
    const first = readFileSync(file, 'utf8').split('\n', 1)[0]?.trim()
    if (!first) return false
    const header = JSON.parse(first)
    return header?.type === 'session' && Number(header.version) >= 4
  } catch {
    return false
  }
}

export function readPiHeader(file: string): PiHeader | null {
  try {
    return piHeaderFromDsh(readRows(file).header)
  } catch {
    return null
  }
}

function zeroUsage(): any {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  }
}

function messageEntry(id: string, parentId: string | null, time: number, message: PiMessage): any {
  const base = { type: 'message', id, parentId, timestamp: new Date(time).toISOString() }
  if (message.role === 'assistant') {
    return {
      ...base,
      message: {
        ...message,
        api: (message as any).api ?? 'dsh',
        provider: (message as any).provider ?? 'dsh',
        model: (message as any).model ?? 'dsh',
        usage: (message as any).usage ?? zeroUsage(),
        stopReason: (message as any).stopReason ?? 'stop',
        timestamp: time,
      },
    }
  }
  return { ...base, message: { ...message, timestamp: time } }
}

function piEntriesFromSession(session: Session): any[] {
  const messages = projectSurface(session)
  const entries: any[] = []
  let parentId: string | null = null
  for (const [index, message] of messages.entries()) {
    const id = `m${String(index + 1).padStart(5, '0')}`
    entries.push(messageEntry(id, parentId, message.timestamp ?? Date.now(), message))
    parentId = id
  }
  return entries
}

function firstSystemSeq(session: Session): number | undefined {
  for (const seq of session.surface.nodes) {
    if (session.eventAt(seq)?.type === 'system/message') return Number(seq)
  }
  return undefined
}

function openTurnState(session: Session): { turn: number; turnStarted: boolean; step: number; stepOpen: boolean } {
  let maxTurn = 0
  let openTurn = 0
  let lastStep = 0
  let stepOpen = false
  for (const event of session.snapshotEvents()) {
    const data: any = event.data ?? {}
    if (event.type === 'turn/start') {
      maxTurn = Math.max(maxTurn, Number(data.turn ?? 0))
      openTurn = Number(data.turn ?? 0)
      lastStep = 0
      stepOpen = false
    } else if (event.type === 'turn/end') {
      openTurn = 0
      stepOpen = false
    } else if (event.type === 'step/start') {
      lastStep = Number(data.step ?? 0)
      stepOpen = true
    } else if (event.type === 'step/end') {
      stepOpen = false
    }
  }
  return openTurn > 0
    ? { turn: openTurn, turnStarted: true, step: lastStep, stepOpen }
    : { turn: maxTurn + 1, turnStarted: false, step: 0, stepOpen: false }
}

function stampOf(file: string): { mtimeMs: number; size: number } {
  try {
    const stat = statSync(file)
    return { mtimeMs: stat.mtimeMs, size: stat.size }
  } catch {
    return { mtimeMs: 0, size: 0 }
  }
}

function cacheFromSession(file: string, session: Session, header: DshHeader, piHeader: PiHeader, writtenCount: number): Cached {
  const state = createSyncState()
  const turn = openTurnState(session)
  state.turn = turn.turn
  state.turnStarted = turn.turnStarted
  state.step = turn.step
  state.stepOpen = turn.stepOpen
  state.seen = new Set(piEntriesFromSession(session).map((entry) => String(entry.id)))
  state.systemSeq = firstSystemSeq(session)
  const stamp = stampOf(file)
  const cached = { session, header, state, writtenCount, piHeader, ...stamp }
  cache.set(file, cached)
  return cached
}

/** Convert a DSH file into the pi header + entries pi's SessionManager expects. */
export function readDshAsPi(file: string): { header: PiHeader; entries: any[] } | null {
  try {
    const parsed = readRows(file)
    const session = Session.create(parsed.header.id as any, parsed.events, headerForSession(parsed.header), 0 as any)
    const piHeader = piHeaderFromDsh(parsed.header)
    cacheFromSession(file, session, parsed.header, piHeader, parsed.events.length)
    return { header: piHeader, entries: piEntriesFromSession(session) }
  } catch (error) {
    console.error(`[dsh-pi codec] read ${file} failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

function rowsFor(piHeader: PiHeader, entries: readonly any[]): { rows: string; cached: Cached } {
  const header = makeDshHeader(piHeader)
  const session = Session.create(header.id as any, [], headerForSession(header))
  const state = createSyncState()
  syncPiEntries(session, entries, state, { systemPrompt: '' })
  const events = session.snapshotEvents()
  const rows = [JSON.stringify(header), ...events.map((event) => JSON.stringify(event))].join('\n') + '\n'
  const cached = {
    session,
    header,
    state,
    writtenCount: events.length,
    piHeader,
    mtimeMs: 0,
    size: 0,
  }
  // A fresh manager will append after this rewrite; keep its seen set aligned.
  cached.state.seen = new Set(entries.filter((entry) => entry?.type === 'message' && entry.id).map((entry) => String(entry.id)))
  return { rows, cached }
}

/** Serialize all pi entries as one complete DSH file (used at creation/rewrite). */
export function dshRowsFromPi(piHeader: PiHeader, entries: readonly any[], file?: string): string {
  const { rows, cached } = rowsFor(piHeader, entries)
  if (file) cache.set(file, cached)
  return rows
}

/** Append one pi entry to the cached DSH session and to the file. */
function convertPiFileIfNeeded(file: string): void {
  if (!existsSync(file) || isDshFile(file)) return
  try {
    const rows = readFileSync(file, 'utf8').split('\n').filter((line) => line.trim().length > 0).map((line) => JSON.parse(line))
    const header = rows.shift()
    if (header?.type !== 'session' || typeof header.id !== 'string') return
    writeDshFromPi(file, header, rows)
  } catch (error) {
    console.error(`[dsh-pi codec] convert ${file} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function appendPiEntry(file: string, entry: any): void {
  if (!entry || entry.type !== 'message') return // setup/metadata entries are not model-visible
  convertPiFileIfNeeded(file)
  let cached = cache.get(file)
  const stamp = stampOf(file)
  if (cached && (cached.mtimeMs !== stamp.mtimeMs || cached.size !== stamp.size)) {
    // The plugin (or another writer) rewrote the DSH log after this cache was
    // built. Reload before appending so sequence numbers stay contiguous.
    cache.delete(file)
    readDshAsPi(file)
    cached = cache.get(file)
  }
  if (!cached) {
    const loaded = readDshAsPi(file)
    if (!loaded) return
    cached = cache.get(file)
  }
  if (!cached) return
  const before = cached.writtenCount
  syncPiEntries(cached.session, [entry], cached.state, { systemPrompt: '' })
  const events = cached.session.snapshotEvents()
  if (events.length > before) {
    const rows = events.slice(before).map((event) => JSON.stringify(event)).join('\n') + '\n'
    appendFileSync(file, rows)
  }
  cached.writtenCount = events.length
  Object.assign(cached, stampOf(file))
  cached.state.seen.add(String(entry.id))
}

/** Explicitly write a full DSH file and seed the cache (used by the patch). */
export function writeDshFromPi(file: string, piHeader: PiHeader, entries: readonly any[]): void {
  const { rows, cached } = rowsFor(piHeader, entries)
  mkdirSync(path.dirname(file), { recursive: true })
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`)
  writeFileSync(tmp, rows)
  renameSync(tmp, file)
  Object.assign(cached, stampOf(file))
  cache.set(file, cached)
}

export function resetCodecCache(): void {
  cache.clear()
}

export function codecVersion(): string {
  return '0.1.0'
}
