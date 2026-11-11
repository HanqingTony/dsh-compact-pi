/** Real DSH tool-result pruner against the pi->DSH bridge. */

import assert from 'node:assert/strict'
import { createSession } from '../src/dsh/session.ts'
import { createSyncState, syncPiEntries } from '../src/dsh/sync.ts'
import { createEngine } from '../src/dsh/engine.ts'

const huge = 'x'.repeat(20_000)
const entries = [
  { id: 'sys', type: 'message', message: { role: 'system', content: 'SYSTEM' } },
  { id: 'u1', type: 'message', message: { role: 'user', content: 'run it' } },
  {
    id: 'a1',
    type: 'message',
    message: {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call1', name: 'bash', arguments: { command: 'cat big' } }],
    },
  },
  {
    id: 'r1',
    type: 'message',
    message: {
      role: 'toolResult',
      toolCallId: 'call1',
      toolName: 'bash',
      content: [{ type: 'text', text: huge }],
      isError: false,
    },
  },
]

const { session } = createSession('prune-test', '/tmp')
syncPiEntries(session, entries, createSyncState(), { systemPrompt: 'SYSTEM' })
assert.ok(session.surface.nodes.length >= 3)

const host = {
  model: () => ({ provider: 'fake', id: 'fake', contextWindow: 200_000, maxTokens: 8192 }),
  findModel: () => ({ provider: 'fake', id: 'fake', contextWindow: 200_000, maxTokens: 8192 }),
  complete: async () => ({ content: [{ type: 'text', text: 'x' }], usage: { input: 1, output: 1, totalTokens: 2 }, stopReason: 'stop' }),
  systemPrompt: () => 'SYSTEM',
}
const { pruner } = createEngine(host as any)
const result = pruner.pruneSession(session)
assert.equal(result.pruned.length, 1, 'one oversized tool result should be pruned')
assert.ok(result.charsRemoved > 10_000)
assert.ok(session.snapshotEvents().some((event: any) => event.type === 'compaction/prune'))
console.log('pruner ok', { pruned: result.pruned.length, charsRemoved: result.charsRemoved })
