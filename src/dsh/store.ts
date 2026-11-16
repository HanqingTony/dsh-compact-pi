/** DSH session JSONL persistence (schema-compatible v4 rows). */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type { Session } from '../../vendor/dsh-runtime.mjs'
import {
  DSH_FORMAT_VERSION,
  type DshHeader,
  createSession,
  restoreSession,
} from './session.ts'

export interface DshFile {
  header: DshHeader
  events: any[]
}

export function isDshFileSync(file: string | undefined): boolean {
  if (!file) return false
  try {
    const first = readFileSync(file, 'utf8').split('\n', 1)[0]?.trim()
    if (!first) return false
    const header = JSON.parse(first)
    return (
      header?.type === 'session' &&
      Number(header.version) === DSH_FORMAT_VERSION
    )
  } catch {
    return false
  }
}

export function dshFileFor(
  piSessionFile: string | undefined,
): string | undefined {
  if (!piSessionFile) return undefined
  // Keep the DSH artifact in a hidden subdirectory: pi's session scanner treats
  // every *.jsonl file in the session directory as a pi session, so a sibling
  // .dsh.jsonl would be opened/resumed as a broken pi session.
  const dir = path.join(path.dirname(piSessionFile), '.dsh')
  const base = path.basename(piSessionFile).replace(/\.jsonl$/, '')
  return path.join(dir, `${base}.jsonl`)
}

export async function readDshFile(file: string): Promise<DshFile | undefined> {
  let text: string
  try {
    text = file.endsWith('.zstd')
      ? execFileSync('zstd', ['-dc', file], {
          encoding: 'utf8',
          maxBuffer: 512 * 1024 * 1024,
        })
      : await fs.readFile(file, 'utf8')
  } catch (error: any) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
  const rows = text.split('\n').filter((line) => line.trim().length > 0)
  if (rows.length === 0) return undefined
  const headerRow = JSON.parse(rows[0])
  if (headerRow?.type !== 'session')
    throw new Error(`${file}: not a DSH session header`)
  if (headerRow.version !== DSH_FORMAT_VERSION)
    throw new Error(
      `${file}: unsupported DSH session version ${headerRow.version}`,
    )
  const header: DshHeader = {
    type: 'session',
    version: Number(headerRow.version ?? DSH_FORMAT_VERSION),
    id: String(headerRow.id),
    createdAt: Number(headerRow.createdAt ?? Date.now()),
    cwd: headerRow.cwd,
    parentSession: headerRow.parentSession,
    isSeeded: headerRow.isSeeded === true,
    delegationDepth: Number(headerRow.delegationDepth ?? 0),
    agentPreset: headerRow.agentPreset,
  }
  const events = rows.slice(1).map((row) => JSON.parse(row))
  return { header, events }
}

export async function writeDshFile(
  file: string,
  header: DshHeader,
  events: readonly any[],
): Promise<void> {
  const dir = path.dirname(file)
  await fs.mkdir(dir, { recursive: true })
  const body =
    [
      JSON.stringify(header),
      ...events.map((event) => JSON.stringify(event)),
    ].join('\n') + '\n'
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.tmp`)
  await fs.writeFile(tmp, body, 'utf8')
  await fs.rename(tmp, file)
}

export async function loadOrCreateSession(
  file: string | undefined,
  id: string,
  cwd?: string,
): Promise<{ session: Session; header: DshHeader; loaded: boolean }> {
  if (file) {
    try {
      const parsed = await readDshFile(file)
      if (parsed) {
        const session = restoreSession(parsed.header, parsed.events)
        return { session, header: parsed.header, loaded: true }
      }
    } catch (error) {
      // A malformed/foreign sidecar must not stop the host; start fresh and
      // let the caller surface the warning.
      console.warn(
        `[dcp] could not load ${file}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  const { session, header } = createSession(id, cwd)
  return { session, header, loaded: false }
}
