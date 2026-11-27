import { promises as fs } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { constants, zstdCompress } from 'node:zlib'
import { exportPiSession, readPiSession, type PiSessionFile } from './convert.ts'
import { DSH_FORMAT_VERSION } from './session.ts'

const compress = promisify(zstdCompress)
const zstdOptions = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }

// Match the JSONL persistence layout at the vendored DSH revision.
export function escapeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, (char) =>
    '~' + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'),
  )
}

export class DestinationConflict extends Error {}

export async function nativeDestination(root: string, sessionId: string, cwd: string, plaintext: boolean) {
  try {
    if (!(await fs.stat(root)).isDirectory()) throw new Error(`DSH session root is not a directory: ${root}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const id = sessionId === '.' || sessionId === '..'
    ? sessionId.replaceAll('.', '~002E')
    : escapeSegment(sessionId)
  const project = path.join(root, projectKey(cwd))
  const destination = path.join(project, id)
  const output = path.join(destination, `session.v${DSH_FORMAT_VERSION}.jsonl${plaintext ? '' : '.zstd'}`)
  let conflict: string | undefined
  for await (const existing of fs.glob('*/*/session{,.v*}.jsonl{,.zstd}', { cwd: root })) {
    const filename = path.basename(existing)
    if (!/^session(?:\.v[1-9]\d*)?\.jsonl(?:\.zstd)?$/.test(filename)) continue
    if (filename.endsWith('.zstd') === plaintext)
      throw new Error(`DSH session root uses a different encoding: ${root}`)
    if (path.basename(path.dirname(existing)) === id) conflict = path.join(root, existing)
  }
  try {
    await fs.lstat(destination)
    conflict ??= destination
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  if (conflict)
    throw new DestinationConflict(`DSH session already exists: ${sessionId} (${conflict})`)
  return output
}

function projectKey(cwd: string): string {
  const readable = escapeSegment(cwd.replace(/[/\\:]+/g, '-')).replace(/^-+/, '')
  return `--${(readable || 'root').slice(0, 251)}--`
}

export async function importPiToDsh(
  input: string,
  root = path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'sessions'),
  plaintext = false,
  options: { pi?: PiSessionFile; sessionId?: string; cwd?: string; dshHome?: string } = {},
) {
  root = path.resolve(root)
  const pi = options.pi ?? await readPiSession(input)
  const sessionId = options.sessionId ?? pi.header.id
  const cwd = options.cwd ?? pi.header.cwd
  if (!sessionId || !cwd || !path.isAbsolute(cwd))
    throw new Error('Import requires a native pi session with an ID and an absolute local project path')
  const output = await nativeDestination(root, sessionId, cwd, plaintext)
  const destination = path.dirname(output)
  const stage = await fs.mkdtemp(path.join(tmpdir(), 'dcp-import-'))
  try {
    const raw = path.join(stage, 'session.jsonl')
    const report = await exportPiSession(pi, raw, {
      dshHome: options.dshHome,
      destination: options.sessionId !== undefined || options.cwd !== undefined
        ? { id: sessionId, cwd }
        : undefined,
    })
    const bytes = await fs.readFile(raw)
    const headerEnd = bytes.indexOf(0x0a) + 1
    // DSH reads the first frame independently when listing session headers.
    const stored = plaintext ? bytes : Buffer.concat(await Promise.all([
      compress(bytes.subarray(0, headerEnd), zstdOptions),
      compress(bytes.subarray(headerEnd), zstdOptions),
    ]))
    await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 })
    try {
      await fs.mkdir(destination, { mode: 0o700 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        throw new DestinationConflict(`DSH session already exists: ${sessionId} (${destination})`)
      throw error
    }
    const pending = path.join(destination, '.dcp-import.tmp')
    try {
      await fs.writeFile(pending, stored, { flag: 'wx', mode: 0o600 })
      await fs.rename(pending, output)
    } catch (error) {
      await fs.rm(pending, { force: true })
      await fs.rmdir(destination)
      throw error
    }
    return { ...report, input, output, sessionId, cwd }
  } finally {
    await fs.rm(stage, { recursive: true, force: true })
  }
}
