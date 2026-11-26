/** Replay sessions produced by a released DCP bundle on a candidate pi host. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Session, imageOffloadProjection } from '../vendor/dsh-runtime.mjs'

const root = path.resolve(import.meta.dirname, '..')
const piPackage = '@earendil-works/pi-coding-agent'
const baselinePi = '1.5.2'
const baselineRevision = '1f43099c0273a3edcbe5353a4aaf32884efd1fc9' // DCP 0.2.2b3
const candidate = process.argv[2] ?? process.env.DCP_TEST_PI_VERSION ?? '1.6.0'
assert.match(candidate, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/, 'Pass an exact pi version')
const summary = 'DCP_RESUME_SUMMARY'
const tail = 'DCP_RETAINED_TAIL'
const next = 'DCP_NEW_USER_REQUEST'
const oldHistory = 'DCP_REMOVED_PREFIX'
const continued = 'DCP_REQUEST_FROM_DSH'
const usage = {
  input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
}
const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-pi-resume-'))

async function host(prefix, expectedVersion) {
  const packageDir = path.join(prefix, 'node_modules', piPackage)
  const manifest = path.join(packageDir, 'package.json')
  assert.equal(JSON.parse(readFileSync(manifest, 'utf8')).version, expectedVersion)
  const sdk = await import(pathToFileURL(path.join(packageDir, 'dist/index.js')))
  const ai = await import(pathToFileURL(
    path.join(prefix, 'node_modules/@earendil-works/pi-ai/dist/index.js'),
  ))
  return { ...sdk, ...ai }
}

async function run(pi, kind, extension, source, expected = []) {
  const cwd = path.join(dir, kind)
  mkdirSync(path.join(cwd, '.pi'), { recursive: true })
  writeFileSync(path.join(cwd, '.pi/dcp.json'), JSON.stringify({
    audit: false,
    policy: { auto: !source, headroomTokens: 512, retainTokens: 256, maxTokens: 1024 },
  }))
  const settings = pi.SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: false },
  })
  const loader = new pi.DefaultResourceLoader({
    cwd, agentDir: cwd, settingsManager: settings, noExtensions: true,
    additionalExtensionPaths: [extension],
    disabledBuiltinExtensions: ['mcp', 'codemode', 'tool-search'],
    noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    systemPrompt: 'Synthetic compatibility test.',
  })
  await loader.reload()
  assert.deepEqual(loader.getExtensions().errors, [])
  const runtime = await pi.ModelRuntime.create({
    credentials: new pi.InMemoryCredentialStore(),
    modelsStore: new pi.InMemoryModelsStore(),
    modelsPath: null, refreshOnCreate: false,
  })
  const calls = []
  runtime.registerProvider('dcp-resume-test', {
    api: 'dcp-resume-test', apiKey: 'stub', baseUrl: 'https://unused.invalid',
    models: [{
      id: 'stub', name: 'stub', reasoning: false, input: ['text'],
      contextWindow: 8000, maxTokens: 1024, cost: usage.cost,
    }],
    streamSimple(model, context) {
      const isSummary = JSON.stringify(context.messages.at(-1))
        .includes('You are now acting as a compaction engine')
      calls.push({ isSummary, messages: context.messages })
      const message = {
        role: 'assistant', api: model.api, provider: model.provider, model: model.id,
        content: [{ type: 'text', text: isSummary ? summary : 'Synthetic answer' }],
        usage, stopReason: 'stop', timestamp: Date.now(),
      }
      const stream = pi.createAssistantMessageEventStream()
      stream.push({ type: 'start', partial: message })
      stream.push({ type: 'done', reason: 'stop', message })
      stream.end(message)
      return stream
    },
  })
  const manager = source
    ? pi.SessionManager.open(source)
    : pi.SessionManager.create(cwd, cwd)
  const model = runtime.getModel('dcp-resume-test', 'stub')
  if (!source) {
    manager.appendMessage({ role: 'user', content: oldHistory.repeat(2200), timestamp: 1 })
    manager.appendMessage({
      role: 'assistant', api: model.api, provider: model.provider, model: model.id,
      content: [{ type: 'text', text: 'Earlier answer' }], timestamp: 2, usage, stopReason: 'stop',
    })
  }
  const { session } = await pi.createAgentSession({
    cwd, agentDir: cwd, modelRuntime: runtime, model, sessionManager: manager,
    settingsManager: settings, resourceLoader: loader, noTools: 'all',
  })
  const errors = []
  try {
    await session.bindExtensions({ mode: 'print', onError: (error) => errors.push(error) })
    await session.prompt(source ? next : tail.repeat(80))
    assert.deepEqual(errors, [], `${kind}: extension errors`)
    const request = calls.at(-1)
    assert.ok(request && !request.isSummary, `${kind}: model request missing`)
    const input = JSON.stringify(request.messages)
    assert.ok(input.includes(summary), `${kind}: prior summary missing`)
    assert.ok(input.includes(tail), `${kind}: retained user message missing`)
    assert.ok(!input.includes(oldHistory), `${kind}: compacted prefix reappeared`)
    assert.ok(!input.includes('DCP_ABANDONED_BRANCH'), `${kind}: inactive branch leaked`)
    for (const marker of expected) assert.ok(input.includes(marker), `${kind}: ${marker} missing`)
    if (source) {
      assert.equal(calls.length, 1, `${kind}: recovery must reuse the existing summary`)
      assert.equal(request.messages.at(-1)?.role, 'user')
      assert.ok(JSON.stringify(request.messages.at(-1)).includes(next), `${kind}: latest prompt missing`)
    } else {
      assert.equal(calls.filter((call) => call.isSummary).length, 1)
      return readFileSync(manager.getSessionFile(), 'utf8').trimEnd().split('\n')
    }
  } finally {
    session.dispose()
  }
}

function convert(command, input, output) {
  execFileSync(process.execPath, [
    path.join(root, 'dist/dcp-session.mjs'), command, input, output,
  ], { env: { ...process.env, DSH_HOME: path.join(dir, 'dsh-home') } })
}

async function verifyMigration(pi, kind, extension, input, expected) {
  const exportFile = path.join(dir, `${kind}.dsh.jsonl`)
  const roundTrip = path.join(dir, `${kind}-roundtrip.pi.jsonl`)
  convert('pi2dsh', input, exportFile)
  convert('dsh2pi', exportFile, roundTrip)
  const read = (file) => readFileSync(file, 'utf8').trimEnd().split('\n').map(JSON.parse)
  assert.deepEqual(read(roundTrip), read(input), `${kind}: pi archive round trip`)

  const [header, ...events] = read(exportFile)
  const { type: _type, ...metadata } = header
  const dsh = Session.create(header.id, events, metadata, 0, [imageOffloadProjection])
  const messages = dsh.surface.nodes
    .map((seq) => dsh.deriveEventMessage(dsh.eventAt(seq)))
    .filter(Boolean)
  const surface = JSON.stringify(messages)
  for (const marker of [summary, tail, ...expected])
    assert.ok(surface.includes(marker), `${kind}: DSH lost ${marker}`)
  for (const marker of [oldHistory, 'DCP_ABANDONED_BRANCH'])
    assert.ok(!surface.includes(marker), `${kind}: DSH unexpectedly kept ${marker}`)
  const turn = Math.max(0, ...events.filter((event) => event.type === 'turn/start').map((event) => event.data.turn)) + 1
  dsh.append('turn/start', { turn })
  dsh.append('user/message', {
    role: 'user', id: 'dsh-continued', source: { kind: 'user' },
    content: [{ type: 'text', text: continued }],
  }, { surfaceOp: 'append' })
  writeFileSync(exportFile, [header, ...dsh.snapshotEvents()].map(JSON.stringify).join('\n') + '\n')
  const returned = path.join(dir, `${kind}-continued.pi.jsonl`)
  convert('dsh2pi', exportFile, returned)
  await run(pi, `${kind}-after-dsh`, extension, returned, [continued, ...expected])
}

try {
  const baselinePackage = path.join(dir, 'baseline-package')
  for (const file of ['package.json', 'vendor/manifest.json', 'dist/index.js']) {
    const destination = path.join(baselinePackage, file)
    mkdirSync(path.dirname(destination), { recursive: true })
    writeFileSync(destination, execFileSync(
      'git', ['show', `${baselineRevision}:${file}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 },
    ))
  }
  const baselineExtension = path.join(baselinePackage, 'dist/index.js')
  symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'junction')
  const baseline = await host(root, baselinePi)
  const rows = await run(baseline, 'baseline', baselineExtension)
  const entries = rows.map((row) => JSON.parse(row))
  const journal = entries.findIndex((entry) =>
    entry.customType === 'dcp/transaction-v1' && entry.data?.info?.summaries > 0,
  )
  assert.ok(journal > 0, 'baseline did not persist a summary transaction')
  assert.ok(entries.slice(journal + 1).some((entry) => entry.type === 'compaction'),
    'baseline did not commit a native compaction')
  const candidateDir = path.join(dir, 'candidate')
  execFileSync('npm', [
    'install', '--prefix', candidateDir, '--no-audit', '--no-fund', '--ignore-scripts',
    `${piPackage}@${candidate}`,
  ], { stdio: 'inherit' })
  const upgraded = await host(candidateDir, candidate)
  const extension = path.join(root, 'dist/index.js')
  for (const [kind, snapshot] of [['native', rows], ['journal-only', rows.slice(0, journal + 1)]]) {
    const file = path.join(dir, `${kind}.jsonl`)
    writeFileSync(file, snapshot.join('\n') + '\n')
    const migrationInput = path.join(dir, `${kind}-migration.pi.jsonl`)
    const firstUser = entries.find((entry) => entry.message?.role === 'user')
    const branch = {
      ...firstUser, id: 'inactive-branch',
      message: { ...firstUser.message, content: 'DCP_ABANDONED_BRANCH' },
    }
    const migrationRows = [snapshot[0], JSON.stringify(branch), ...snapshot.slice(1)]
    const expected = []
    if (kind === 'native') {
      const retained = entries.find((entry) =>
        entry.message?.role === 'user' && JSON.stringify(entry.message.content).includes(tail))
      expected.push('DCP_NATIVE_CONTEXT_EDIT')
      migrationRows.push(JSON.stringify({
        type: 'context_edit', id: 'migration-edit', parentId: entries.at(-1).id,
        timestamp: entries.at(-1).timestamp, targetId: retained.id,
        replacement: { content: `${tail} ${expected[0]}` },
      }))
    }
    writeFileSync(migrationInput, migrationRows.join('\n') + '\n')
    await verifyMigration(upgraded, kind, extension, migrationInput, expected)
    await run(upgraded, kind, extension, file)
    console.log(`pi ${baselinePi} → ${candidate}: ${kind} resume and DSH round trip passed`)
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}
