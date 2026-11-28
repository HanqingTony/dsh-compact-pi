import { promises as fs } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { DestinationConflict } from './import.ts'
import {
  applyMigration, dshVersions, findPiSources, migrationEnvironment, migrationTargets, MixedSession, planMigration,
  type MigrationOptions, type MigrationPlan,
} from './migration.ts'
import { verifyWebSession } from './migration-web.ts'

const help = `Usage:
  dcp-session migrate [<absolute-pi-session>]           Interactive terminal
  dcp-session migrate environment
  dcp-session migrate sources [--pi-home <dir>] [--id <id>] [--cwd <dir>]
  dcp-session migrate plan --source <file> --target <target> --plan-file <file> [options]
  dcp-session migrate apply --plan-file <file> --confirm <code>
  dcp-session migrate verify-web --url-file <file> --session-id <id> --events <count>

Targets: ${migrationTargets.join(', ')}
Portable target: --export-dir <directory>
Direct targets: --profile <name> --dsh-version <version> --dsh-home <directory>
                --session-root <directory> --workspace <directory> --encoding <zstd|plain>
Conflict options: --on-conflict <stop|copy>, --recover-pi-entries
Tested DSH versions: ${dshVersions.join(', ')}
Plans preview the exact host and paths. Apply rechecks the source and destination before writing.`

const print = (value: unknown) => console.log(JSON.stringify(value, null, 2))

async function interactive(source?: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error('Interactive mode needs a terminal. Use migrate plan and apply from an agent.')
  const reader = createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (prompt: string) => (await reader.question(prompt + ' ')).trim()
  try {
    const target = await ask(`Target (${migrationTargets.join(', ')}):`) as MigrationOptions['target']
    if (!migrationTargets.includes(target)) throw new Error('Choose a listed target')
    const options: MigrationOptions = { source: source ?? await ask('Absolute Pi session path:'), target }
    if (target === 'portable') options.exportDir = await ask('Absolute export directory:')
    else {
      options.profile = await ask('Target profile or instance name:')
      options.dshVersion = await ask(`Target DSH backend version (${dshVersions.join(', ')}):`)
      options.dshHome = await ask('Absolute target DSH home (attachment store):')
      options.sessionRoot = await ask('Absolute target session directory:')
      options.workspace = await ask('Absolute target workspace:')
      options.encoding = await ask('Target session encoding (zstd or plain):') as MigrationOptions['encoding']
    }
    let plan: MigrationPlan
    for (;;) {
      try {
        plan = await planMigration(options)
        break
      } catch (error) {
        if (error instanceof MixedSession && !options.recoverPiEntries) {
          console.log(error.message)
          if (await ask('Use only the native Pi entries and preserve the source file? Type recover or press Enter to cancel.') !== 'recover') return
          options.recoverPiEntries = true
        } else if (error instanceof DestinationConflict && options.onConflict !== 'copy') {
          console.log(error.message)
          if (await ask('Keep the existing session and use a new ID? Type copy or press Enter to cancel.') !== 'copy') return
          options.onConflict = 'copy'
        } else throw error
      }
    }
    console.log(`Session ${plan.sourceSessionId} → ${plan.target} on ${plan.host}`)
    console.log(`Output: ${plan.output}`)
    if (plan.attachmentHome !== path.dirname(plan.output))
      console.log(`Attachments: ${plan.attachmentHome}`)
    if (plan.sessionId !== plan.sourceSessionId)
      console.log(`New session ID: ${plan.sessionId}`)
    if (plan.mirrorRows)
      console.log(`Recover Pi entries only, leaving ${plan.mirrorRows} DSH rows in the source.`)
    const code = await ask(`Write to this location? Enter ${plan.confirmation} to confirm, or press Enter to cancel.`)
    if (!code) return
    print(await applyMigration(plan, code))
  } finally {
    reader.close()
  }
}

export async function runMigration(args: string[]) {
  const [mode, ...rest] = args
  switch (mode) {
    case '--help': case '-h':
      console.log(help)
      return
    case 'environment':
      if (rest.length) throw new Error('migrate environment takes no arguments')
      print(migrationEnvironment())
      return
    case 'sources': {
      const { values } = parseArgs({ args: rest, options: {
        'pi-home': { type: 'string' }, id: { type: 'string' }, cwd: { type: 'string' },
      } })
      print(await findPiSources({ piHome: values['pi-home'], id: values.id, cwd: values.cwd }))
      return
    }
    case 'plan': {
      const { values: v } = parseArgs({ args: rest, options: {
        source: { type: 'string' }, target: { type: 'string' }, 'plan-file': { type: 'string' },
        'export-dir': { type: 'string' }, profile: { type: 'string' }, 'dsh-version': { type: 'string' },
        'dsh-home': { type: 'string' }, 'session-root': { type: 'string' }, workspace: { type: 'string' },
        encoding: { type: 'string' }, 'on-conflict': { type: 'string' }, 'recover-pi-entries': { type: 'boolean' },
      } })
      if (!v.source || !v.target || !v['plan-file']) throw new Error('Pass --source, --target and --plan-file')
      const plan = await planMigration({
        source: v.source, target: v.target as MigrationOptions['target'], workspace: v.workspace,
        profile: v.profile, dshVersion: v['dsh-version'], dshHome: v['dsh-home'],
        sessionRoot: v['session-root'], exportDir: v['export-dir'], encoding: v.encoding as MigrationOptions['encoding'],
        onConflict: v['on-conflict'] as MigrationOptions['onConflict'], recoverPiEntries: v['recover-pi-entries'],
      })
      await fs.writeFile(v['plan-file'], JSON.stringify(plan, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
      print(plan)
      return
    }
    case 'apply': {
      const { values } = parseArgs({ args: rest, options: {
        'plan-file': { type: 'string' }, confirm: { type: 'string' },
      } })
      if (!values['plan-file'] || !values.confirm) throw new Error('Pass --plan-file and the approved --confirm code')
      print(await applyMigration(JSON.parse(await fs.readFile(values['plan-file'], 'utf8')), values.confirm))
      return
    }
    case 'verify-web': {
      const { values } = parseArgs({ args: rest, options: {
        'url-file': { type: 'string' }, 'session-id': { type: 'string' }, events: { type: 'string' },
      } })
      if (!values['url-file'] || !values['session-id'] || !values.events)
        throw new Error('Pass --url-file, --session-id, and --events from the migration receipt')
      print(await verifyWebSession(values['url-file'], values['session-id'], Number(values.events)))
      return
    }
    default:
      if (rest.length || mode?.startsWith('--')) throw new Error(help)
      await interactive(mode)
  }
}
