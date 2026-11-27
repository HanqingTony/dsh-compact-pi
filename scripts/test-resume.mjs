/** Exercise the packaged plugin and replay released sessions on a candidate pi host. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { Session, imageOffloadProjection } from '../vendor/dsh-runtime.mjs'

const root = path.resolve(import.meta.dirname, '..')
const piPackage = '@earendil-works/pi-coding-agent'
const baselinePi = '1.5.2'
const baselineRevision = '1f43099c0273a3edcbe5353a4aaf32884efd1fc9' // DCP 0.2.2b3
const candidate = process.argv[2] ?? process.env.DCP_TEST_PI_VERSION ?? '1.6.1'
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
const dir = process.env.DCP_TEST_WORK_DIR

function npm(args, options) {
  // npm.cmd cannot be launched directly by execFile on Windows.
  assert.ok(process.env.npm_execpath, 'Run this test with npm run test:resume')
  return execFileSync(process.execPath, [process.env.npm_execpath, ...args], options)
}

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

async function run(pi, kind, extension, { source, expected = [], manual = false, image } = {}) {
  const cwd = path.join(dir, kind)
  mkdirSync(path.join(cwd, '.pi'), { recursive: true })
  writeFileSync(path.join(cwd, '.pi/dcp.json'), JSON.stringify({
    audit: false,
    policy: { auto: !source && !manual, headroomTokens: 512, retainTokens: 256, maxTokens: 1024 },
  }))
  const settings = pi.SettingsManager.inMemory({
    compaction: { enabled: false, keepRecentTokens: 256 },
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
      id: 'stub', name: 'stub', reasoning: false, input: ['text', 'image'],
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
  const tailText = tail.repeat(80)
  if (!source) {
    manager.appendMessage({ role: 'user', content: oldHistory.repeat(2200), timestamp: 1 })
    manager.appendMessage({
      role: 'assistant', api: model.api, provider: model.provider, model: model.id,
      content: [{ type: 'text', text: 'Earlier answer' }], timestamp: 2, usage, stopReason: 'stop',
    })
    if (manual) {
      manager.appendMessage({
        role: 'user', content: [{ type: 'text', text: tailText }, image], timestamp: 3,
      })
    }
  }
  const { session } = await pi.createAgentSession({
    cwd, agentDir: cwd, modelRuntime: runtime, model, sessionManager: manager,
    settingsManager: settings, resourceLoader: loader, noTools: 'all',
  })
  const errors = []
  try {
    await session.bindExtensions({ mode: 'print', onError: (error) => errors.push(error) })
    if (manual) await session.compact()
    const options = image && !source && !manual ? { images: [image] } : undefined
    await session.prompt(source || manual ? next : tailText, options)
    assert.deepEqual(errors, [], `${kind}: extension errors`)
    const request = calls.at(-1)
    assert.ok(request && !request.isSummary, `${kind}: model request missing`)
    const input = JSON.stringify(request.messages)
    assert.ok(input.includes(summary), `${kind}: prior summary missing`)
    assert.ok(input.includes(tail), `${kind}: retained user message missing`)
    assert.ok(!input.includes(oldHistory), `${kind}: compacted prefix reappeared`)
    assert.ok(!input.includes('DCP_ABANDONED_BRANCH'), `${kind}: inactive branch leaked`)
    for (const marker of expected) assert.ok(input.includes(marker), `${kind}: ${marker} missing`)
    if (source || manual) {
      assert.equal(request.messages.at(-1)?.role, 'user')
      assert.ok(JSON.stringify(request.messages.at(-1)).includes(next), `${kind}: latest prompt missing`)
    }
    if (image) {
      const images = request.messages.flatMap((message) =>
        Array.isArray(message.content) ? message.content.filter((part) => part.type === 'image') : [],
      )
      assert.deepEqual(images, [image], `${kind}: retained image missing or changed`)
    }
    if (source) {
      assert.equal(calls.length, 1, `${kind}: recovery must reuse the existing summary`)
    } else {
      assert.equal(calls.filter((call) => call.isSummary).length, 1)
      return manager.getSessionFile()
    }
  } finally {
    session.dispose()
  }
}

function convert(cli, command, input, output) {
  execFileSync(process.execPath, [cli, command, input, output], {
    env: { ...process.env, DSH_HOME: path.join(dir, 'dsh-home') },
  })
}

async function verifyMigration(pi, kind, { extension, cli }, input, expected) {
  const exportFile = path.join(dir, `${kind}.dsh.jsonl`)
  const roundTrip = path.join(dir, `${kind}-roundtrip.pi.jsonl`)
  convert(cli, 'pi2dsh', input, exportFile)
  convert(cli, 'dsh2pi', exportFile, roundTrip)
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
  convert(cli, 'dsh2pi', exportFile, returned)
  await run(pi, `${kind}-after-dsh`, extension, { source: returned, expected: [continued, ...expected] })
}

async function verify() {
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
  const baselineFile = await run(baseline, 'baseline', baselineExtension)
  const rows = readFileSync(baselineFile, 'utf8').trimEnd().split('\n')
  const entries = rows.map((row) => JSON.parse(row))
  const journal = entries.findIndex((entry) =>
    entry.customType === 'dcp/transaction-v1' && entry.data?.info?.summaries > 0,
  )
  assert.ok(journal > 0, 'baseline did not persist a summary transaction')
  assert.ok(entries.slice(journal + 1).some((entry) => entry.type === 'compaction'),
    'baseline did not commit a native compaction')
  const packed = JSON.parse(npm(
    ['pack', '--json', '--ignore-scripts', '--pack-destination', dir], { cwd: root, encoding: 'utf8' },
  ))
  const [tarball] = Object.values(packed)
  const candidateDir = path.join(dir, 'candidate')
  npm([
    'install', '--prefix', candidateDir, '--no-audit', '--no-fund', '--ignore-scripts',
    `${piPackage}@${candidate}`, path.join(dir, tarball.filename),
  ], { stdio: 'inherit' })
  const upgraded = await host(candidateDir, candidate)
  const installed = path.join(candidateDir, 'node_modules/dsh-compact-pi')
  const manifest = JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8'))
  const extension = path.join(installed, manifest.pi.extensions[0])
  const cli = path.join(installed, manifest.bin['dcp-session'])
  const image = {
    type: 'image', mimeType: 'image/png',
    data: (await sharp({
      create: { width: 24, height: 16, channels: 3, background: 'red' },
    }).png().toBuffer()).toString('base64'),
  }
  for (const [mode, trigger] of [['automatic', 'pressure'], ['manual', 'manual']]) {
    const file = await run(upgraded, mode, extension, { image, manual: trigger === 'manual' })
    const session = readFileSync(file, 'utf8').trimEnd().split('\n').map(JSON.parse)
    const checkpoint = session.find((entry) => entry.type === 'compaction' && entry.summary.includes(summary))
    assert.equal(checkpoint?.details?.engine, 'deepseek-harness', `${mode}: no DCP checkpoint persisted`)
    assert.equal(checkpoint.details.dcp?.trigger, trigger)
    const assets = readdirSync(path.join(path.dirname(file), '.dcp-assets'), {
      recursive: true, withFileTypes: true,
    })
    assert.ok(assets.some((entry) => entry.isFile()), `${mode}: no image assets saved`)
    await run(upgraded, `${mode}-reopen`, extension, { source: file, image })
    console.log(`${process.platform}: pi ${candidate} ${mode} compaction and image resume passed`)
  }
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
    await verifyMigration(upgraded, kind, { extension, cli }, migrationInput, expected)
    await run(upgraded, kind, extension, { source: file })
    console.log(`pi ${baselinePi} → ${candidate}: ${kind} resume and DSH round trip passed`)
  }
}

if (dir) {
  await verify()
} else {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'dcp-pi-resume-'))
  try {
    const result = spawnSync(process.execPath, [import.meta.filename, candidate], {
      env: { ...process.env, DCP_TEST_WORK_DIR: temporary },
      stdio: 'inherit',
    })
    if (result.error) throw result.error
    process.exitCode = result.status ?? 1
  } finally {
    // Windows holds native modules open until the test process exits.
    rmSync(temporary, { recursive: true, force: true, maxRetries: 5 })
  }
}
