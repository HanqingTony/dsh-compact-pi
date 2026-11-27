/** pi JSONL <-> DSH JSONL conversion round-trip. */

import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { zstdDecompressSync } from 'node:zlib'
import { dshRowsFromPi, archivedPi } from '../src/codec.ts'
import { dshToPi, piToDsh, readPiSession } from '../src/dsh/convert.ts'
import { importPiToDsh } from '../src/dsh/import.ts'
import { readDshFile } from '../src/dsh/store.ts'

const long = (label: string) => `${label} `.repeat(200)
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-pi-convert-'))
const piFile = path.join(dir, 'session.jsonl')
const dshFile = path.join(dir, 'session.dsh.jsonl')
const backFile = path.join(dir, 'session.back.jsonl')

const piRows = [
  {
    type: 'session',
    version: 3,
    id: 'convert-test',
    timestamp: new Date().toISOString(),
    cwd: path.join(dir, '项目'),
  },
  {
    type: 'message',
    id: 'u1',
    parentId: null,
    timestamp: new Date().toISOString(),
    message: { role: 'user', content: long('question') },
  },
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
await fs.writeFile(
  piFile,
  piRows.map((row) => JSON.stringify(row)).join('\n') + '\n',
)

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

function sessionRows(bytes: Buffer) {
  return bytes.toString('utf8').trimEnd().split('\n').map((line) => {
    const { time: _time, ...row } = JSON.parse(line)
    return row
  })
}

for (const plain of [false, true]) {
  const root = path.join(dir, plain ? 'plain' : 'zstd')
  const imported = await importPiToDsh(piFile, root, plain)
  assert.equal(imported.sessionId, piRows[0].id)
  assert.equal(imported.cwd, piRows[0].cwd)
  assert.match(path.basename(path.dirname(path.dirname(imported.output))), /~9879~76EE--$/)
  const bytes = await fs.readFile(imported.output)
  assert.deepEqual(
    sessionRows(plain ? bytes : zstdDecompressSync(bytes)),
    sessionRows(await fs.readFile(dshFile)),
  )
  await assert.rejects(importPiToDsh(piFile, root, plain), /session already exists/)
  await assert.rejects(importPiToDsh(piFile, root, !plain), /different encoding/)
  assert.deepEqual(await fs.readFile(imported.output), bytes)
}

const [header, user, assistant] = piRows
const system = {
  ...user, id: 'system', message: { role: 'system', content: 'Historical system prompt' },
}
const withTools = {
  ...assistant,
  message: {
    ...assistant!.message,
    stopReason: 'toolUse',
    content: [
      { type: 'text', text: 'Still visible' },
      { type: 'toolCall', id: 'finished', name: 'read', arguments: {} },
      { type: 'toolCall', id: 'unfinished', name: 'read', arguments: {} },
    ],
  },
}
const toolResult = {
  ...assistant, id: 'result', parentId: assistant!.id,
  message: { role: 'toolResult', toolCallId: 'finished', toolName: 'read', content: [{ type: 'text', text: 'OK' }] },
}
const entries = [
  system, { ...user, parentId: system.id }, withTools, toolResult,
  { ...toolResult, id: 'orphan', parentId: toolResult.id, message: { ...toolResult.message, toolCallId: 'missing' } },
]
const [dshHeader, ...log] = sessionRows(Buffer.from(
  dshRowsFromPi(header as Parameters<typeof dshRowsFromPi>[0], entries),
))
const systemIndex = log.findIndex((event) => event.type === 'system/message')
assert.ok(systemIndex > 0)
assert.equal(log[systemIndex - 1].type, 'step/start')
for (const coordinate of ['turn', 'step'])
  assert.equal(log[systemIndex].data[coordinate], log[systemIndex - 1].data[coordinate])
assert.deepEqual(log.filter((e) => e.type === 'tool/call').map((e) => e.data.callId), ['finished'])
assert.deepEqual(log.filter((e) => e.type === 'tool/result').map((e) => e.data.message.toolCallId), ['finished'])
assert.deepEqual(archivedPi(dshHeader, log)?.entries, JSON.parse(JSON.stringify(entries)))

console.log('convert ok', {
  dshEvents: dsh!.events.length,
  backEntries: back.entries.length,
  dir,
})
