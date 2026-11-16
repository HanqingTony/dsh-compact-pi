/** Synchronous core codec used by the pi session-manager patch. */

import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  appendPiEntry,
  isDshFile,
  readDshAsPi,
  readPiHeader,
  writeDshFromPi,
} from '../src/codec.ts'

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-pi-codec-'))
const file = path.join(dir, 'session.jsonl')
const header = {
  type: 'session' as const,
  version: 3,
  id: 'codec-test',
  timestamp: new Date().toISOString(),
  cwd: '/tmp',
}
const entries = [
  {
    type: 'message',
    id: 'u1',
    parentId: null,
    timestamp: new Date().toISOString(),
    message: { role: 'user', content: 'hello' },
  },
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
      usage: {
        input: 1,
        output: 1,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 2,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'stop',
    },
  },
]
writeDshFromPi(file, header as any, entries as any)
assert.equal(isDshFile(file), true)
assert.equal(readPiHeader(file)?.id, 'codec-test')
const first = readDshAsPi(file)
assert.equal(first.entries.length, 2)
appendPiEntry(file, {
  type: 'message',
  id: 'u2',
  parentId: 'a1',
  timestamp: new Date().toISOString(),
  message: { role: 'user', content: 'second' },
} as any)
const second = readDshAsPi(file)
assert.equal(second.entries.length, 3)
assert.deepEqual(
  second.entries.map((entry) => entry.message.role),
  ['user', 'assistant', 'user'],
)
console.log('codec ok', {
  events: (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean).length,
})

// Non-message entries and the branch graph must survive conversion exactly.
const metadata = [
  {
    type: 'model_change',
    id: 'model',
    parentId: 'u2',
    timestamp: new Date().toISOString(),
    provider: 'test',
    modelId: 'test',
  },
  {
    type: 'thinking_level_change',
    id: 'thinking',
    parentId: 'model',
    timestamp: new Date().toISOString(),
    thinkingLevel: 'high',
  },
  {
    type: 'custom',
    id: 'state',
    parentId: 'thinking',
    timestamp: new Date().toISOString(),
    customType: 'extension/state',
    data: { keep: true },
  },
  {
    type: 'session_info',
    id: 'name',
    parentId: 'state',
    timestamp: new Date().toISOString(),
    name: 'Keep this name',
  },
  {
    type: 'message',
    id: 'branch',
    parentId: 'u1',
    timestamp: new Date().toISOString(),
    message: { role: 'user', content: 'new branch', timestamp: 42 },
  },
]
for (const entry of metadata) appendPiEntry(file, entry)
const archived = readDshAsPi(file)!
assert.deepEqual(archived.entries.slice(-metadata.length), metadata)
assert.deepEqual(archived.entries.slice(0, 2), entries)

// Archives created before the project rename remain lossless.
await fs.writeFile(
  file,
  (await fs.readFile(file, 'utf8')).replaceAll('plugin:dcp/', 'plugin:zcp/'),
)
assert.deepEqual(readDshAsPi(file), archived)
