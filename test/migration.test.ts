import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { applyMigration, findPiSources, planMigration, type MigrationOptions } from '../src/dsh/migration.ts'
import { readDshFile } from '../src/dsh/store.ts'

test('plan and apply require explicit paths and preserve conflicts and source changes', async () => {
  const temp = await fs.mkdtemp(path.join(tmpdir(), 'dcp-migration-test-'))
  try {
    const project = path.join(temp, 'Project 中文')
    const piHome = path.join(temp, 'pi')
    const source = path.join(piHome, 'sessions', 'project', 'session.jsonl')
    const dshHome = path.join(temp, 'dsh')
    for (const dir of [project, path.dirname(source), dshHome]) await fs.mkdir(dir, { recursive: true })
    const timestamp = new Date().toISOString()
    const header = { type: 'session', version: 3, id: 'source-id', cwd: project, timestamp }
    const user = {
      type: 'message', id: 'u', parentId: null, timestamp,
      message: { role: 'user', content: 'Migration fixture' },
    }
    const rows = [header, user].map(JSON.stringify).join('\n') + '\n'
    await fs.writeFile(source, rows)
    const listed = await findPiSources({ piHome, id: header.id })
    assert.deepEqual(listed.map(entry => entry.path), [source])
    const sessionRoot = path.join(dshHome, 'sessions')
    const options: MigrationOptions = {
      source, workspace: project, dshHome, sessionRoot,
      target: process.platform === 'win32' ? 'windows-desktop'
        : process.platform === 'linux' ? 'linux-desktop' : 'web',
      profile: 'desktop', dshVersion: '0.2.3-alpha.2', encoding: 'plain',
    }
    await assert.rejects(planMigration({ ...options, profile: undefined }), /profile/)
    const first = await planMigration(options)
    await assert.rejects(fs.stat(sessionRoot), { code: 'ENOENT' })
    await assert.rejects(applyMigration(first, 'wrong'), /confirmation code/)
    await fs.appendFile(source, '\n')
    await assert.rejects(applyMigration(first, first.confirmation), /changed/)
    await assert.rejects(fs.stat(sessionRoot), { code: 'ENOENT' })
    const approved = await planMigration(options)
    const receipt = await applyMigration(approved, approved.confirmation)
    assert.equal(receipt.status, 'written')
    const original = await fs.readFile(receipt.output)
    await assert.rejects(planMigration(options), /already exists/)
    await assert.rejects(planMigration({ ...options, encoding: 'zstd' }), /different encoding/)
    const duplicate = await planMigration({ ...options, onConflict: 'copy' })
    assert.notEqual(duplicate.sessionId, first.sessionId)
    const second = await applyMigration(duplicate, duplicate.confirmation)
    assert.deepEqual(await fs.readFile(receipt.output), original)
    assert.equal((await readDshFile(second.output))?.header.id, duplicate.sessionId)

    const hybrid = path.join(temp, 'mixed.jsonl')
    const hybridRows = [
      { ...header, version: 4, timestamp: undefined, createdAt: Date.parse(timestamp) },
      { type: 'turn/start', seq: 0, data: { turn: 1 } },
      { type: 'model_change', id: 'model', timestamp, modelId: 'fixture-model', provider: 'fixture' },
      { ...user, parentId: 'model' },
    ].map(JSON.stringify).join('\n') + '\n'
    await fs.writeFile(hybrid, hybridRows)
    const portable = { source: hybrid, target: 'portable', exportDir: temp } as const
    await assert.rejects(planMigration(portable), /explicitly approve/)
    const recover = await planMigration({ ...portable, recoverPiEntries: true })
    assert.equal(recover.mirrorRows, 1)
    const exported = await applyMigration(recover, recover.confirmation)
    assert.equal(exported.status, 'exported')
    assert.equal(exported.attachmentHome, path.dirname(exported.output))
    assert.equal(await fs.readFile(hybrid, 'utf8'), hybridRows)
  } finally {
    await fs.rm(temp, { recursive: true, force: true, maxRetries: 5 })
  }
})
