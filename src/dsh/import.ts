import { promises as fs } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { constants, zstdCompress } from 'node:zlib'
import { piToDsh } from './convert.ts'
import { DSH_FORMAT_VERSION, type DshHeader } from './session.ts'

const compress = promisify(zstdCompress)
const zstdOptions = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }

// Match the JSONL persistence layout at the vendored DSH revision.
function escapeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, (char) =>
    '~' + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'),
  )
}

function projectKey(cwd: string): string {
  const readable = escapeSegment(cwd.replace(/[/\\:]+/g, '-')).replace(/^-+/, '')
  return `--${(readable || 'root').slice(0, 251)}--`
}

export async function importPiToDsh(
  input: string,
  root = path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'sessions'),
  plaintext = false,
) {
  root = path.resolve(root)
  const stage = await fs.mkdtemp(path.join(tmpdir(), 'dcp-import-'))
  try {
    const raw = path.join(stage, 'session.jsonl')
    const report = await piToDsh(input, raw)
    const bytes = await fs.readFile(raw)
    const headerEnd = bytes.indexOf(0x0a) + 1
    const header = JSON.parse(bytes.subarray(0, headerEnd).toString('utf8')) as DshHeader
    if (header.version !== DSH_FORMAT_VERSION || !header.id || !header.cwd || !path.isAbsolute(header.cwd))
      throw new Error('Import requires a native pi session with an ID and an absolute local project path')
    const id = header.id === '.' || header.id === '..'
      ? header.id.replaceAll('.', '~002E')
      : escapeSegment(header.id)
    for await (const existing of fs.glob('*/*/session{,.v*}.jsonl{,.zstd}', { cwd: root })) {
      const filename = path.basename(existing)
      if (!/^session(?:\.v[1-9]\d*)?\.jsonl(?:\.zstd)?$/.test(filename)) continue
      if (filename.endsWith('.zstd') === plaintext)
        throw new Error(`DSH session root uses a different encoding: ${root}`)
      if (path.basename(path.dirname(existing)) === id)
        throw new Error(`DSH session already exists: ${header.id} (${path.join(root, existing)})`)
    }
    const project = path.join(root, projectKey(header.cwd))
    const destination = path.join(project, id)
    const output = path.join(destination, `session.v${header.version}.jsonl${plaintext ? '' : '.zstd'}`)
    // DSH reads the first frame independently when listing session headers.
    const stored = plaintext ? bytes : Buffer.concat(await Promise.all([
      compress(bytes.subarray(0, headerEnd), zstdOptions),
      compress(bytes.subarray(headerEnd), zstdOptions),
    ]))
    await fs.mkdir(project, { recursive: true, mode: 0o700 })
    try {
      await fs.mkdir(destination, { mode: 0o700 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        throw new Error(`DSH session already exists: ${header.id} (${destination})`)
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
    return { ...report, output, sessionId: header.id, cwd: header.cwd }
  } finally {
    await fs.rm(stage, { recursive: true, force: true })
  }
}
