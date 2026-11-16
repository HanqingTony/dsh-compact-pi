/** Legacy native-codec compatibility and lossless pi -> DSH archive export.
 * The installable extension does not patch pi or use this module at runtime.
 */
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  appendFileSync,
} from 'node:fs'
import path from 'node:path'
import {
  Session,
  appendPluginRecord,
  SESSION_FORMAT_VERSION,
  imageOffloadProjection,
} from '../vendor/dsh-runtime.mjs'
import { createSyncState, syncPiEntries } from './dsh/sync.ts'
import { headerForSession, type DshHeader } from './dsh/session.ts'
import { projectSurface } from './dsh/projection.ts'
export interface PiHeader {
  type: 'session'
  version: number
  id: string
  timestamp: string
  cwd: string
  parentSession?: string
}
export const PI_ARCHIVE = 'plugin:dcp/pi-entry'
const PI_HEADER = 'plugin:dcp/pi-header'
function rows(file: string): any[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}
export function isDshFile(file: string): boolean {
  try {
    const first = readFileSync(file, 'utf8').split('\n', 1)[0]
    const header = JSON.parse(first!)
    return (
      header.type === 'session' && header.version === SESSION_FORMAT_VERSION
    )
  } catch {
    return false
  }
}
export function archivedPi(
  header: DshHeader,
  events: any[],
): { header: PiHeader; entries: any[] } | undefined {
  const entries = events
    .filter((event) => [PI_ARCHIVE, 'plugin:zcp/pi-entry'].includes(event.type))
    .map((event) => event.data)
  const original = events.find((event) =>
    [PI_HEADER, 'plugin:zcp/pi-header'].includes(event.type),
  )?.data
  if (!original && !entries.length) return
  return { header: original ?? piHeader(header), entries }
}
function piHeader(header: DshHeader): PiHeader {
  return {
    type: 'session',
    version: 3,
    id: header.id,
    timestamp: new Date(header.createdAt).toISOString(),
    cwd: header.cwd ?? process.cwd(),
    ...(header.parentSession ? { parentSession: header.parentSession } : {}),
  }
}
export function readDshAsPi(
  file: string,
): { header: PiHeader; entries: any[] } | null {
  const [header, ...events] = rows(file)
  if (header?.version !== SESSION_FORMAT_VERSION)
    throw new Error(`Unsupported DSH version ${header?.version}`)
  const archived = archivedPi(header, events)
  if (archived) return archived
  const session = Session.create(
    header.id,
    events,
    headerForSession(header),
    0,
    [imageOffloadProjection],
  )
  let parentId: string | null = null
  const entries = projectSurface(session).map((message, index) => {
    const id = `m${String(index + 1).padStart(5, '0')}`
    const entry = {
      type: 'message',
      id,
      parentId,
      timestamp: new Date(message.timestamp ?? Date.now()).toISOString(),
      message,
    }
    parentId = id
    return entry
  })
  return { header: piHeader(header), entries }
}
export function readPiHeader(file: string): PiHeader | null {
  return readDshAsPi(file)?.header ?? null
}
export function dshRowsFromPi(
  pi: PiHeader,
  entries: readonly any[],
  _file?: string,
  imageToDsh?: (image: any) => any,
): string {
  const header: DshHeader = {
    type: 'session',
    version: SESSION_FORMAT_VERSION,
    id: pi.id,
    createdAt: Date.parse(pi.timestamp),
    cwd: pi.cwd,
    isSeeded: false,
    delegationDepth: 0,
    ...(pi.parentSession ? { parentSession: pi.parentSession } : {}),
  }
  const session = Session.create(header.id, [], headerForSession(header))
  appendPluginRecord(session, PI_HEADER, JSON.parse(JSON.stringify(pi)))
  const state = createSyncState()
  // Preserve every entry, its original id, parent and metadata. DSH's message
  // surface is an export view; pi resumes from the lossless archive records.
  for (const entry of entries) {
    syncPiEntries(session, [entry], state, { imageToDsh })
    appendPluginRecord(session, PI_ARCHIVE, JSON.parse(JSON.stringify(entry)))
  }
  return (
    [
      JSON.stringify(header),
      ...session.snapshotEvents().map((event) => JSON.stringify(event)),
    ].join('\n') + '\n'
  )
}
export function writeDshFromPi(
  file: string,
  header: PiHeader,
  entries: readonly any[],
  imageToDsh?: (image: any) => any,
): void {
  mkdirSync(path.dirname(file), { recursive: true })
  const body = dshRowsFromPi(header, entries, file, imageToDsh)
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, body)
  renameSync(tmp, file)
}
export function appendPiEntry(file: string, entry: any): void {
  if (!isDshFile(file)) {
    const [header, ...entries] = rows(file)
    writeDshFromPi(file, header, [...entries, entry])
    return
  }
  const [header, ...events] = rows(file)
  const archived = archivedPi(header, events)
  if (!archived) {
    // Upgrading a foreign DSH surface into a lossless pi archive is explicit:
    // preserve the existing log and append its current projected pi entries.
    const converted = readDshAsPi(file)!
    const session = Session.create(
      header.id,
      events,
      headerForSession(header),
      0,
      [imageOffloadProjection],
    )
    appendPluginRecord(session, PI_HEADER, converted.header)
    for (const previous of converted.entries)
      appendPluginRecord(session, PI_ARCHIVE, previous)
    appendPluginRecord(session, PI_ARCHIVE, JSON.parse(JSON.stringify(entry)))
    appendFileSync(
      file,
      session
        .snapshotEvents()
        .slice(events.length)
        .map((event) => JSON.stringify(event))
        .join('\n') + '\n',
    )
    return
  }
  // Rebuild from disk, never from an mtime cache. A plugin's append between
  // calls cannot be overwritten or assigned duplicate sequence numbers.
  const session = Session.create(
    header.id,
    events,
    headerForSession(header),
    0,
    [imageOffloadProjection],
  )
  appendPluginRecord(session, PI_ARCHIVE, JSON.parse(JSON.stringify(entry)))
  appendFileSync(
    file,
    session
      .snapshotEvents()
      .slice(events.length)
      .map((event) => JSON.stringify(event))
      .join('\n') + '\n',
  )
}
export function resetCodecCache(): void {}
export function codecVersion(): string {
  return '0.2.0'
}
