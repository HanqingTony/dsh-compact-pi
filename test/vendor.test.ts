/** Byte identity, not just bundle identity, is the upgrade contract. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import manifest from '../vendor/manifest.json' with { type: 'json' }
test('the complete vendored source closure is unchanged and core imports never use lib artifacts', () => {
  for (const input of manifest.inputs) {
    const file = path.resolve('vendor', manifest.sourceDirectory, input.file)
    assert.equal(
      createHash('sha256').update(readFileSync(file)).digest('hex'),
      input.sha256,
      input.file,
    )
    if (input.file.startsWith('packages/') || input.file.startsWith('vendor/'))
      assert.ok(!input.file.includes('/lib/'), input.file)
  }
  for (const edge of manifest.resolutions)
    if (!('external' in edge) && edge.target.startsWith('packages/'))
      assert.ok(
        edge.target.includes('/src/') || edge.target.endsWith('/package.json'),
        edge.target,
      )
})
