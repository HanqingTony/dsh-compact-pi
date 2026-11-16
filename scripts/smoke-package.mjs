/** Verify the shipped tarball in a directory with no checkout or DSH links. */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { snapshotBuild, sha } from './dsh-vendor-lib.mjs'
import sharp from 'sharp'
import { pathToFileURL } from 'node:url'
import {
  DefaultResourceLoader,
  SettingsManager,
} from '@earendil-works/pi-coding-agent'
const root = path.resolve(import.meta.dirname, '..')
const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-package-'))
try {
  const report = JSON.parse(
    execFileSync('npm', ['pack', '--json'], { cwd: root, encoding: 'utf8' }),
  )
  const packed = Array.isArray(report) ? report : Object.values(report)
  const tarball = path.join(root, packed[0].filename)
  execFileSync(
    'npm',
    [
      'install',
      '--prefix',
      dir,
      '--omit=dev',
      '--ignore-scripts',
      '--package-lock=false',
      '--no-audit',
      '--no-fund',
      tarball,
    ],
    { stdio: 'pipe' },
  )
  const installed = path.join(dir, 'node_modules/dsh-compact-pi')
  const manifest = JSON.parse(
    readFileSync(path.join(installed, 'package.json'), 'utf8'),
  )
  assert.ok(existsSync(path.join(installed, 'vendor/LICENSE-DeepSeek')))
  assert.ok(existsSync(path.join(installed, 'vendor/LICENSE-pi')))
  const pinned = JSON.parse(
    readFileSync(path.join(installed, 'vendor/manifest.json'), 'utf8'),
  )
  for (const input of pinned.inputs)
    assert.equal(
      sha(
        readFileSync(
          path.join(installed, 'vendor', pinned.sourceDirectory, input.file),
        ),
      ),
      input.sha256,
      input.file,
    )
  const rebuilt = path.join(dir, 'rebuilt-dsh.mjs')
  await snapshotBuild(path.join(installed, 'vendor'), rebuilt)
  assert.equal(
    sha(readFileSync(rebuilt)),
    pinned.runtimeSha256,
    'source-only rebuild without a DSH checkout',
  )
  const plugin = path.join(installed, manifest.pi.extensions[0])
  assert.equal(
    typeof (await import(pathToFileURL(plugin).href)).default,
    'function',
  )
  // Execute the installed bundle's image path, including its lazy native dependency.
  const handlers = new Map()
  const activate = (await import(pathToFileURL(plugin).href)).default
  activate({
    registerMarkdownTransformer() {},
    registerCommand() {},
    on: (name, handler) => handlers.set(name, handler),
    getAllTools: () => [],
    getActiveTools: () => [],
    appendEntry: () => {
      throw new Error('below-pressure image should not create a journal')
    },
  })
  const image = {
    type: 'image',
    mimeType: 'image/png',
    data: (
      await sharp({
        create: { width: 24, height: 16, channels: 3, background: 'red' },
      })
        .png()
        .toBuffer()
    ).toString('base64'),
  }
  const context = {
    cwd: dir,
    model: {
      provider: 'fake',
      id: 'fake',
      input: ['text', 'image'],
      contextWindow: 200000,
      maxTokens: 8192,
    },
    sessionManager: {
      getSessionId: () => 'package-image',
      getLeafId: () => undefined,
      getBranch: () => [],
      getSessionFile: () => path.join(dir, 'session.jsonl'),
    },
    modelRegistry: {
      find: () => undefined,
      complete: () => {
        throw new Error('unexpected summary')
      },
    },
    getSystemPrompt: () => 'test',
    ui: {
      notify: (message) => {
        throw new Error(message)
      },
    },
  }
  await handlers.get('session_start')({}, context)
  try {
    const result = await handlers.get('context')(
      { messages: [{ role: 'user', content: [image], timestamp: 1 }] },
      context,
    )
    assert.deepEqual(result.messages[0].content, [image])
  } finally {
    await handlers.get('session_shutdown')()
  }
  const loader = new DefaultResourceLoader({
    cwd: dir,
    agentDir: path.join(dir, 'agent'),
    settingsManager: SettingsManager.inMemory(),
    noExtensions: true,
    additionalExtensionPaths: [plugin],
    disabledBuiltinExtensions: ['mcp', 'codemode', 'tool-search'],
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  })
  await loader.reload()
  assert.deepEqual(loader.getExtensions().errors, [])
  assert.equal(loader.getExtensions().extensions.length, 1)
  execFileSync(
    process.execPath,
    [
      path.join(
        root,
        'node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js',
      ),
      'install',
      installed,
    ],
    {
      cwd: dir,
      env: { ...process.env, PI_CODING_AGENT_DIR: path.join(dir, 'agent') },
      stdio: 'pipe',
    },
  )
  const settings = JSON.parse(
    readFileSync(path.join(dir, 'agent/settings.json'), 'utf8'),
  )
  assert.ok(
    settings.packages.some((source) => {
      const configured = typeof source === 'string' ? source : source.source
      return (
        configured === installed ||
        path.resolve(path.join(dir, 'agent'), configured) === installed
      )
    }),
    JSON.stringify(settings.packages),
  )
  console.log(
    `Isolated npm install, image execution, pi install and extension loading passed: ${packed[0].filename}`,
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}
