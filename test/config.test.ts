import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadConfig } from '../src/config.ts'
import dcp from '../src/index.ts'

test('summary model command saves and resets the project default without losing legacy settings', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-summary-model-'))
  try {
    mkdirSync(path.join(dir, '.pi'))
    const modelPolicies = [{ provider: 'other', model: 'chat', summarizationProvider: 'other', summarizationModel: 'summary' }]
    writeFileSync(path.join(dir, '.pi/zcp.json'), JSON.stringify({
      audit: false,
      policy: { retainTokens: 123, modelPolicies },
    }))
    const commands = new Map<string, any>()
    const events = new Map<string, any>()
    dcp({
      registerMarkdownTransformer() {},
      registerCommand: (name: string, command: unknown) => commands.set(name, command),
      on: (name: string, handler: unknown) => events.set(name, handler),
    } as any)
    const notices: string[] = []
    let choice: string | undefined
    let reloads = 0
    const ctx = {
      cwd: dir,
      hasUI: true,
      isIdle: () => true,
      sessionManager: { getBranch: () => [] },
      model: { provider: 'chat', id: 'main' },
      modelRegistry: { getAvailable: () => [{ provider: 'local', id: 'summary/v1' }] },
      ui: {
        notify: (message: string) => notices.push(message),
        select: async (_title: string, options: string[]) => {
          assert.ok(options.includes('local/summary/v1'))
          return choice
        },
      },
      reload: async () => {
        reloads++
        await events.get('session_shutdown')()
        await events.get('session_start')({}, ctx)
      },
    }
    await events.get('session_start')({}, ctx)
    const select = commands.get('dcp-summary-model').handler
    await select('', ctx)
    assert.equal(reloads, 0)
    choice = 'local/summary/v1'
    await select('', ctx)
    await commands.get('dcp-status').handler('', ctx)
    assert.match(notices.at(-1)!, /Summary model default: local\/summary\/v1/)
    assert.equal(ctx.model.id, 'main')
    assert.equal((await loadConfig(dir)).policy.summarizationModel, 'summary/v1')
    await select('reset', ctx)
    assert.equal(reloads, 2)
    assert.deepEqual(await loadConfig(dir), {
      audit: false,
      policy: { retainTokens: 123, modelPolicies },
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('configuration validates upstream policy fields and exact model overrides', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-config-'))
  try {
    assert.deepEqual(await loadConfig(dir), { policy: {}, audit: true })
    mkdirSync(path.join(dir, '.pi'))
    writeFileSync(
      path.join(dir, '.pi/zcp.json'),
      JSON.stringify({ audit: true, policy: { retainTokens: 99 } }),
    )
    assert.equal((await loadConfig(dir)).policy.retainTokens, 99)
    const file = path.join(dir, '.pi/dcp.json')
    writeFileSync(
      file,
      JSON.stringify({
        audit: false,
        policy: {
          retainTokens: 100,
          modelPolicies: [
            { provider: 'local', model: 'small', thresholdRatio: 0.7 },
          ],
        },
      }),
    )
    assert.equal((await loadConfig(dir)).audit, false)
    for (const invalid of [
      { unknown: true },
      { policy: { retainRatio: 0.9, thresholdRatio: 0.5 } },
      { policy: { summarizationProvider: 'only-provider' } },
      { policy: { misspelled: 1 } },
      { audit: 'yes' },
    ]) {
      writeFileSync(file, JSON.stringify(invalid))
      await assert.rejects(loadConfig(dir))
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
