/** pi session JSONL <-> DSH session JSONL conversion. */

import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type { Session } from '../../vendor/dsh-runtime.mjs'
import { createSession, restoreSession } from './session.ts'
import { createSyncState, syncPiEntries } from './sync.ts'
import { openImageBridge } from './images.ts'
import { projectSurface } from './projection.ts'
import { readDshFile } from './store.ts'
import { writeDshFromPi, archivedPi } from '../codec.ts'
import type { PiMessage } from './messages.ts'

export interface PiSessionFile {
  header: any
  entries: any[]
}

export async function readPiSession(file: string): Promise<PiSessionFile> {
  const text = await fs.readFile(file, 'utf8')
  const rows = text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
  const header = rows.shift()
  if (header?.type !== 'session')
    throw new Error(`${file}: not a pi session header`)
  return { header, entries: rows }
}

export async function writePiSession(
  file: string,
  header: any,
  entries: readonly any[],
): Promise<void> {
  const dir = path.dirname(file)
  await fs.mkdir(dir, { recursive: true })
  const body =
    [
      JSON.stringify(header),
      ...entries.map((entry) => JSON.stringify(entry)),
    ].join('\n') + '\n'
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.tmp`)
  await fs.writeFile(tmp, body, 'utf8')
  await fs.rename(tmp, file)
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

function messageEntry(
  id: string,
  parentId: string | null,
  time: number,
  message: PiMessage,
): any {
  const base = {
    type: 'message',
    id,
    parentId,
    timestamp: new Date(time).toISOString(),
  }
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

export interface ConvertReport {
  input: string
  output: string
  messages: number
  events: number
}

export async function piToDsh(
  input: string,
  output: string,
): Promise<ConvertReport> {
  const pi = await readPiSession(input)
  const carrier = await openImageBridge()
  try {
    await carrier.images.prepare(
      pi.entries
        .filter((entry) => entry.type === 'message')
        .map((entry) => entry.message),
    )
    writeDshFromPi(output, pi.header, pi.entries, carrier.images.toDsh)
  } finally {
    await carrier.close()
  }
  const parsed = await readDshFile(output)
  return {
    input,
    output,
    messages: pi.entries.filter((entry) => entry.type === 'message').length,
    events: parsed!.events.length,
  }
}

export async function dshToPi(
  input: string,
  output: string,
): Promise<ConvertReport> {
  const dsh = await readDshFile(input)
  if (!dsh) throw new Error(`${input}: not a DSH session file`)
  const archived = archivedPi(dsh.header, dsh.events)
  if (archived) {
    await writePiSession(output, archived.header, archived.entries)
    return {
      input,
      output,
      messages: archived.entries.filter((entry) => entry.type === 'message')
        .length,
      events: dsh.events.length,
    }
  }
  const session = restoreSession(dsh.header, dsh.events)
  const carrier = await openImageBridge()
  let messages: PiMessage[]
  try {
    await carrier.images.hydrate(
      session.surface.nodes
        .map((seq) => session.deriveEventMessage(session.eventAt(seq)!))
        .filter(Boolean),
    )
    messages = projectSurface(session, carrier.images.toPi)
  } finally {
    await carrier.close()
  }
  const header = {
    type: 'session',
    version: 3,
    id: dsh.header.id,
    timestamp: new Date(dsh.header.createdAt).toISOString(),
    cwd: dsh.header.cwd ?? process.cwd(),
  }
  const entries: any[] = []
  let parentId: string | null = null
  for (const [index, message] of messages.entries()) {
    const id = `m${String(index + 1).padStart(5, '0')}`
    entries.push(
      messageEntry(id, parentId, message.timestamp ?? Date.now(), message),
    )
    parentId = id
  }
  await writePiSession(output, header, entries)
  return { input, output, messages: messages.length, events: dsh.events.length }
}

export async function dshSessionFromPiFile(input: string): Promise<Session> {
  const pi = await readPiSession(input)
  const id = String(pi.header.id ?? path.basename(input, '.jsonl'))
  const { session } = createSession(
    id,
    pi.header.cwd,
    Date.parse(pi.header.timestamp ?? '') || Date.now(),
  )
  const carrier = await openImageBridge()
  try {
    await carrier.images.prepare(
      pi.entries
        .filter((entry) => entry.type === 'message')
        .map((entry) => entry.message),
    )
    syncPiEntries(session, pi.entries, createSyncState(), {
      systemPrompt: '',
      imageToDsh: carrier.images.toDsh,
    })
  } finally {
    await carrier.close()
  }
  return session
}
