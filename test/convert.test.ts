/** pi JSONL <-> DSH JSONL conversion round-trip. */

import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { dshToPi, piToDsh, readPiSession } from '../src/dsh/convert.ts'
import { readDshFile } from '../src/dsh/store.ts'

const long = (label: string) => `${label} `.repeat(200)
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-pi-convert-'))
const piFile = path.join(dir, 'session.jsonl')
const dshFile = path.join(dir, 'session.dsh.jsonl')
const backFile = path.join(dir, 'session.back.jsonl')

const piRows = [
  { type: 'session', version: 3, id: 'convert-test', timestamp: new Date().toISOString(), cwd: '/tmp' },
  { type: 'message', id: 'u1', parentId: null, timestamp: new Date().toISOString(), message: { role: 'user', content: long('question') } },
  {
    type: 'message',
    id: 'a1',
    parentId: 'u1',
    timestamp: new Date().toISOString(),
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: long('answer') }],
      api: 'dsh',
      provider: 'fake',
      model: 'fake',
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: 'stop',
    },
  },
]
await fs.writeFile(piFile, piRows.map((row) => JSON.stringify(row)).join('\n') + '\n')

const toDsh = await piToDsh(piFile, dshFile)
assert.equal(toDsh.messages, 2)
const dsh = await readDshFile(dshFile)
assert.ok(dsh)
assert.equal(dsh!.header.id, 'convert-test')
assert.ok(dsh!.events.some((event) => event.type === 'user/message'))
assert.ok(dsh!.events.some((event) => event.type === 'assistant/message'))

const toPi = await dshToPi(dshFile, backFile)
assert.equal(toPi.messages, 2)
const back = await readPiSession(backFile)
assert.equal(back.entries.length, 2)
assert.equal(back.entries[0].message.role, 'user')
assert.equal(back.entries[1].message.role, 'assistant')

console.log('convert ok', { dshEvents: dsh!.events.length, backEntries: back.entries.length, dir })
