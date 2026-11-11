/**
 * pi-dsh: launch pi on a DSH-format session, then merge the new turns back.
 *
 *   pi-dsh --session <file.dsh.jsonl> [pi args...]
 *
 * A plain pi extension cannot swap pi's core session codec: SessionManager
 * opens the file before extensions load. This launcher is the compatibility
 * lane: DSH -> temporary pi JSONL -> pi + dsh-pi -> merge new entries back.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dshToPi, readPiSession } from '../src/dsh/convert.ts'
import { isDshFile, readDshAsPi } from '../src/codec.ts'
import { readDshFile, writeDshFile } from '../src/dsh/store.ts'
import { restoreSession } from '../src/dsh/session.ts'
import { createSyncState, syncPiEntries } from '../src/dsh/sync.ts'

const args = process.argv.slice(2)
let sessionPath: string | undefined
let sessionArgIndex = -1
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--session') {
    sessionPath = args[i + 1]
    sessionArgIndex = i
    break
  }
  if (args[i].startsWith('--session=')) {
    sessionPath = args[i].slice('--session='.length)
    sessionArgIndex = i
    break
  }
}

const piBin = process.env.PI_BIN ?? 'pi'
const here = path.dirname(fileURLToPath(import.meta.url))
const plugin = [path.join(here, 'index.js'), path.resolve(here, '..', 'dist', 'index.js')].find((candidate) => existsSync(candidate)) ?? path.resolve(here, '..', 'dist', 'index.js')
const userArgs = [...args]
if (!userArgs.includes('-e') && !userArgs.includes('--extension')) userArgs.push('-e', plugin)

async function runPi(launchArgs: string[]): Promise<number> {
  return await new Promise((resolve) => {
    const child = spawn(piBin, launchArgs, { stdio: 'inherit', env: process.env })
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', (error) => {
      console.error(`pi-dsh: ${error.message}`)
      resolve(1)
    })
  })
}

async function main(): Promise<number> {
  if (!sessionPath) return await runPi(userArgs)

  let isDsh = false
  try {
    const first = (await fs.readFile(sessionPath, 'utf8')).split('\n', 1)[0]
    const header = JSON.parse(first)
    isDsh = header?.type === 'session' && Number(header.version) >= 4
  } catch {
    // Not a readable JSONL header; let pi report the path error.
  }

  if (!isDsh) {
    // pi format (or a new path): pi + dsh-pi writes the canonical DSH sidecar.
    return await runPi(userArgs)
  }

  const dsh = await readDshFile(sessionPath)
  if (!dsh) {
    console.error(`pi-dsh: ${sessionPath} is not a readable DSH session`)
    return 1
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-dsh-'))
  const tmpPi = path.join(tmpDir, 'session.jsonl')
  const converted = await dshToPi(sessionPath, tmpPi)
  const initialIds = new Set(Array.from({ length: converted.messages }, (_, i) => `m${String(i + 1).padStart(5, '0')}`))

  const launchArgs = [...userArgs]
  if (sessionArgIndex >= 0) {
    if (args[sessionArgIndex] === '--session') launchArgs[sessionArgIndex + 1] = tmpPi
    else launchArgs[sessionArgIndex] = `--session=${tmpPi}`
  }

  const code = await runPi(launchArgs)
  try {
    const afterEntries = isDshFile(tmpPi)
      ? (readDshAsPi(tmpPi)?.entries ?? [])
      : (await readPiSession(tmpPi)).entries
    // With the native codec installed, the temporary file is DSH too; the
    // first `converted.messages` entries are the original surface.
    const newEntries = isDshFile(tmpPi)
      ? afterEntries.slice(converted.messages)
      : afterEntries.filter((entry: any) => !initialIds.has(String(entry.id ?? '')))
    if (newEntries.length > 0) {
      const session = restoreSession(dsh.header, dsh.events)
      const state = createSyncState()
      syncPiEntries(session, newEntries, state, { systemPrompt: '' })
      await writeDshFile(sessionPath, dsh.header, session.snapshotEvents())
      console.error(`pi-dsh: merged ${newEntries.length} new pi entries into ${sessionPath}`)
    }
  } catch (error) {
    console.error(`pi-dsh: merge failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  return code
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(`pi-dsh: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
