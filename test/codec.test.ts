/** Synchronous core codec used by the pi session-manager patch. */

import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { appendPiEntry, isDshFile, readDshAsPi, readPiHeader, writeDshFromPi } from '../src/codec.ts'

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-pi-codec-'))
const file = path.join(dir, 'session.jsonl')
const header = { type: 'session' as const, version: 3, id: 'codec-test', timestamp: new Date().toISOString(), cwd: '/tmp' }
const entries = [
  { type: 'message', id: 'u1', parentId: null, timestamp: new Date().toISOString(), message: { role: 'user', content: 'hello' } },
  {
    type: 'message',
    id: 'a1',
    parentId: 'u1',
    timestamp: new Date().toISOString(),
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'hi' }],
      api: 'x',
      provider: 'x',
      model: 'x',
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: 'stop',
    },
  },
]
writeDshFromPi(file, header as any, entries as any)
assert.equal(isDshFile(file), true)
assert.equal(readPiHeader(file)?.id, 'codec-test')
const first = readDshAsPi(file)
assert.equal(first.entries.length, 2)
appendPiEntry(file, { type: 'message', id: 'u2', parentId: 'a1', timestamp: new Date().toISOString(), message: { role: 'user', content: 'second' } } as any)
const second = readDshAsPi(file)
assert.equal(second.entries.length, 3)
assert.deepEqual(second.entries.map((entry) => entry.message.role), ['user', 'assistant', 'user'])
console.log('codec ok', { events: (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean).length })
