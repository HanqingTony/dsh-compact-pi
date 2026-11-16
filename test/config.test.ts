import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadConfig } from '../src/config.ts'

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
