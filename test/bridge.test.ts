/** End-to-end bridge test: pi entries -> DSH session -> engine -> projection. */

import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createSession } from '../src/dsh/session.ts'
import { createSyncState, syncPiEntries, closeTurn } from '../src/dsh/sync.ts'
import { projectSurface } from '../src/dsh/projection.ts'
import { writeDshFile, readDshFile, dshFileFor } from '../src/dsh/store.ts'
import {
  createEngine,
  executeCompaction,
  enterSession,
  budget,
} from '../src/dsh/engine.ts'
import { meter } from '../src/dsh/meter.ts'

const long = (label: string) => `${label} `.repeat(400)

const entries = [
  {
    id: 'sys',
    type: 'message',
    message: { role: 'system', content: 'SYSTEM PROMPT' },
  },
  {
    id: 'u1',
    type: 'message',
    message: { role: 'user', content: long('first question') },
  },
  {
    id: 'a1',
    type: 'message',
    message: {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'planning' },
        {
          type: 'toolCall',
          id: 'call1',
          name: 'bash',
          arguments: { command: 'ls' },
        },
      ],
    },
  },
  {
    id: 'r1',
    type: 'message',
    message: {
      role: 'toolResult',
      toolCallId: 'call1',
      toolName: 'bash',
      content: [{ type: 'text', text: 'file-a\nfile-b' }],
      isError: false,
    },
  },
  {
    id: 'a2',
    type: 'message',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: long('first answer') }],
    },
  },
]

const { session, header } = createSession('bridge-test', '/tmp')
const state = createSyncState()
assert.equal(syncPiEntries(session, entries, state), 5)
assert.equal(session.surface.nodes.length, 5)
assert.equal(
  session.snapshotEvents().filter((e: any) => e.type === 'tool/call').length,
  1,
)

const projected = projectSurface(session)
assert.equal(projected.length, 4)
assert.equal(projected[0]!.role, 'user')
assert.equal(projected[1]!.role, 'assistant')
assert.equal(projected[2]!.role, 'toolResult')
assert.equal(projected[3]!.role, 'assistant')

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-pi-'))
const piSessionFile = path.join(dir, 'session.jsonl')
const dshFile = dshFileFor(piSessionFile)!
await writeDshFile(dshFile, header, session.snapshotEvents())
const parsed = await readDshFile(dshFile)
assert.ok(parsed)
assert.equal(parsed!.header.id, 'bridge-test')
assert.equal(parsed!.events.length, session.snapshotEvents().length)

const host = {
  model: () => ({
    provider: 'fake',
    id: 'fake-model',
    contextWindow: 200_000,
    maxTokens: 8192,
  }),
  findModel: (_provider?: string, _model?: string) => ({
    provider: 'fake',
    id: 'fake-model',
    contextWindow: 200_000,
    maxTokens: 8192,
  }),
  systemPrompt: () => 'SYSTEM PROMPT',
  complete: async () => ({
    content: [{ type: 'text', text: 'COMPACTED SUMMARY' }],
    usage: { input: 100, output: 10, totalTokens: 110 },
    stopReason: 'stop',
  }),
}

const bundle = await createEngine(host as any)
const leave = enterSession(bundle, session)
bundle.flush = async () =>
  writeDshFile(dshFile, header, session.snapshotEvents())
closeTurn(session, state)
const limits = budget(host as any)!
assert.ok(limits.threshold > 0)
const outcome = await executeCompaction(
  bundle,
  {
    session,
    options: { provider: 'fake', model: 'fake-model' },
    runMaintenance: (task) => task(new AbortController().signal),
  },
  'manual',
  new AbortController().signal,
)
assert.ok(outcome, 'compaction should produce a result')
assert.ok(
  session.snapshotEvents().some((e: any) => e.type === 'compaction/start'),
)
assert.ok(
  session.snapshotEvents().some((e: any) => e.type === 'compaction/summary'),
)
assert.ok(
  session.snapshotEvents().some((e: any) => e.type === 'compaction/end'),
)

const after = projectSurface(session)
assert.ok(after.length >= 1, 'a checkpoint should remain')
assert.equal(after[0]!.role, 'user')
const text = JSON.stringify(after[0]!.content)
assert.ok(text.includes('<compacted-summary>'))
assert.ok(text.includes('COMPACTED SUMMARY'))

console.log('bridge ok', {
  events: session.snapshotEvents().length,
  before: outcome!.before,
  after: outcome!.after,
  projectedAfter: after.length,
  dshFile,
})

leave()
await bundle.ctx.fiber.dispose()
