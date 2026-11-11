/** Bridge host test with a mock pi ExtensionContext. */

import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DshBridge } from '../src/bridge.ts'

const long = (label: string) => `${label} `.repeat(400)
const entries = [
  { id: 'sys', type: 'message', message: { role: 'system', content: 'SYSTEM PROMPT' } },
  { id: 'u1', type: 'message', message: { role: 'user', content: long('first question') } },
  { id: 'a1', type: 'message', message: { role: 'assistant', content: [{ type: 'text', text: long('first answer') }] } },
]

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-pi-host-'))
const sessionFile = path.join(dir, 'session.jsonl')
const model = { provider: 'fake', id: 'fake-model', contextWindow: 20_000, maxTokens: 8192 }
const ctx: any = {
  cwd: '/tmp',
  model,
  sessionManager: {
    getSessionFile: () => sessionFile,
    getSessionId: () => 'mock-session',
    getCwd: () => '/tmp',
    buildContextEntries: () => entries,
    getEntries: () => entries,
  },
  modelRegistry: {
    find: () => model,
    complete: async () => ({
      content: [{ type: 'text', text: 'COMPACTED SUMMARY' }],
      usage: { input: 10, output: 2, totalTokens: 12 },
      stopReason: 'stop',
    }),
  },
  getSystemPrompt: () => 'SYSTEM PROMPT',
  ui: { notify: (...args: any[]) => console.log('[notify]', ...args) },
}

const pi: any = { on: () => {}, registerCommand: () => {} }
const bridge = new DshBridge(pi, ctx)
await bridge.init()
assert.ok(bridge.ready)
const synced = await bridge.sync()
assert.equal(synced, 3, 'first context sync appends the three messages')
assert.equal(bridge.messages().length, 2, 'system is projected by pi; user+assistant remain')

const outcome = await bridge.compact(undefined, true)
assert.ok(outcome, 'force compaction should return an outcome')
assert.ok(!outcome.error, `compaction should not fail: ${outcome.error ?? ''}`)
const after = bridge.messages()
assert.ok(after.length >= 1)
assert.ok(JSON.stringify(after[0].content).includes('COMPACTED SUMMARY'))
console.log('host ok', { outcome, after: after.length })
console.log(bridge.status())

const bridge2 = new DshBridge(pi, ctx)
await bridge2.init()
assert.equal(bridge2.loaded, true, 'second bridge should load the DSH sidecar')
assert.equal(await bridge2.sync(), 0, 'existing pi entries must not be replayed')
assert.equal(bridge2.messages().length, after.length)
console.log('reload ok', bridge2.status())
bridge2.noteAgentEnd({ messages: [{ role: 'assistant', stopReason: 'error', errorMessage: 'context window exceeded' }] })
assert.equal(bridge2.overflowPending, true)
