import { createHash, randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { homedir, hostname } from 'node:os'
import path from 'node:path'
import { exportPiSession, type PiSessionFile } from './convert.ts'
import { DestinationConflict, escapeSegment, importPiToDsh, nativeDestination } from './import.ts'

export const migrationTargets = ['portable', 'windows-desktop', 'linux-desktop', 'web', 'tui'] as const
export const dshVersions = ['0.2.2-rc.1', '0.2.2-rc.5', '0.2.3-alpha.2'] as readonly string[]

export function migrationEnvironment() {
  const piHome = path.resolve(process.env.PI_CODING_AGENT_DIR ?? path.join(homedir(), '.pi', 'agent'))
  const dshHome = path.resolve(process.env.DSH_HOME ?? path.join(homedir(), '.dsh'))
  return { host: hostname(), platform: process.platform, piHome, suggestedDshHome: dshHome, suggestedSessionRoot: path.join(dshHome, 'sessions') }
}

type Target = typeof migrationTargets[number]
type Encoding = 'zstd' | 'plain'
export interface MigrationOptions {
  source: string
  target: Target
  workspace?: string
  profile?: string
  dshVersion?: string
  dshHome?: string
  sessionRoot?: string
  encoding?: Encoding
  exportDir?: string
  recoverPiEntries?: boolean
  onConflict?: 'stop' | 'copy'
}

export class MixedSession extends Error {}

const piEntryTypes = new Set([
  'message', 'model_change', 'thinking_level_change', 'custom', 'custom_message',
  'context_edit', 'compaction', 'branch_summary', 'session_info', 'label',
])

function absolute(value: string | undefined, label: string): string {
  if (!value || !path.isAbsolute(value)) throw new Error(`${label} must be an absolute path on this host`)
  return path.resolve(value)
}

async function directory(value: string | undefined, label: string): Promise<string> {
  const dir = absolute(value, label)
  if (!(await fs.stat(dir)).isDirectory()) throw new Error(`${label} must be a directory: ${dir}`)
  return fs.realpath(dir)
}

async function targetRoot(value: string | undefined): Promise<string> {
  const root = absolute(value, 'Target session root')
  const remaining: string[] = []
  for (let current = root;; current = path.dirname(current)) {
    try {
      return path.join(await directory(current, 'Target session root'), ...remaining)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || current === path.dirname(current)) throw error
      remaining.unshift(path.basename(current))
    }
  }
}

function digest(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function findPiSources({ piHome, cwd, id }: { piHome?: string; cwd?: string; id?: string }) {
  if (!cwd && !id) throw new Error('Pass --cwd or --id to select Pi sessions')
  const root = path.join(absolute(piHome ?? process.env.PI_CODING_AGENT_DIR ?? path.join(homedir(), '.pi', 'agent'), 'Pi agent directory'), 'sessions')
  const matches = []
  for await (const file of fs.glob('*/*.jsonl', { cwd: root })) {
    const input = path.join(root, file)
    const handle = await fs.open(input, 'r')
    try {
      const buffer = Buffer.alloc(65536)
      const { bytesRead } = await handle.read(buffer)
      const header = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8').split('\n', 1)[0]!)
      if (header.type !== 'session' || !header.id || (id && header.id !== id) || (cwd && header.cwd !== cwd)) continue
      matches.push({ path: input, id: header.id, cwd: header.cwd, timestamp: header.timestamp ?? header.createdAt, updated: (await handle.stat()).mtimeMs })
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
    } finally {
      await handle.close()
    }
  }
  return matches.sort((a, b) => b.updated - a.updated)
}

async function loadSource(input: string, recover: boolean) {
  const bytes = await fs.readFile(input)
  const [header, ...entries] = bytes.toString('utf8').split('\n').filter(line => line.trim()).map(line => JSON.parse(line))
  if (header?.type !== 'session' || typeof header.id !== 'string' || !header.id)
    throw new Error('Source must have a session header with an ID')
  if (entries.some(row => !row || typeof row !== 'object' || Array.isArray(row)))
    throw new Error('Source contains an invalid session row')
  const mirrors = entries.filter(row => 'seq' in row)
  if (mirrors.length && !recover) throw new MixedSession(
    `Source contains ${mirrors.length} DSH event rows. Choose a native Pi file or explicitly approve --recover-pi-entries.`,
  )
  const native = entries.filter(row => !('seq' in row))
  if (!mirrors.length && header.version !== 3)
    throw new Error('This workflow requires a Pi v3 header or a supported mixed log')
  if (mirrors.length && (header.version !== 4 || !mirrors.every(row =>
    Number.isSafeInteger(row.seq) && row.seq >= 0 && typeof row.type === 'string' && ('data' in row),
  ))) throw new Error('Mixed source has an unsupported header or event shapes')
  const ids = new Set()
  for (const row of native) {
    // A known mixed-log writer omitted parentId on its initial model entry.
    const legacyRoot = mirrors.length && ids.size === 0 && row.type === 'model_change' && row.parentId === undefined
    if (!piEntryTypes.has(row.type) || typeof row.id !== 'string' || !row.id || ids.has(row.id)
      || (!legacyRoot && row.parentId !== null && !ids.has(row.parentId)))
      throw new Error('Source has ambiguous Pi entries or parent links')
    ids.add(row.id)
  }
  if (!native.some(row => row.type === 'message')) throw new Error('Source has no native Pi messages')
  const timestamp = header.timestamp ?? (mirrors.length && Number.isFinite(header.createdAt) ? new Date(header.createdAt).toISOString() : undefined)
  if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) throw new Error('Source has no valid creation time')
  const pi: PiSessionFile = {
    header: mirrors.length
      ? { type: 'session', version: 3, id: header.id, timestamp, cwd: header.cwd }
      : header,
    entries: native,
  }
  return { pi, sha256: digest(bytes), mirrorRows: mirrors.length }
}

async function portableOutput(dir: string, sessionId: string) {
  const folder = path.join(dir, 'dcp-' + escapeSegment(sessionId))
  try {
    await fs.lstat(folder)
    throw new DestinationConflict(`Export directory already exists: ${folder}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return path.join(folder, 'session.dsh.jsonl')
}

async function prepare(options: MigrationOptions, copyId?: string) {
  const { target, dshVersion, profile, encoding } = options
  if (!migrationTargets.includes(target)) throw new Error('Choose an explicit migration target')
  if ((target === 'windows-desktop' && process.platform !== 'win32') ||
      (target === 'linux-desktop' && process.platform !== 'linux'))
    throw new Error(`Run this migration on the native host for ${target}`)
  const source = await fs.realpath(absolute(options.source, 'Pi source'))
  const { pi, sha256, mirrorRows } = await loadSource(source, options.recoverPiEntries === true)
  const portable = target === 'portable'
  if (portable && [dshVersion, profile, encoding, options.dshHome, options.sessionRoot, options.workspace].some(Boolean))
    throw new Error('A portable export only takes --export-dir for its target')
  if (!portable && options.exportDir) throw new Error('Use --session-root for a direct import')
  if (!portable && (!dshVersion || !dshVersions.includes(dshVersion)))
    throw new Error(`Confirm an exact tested DSH backend version: ${dshVersions.join(', ')}`)
  if (!portable && (!profile?.trim() || (encoding !== 'zstd' && encoding !== 'plain')))
    throw new Error('Confirm the target profile or instance and its encoding (zstd or plain)')
  if (options.onConflict && options.onConflict !== 'stop' && options.onConflict !== 'copy')
    throw new Error('Choose a conflict policy of stop or copy')
  const cwd = portable ? pi.header.cwd : await directory(options.workspace, 'Target workspace')
  if (typeof cwd !== 'string' || !cwd) throw new Error('Source does not name a project directory')
  const dshHome = portable ? undefined : await directory(options.dshHome, 'Target DSH home')
  const sessionRoot = portable ? undefined : await targetRoot(options.sessionRoot)
  const exportDir = portable ? await directory(options.exportDir, 'Export directory') : undefined
  const resolveOutput = (id: string) => portable
    ? portableOutput(exportDir!, id)
    : nativeDestination(sessionRoot!, id, cwd, encoding === 'plain')
  let sessionId = pi.header.id
  let output
  let conflict
  try {
    output = await resolveOutput(sessionId)
  } catch (error) {
    if (!(error instanceof DestinationConflict) || options.onConflict !== 'copy') throw error
    conflict = error.message
    sessionId = copyId ?? randomUUID()
    if (!/^[0-9a-f-]{36}$/i.test(sessionId) || sessionId === pi.header.id)
      throw new Error('Invalid new session ID in the migration plan')
    output = await resolveOutput(sessionId)
  }
  const plan = {
    host: hostname(), platform: process.platform, source, sourceSessionId: pi.header.id, sourceCwd: pi.header.cwd,
    sha256, sourceMessages: pi.entries.filter(row => row.type === 'message').length, mirrorRows,
    target, dshVersion, profile, encoding, dshHome, sessionRoot, exportDir,
    sessionId, cwd, output, conflict,
    attachmentHome: dshHome ?? path.dirname(output),
  }
  return { pi, plan }
}

export async function planMigration(options: MigrationOptions) {
  const { plan } = await prepare(options)
  return { schema: 1, options, ...plan, confirmation: digest(JSON.stringify(plan)).slice(0, 12) }
}

export type MigrationPlan = Awaited<ReturnType<typeof planMigration>>

export async function applyMigration(saved: MigrationPlan, confirmation: string) {
  if (saved.schema !== 1 || !confirmation || confirmation !== saved.confirmation)
    throw new Error('Apply requires the confirmation code from the approved plan')
  const { plan, pi } = await prepare(saved.options, saved.sessionId)
  if (digest(JSON.stringify(plan)).slice(0, 12) !== confirmation)
    throw new Error('The source, target, or conflict changed. Generate and confirm a new plan.')
  const { source, sessionId, cwd, output, dshHome, sessionRoot, encoding } = plan
  const destination = { id: sessionId, cwd }
  if (sessionRoot && dshHome) {
    const report = await importPiToDsh(source, sessionRoot, encoding === 'plain', { pi, sessionId, cwd, dshHome })
    return { ...report, target: plan.target, attachmentHome: plan.attachmentHome, status: 'written', verification: 'open-and-check-target-history' }
  }
  const folder = path.dirname(output)
  await fs.mkdir(folder, { mode: 0o700 })
  try {
    const report = await exportPiSession(pi, output, { dshHome: folder, destination })
    return { ...report, output, sessionId, cwd, target: plan.target, attachmentHome: folder, status: 'exported' }
  } catch (error) {
    await fs.rm(folder, { recursive: true, force: true })
    throw error
  }
}
