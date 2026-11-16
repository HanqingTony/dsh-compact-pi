/** Real pi session manager + real DSH services; only provider calls are stubbed. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  SessionManager,
  createReadTool,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent'
import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { DshBridge, JOURNAL } from '../src/bridge.ts'

const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
}
const user = (text: string): any => ({
  role: 'user',
  content: text,
  timestamp: Date.now(),
})
const assistant = (text: string): any => ({
  role: 'assistant',
  api: 'openai-completions',
  provider: 'fake',
  model: 'fake',
  content: [{ type: 'text', text }],
  usage,
  stopReason: 'stop',
  timestamp: Date.now(),
})
function setup(window = 6000) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-host-'))
  let manager = SessionManager.create(dir, dir)
  const calls: any[] = []
  const ctx: any = {
    cwd: dir,
    model: {
      provider: 'fake',
      id: 'fake',
      contextWindow: window,
      maxTokens: 1024,
    },
    sessionManager: manager,
    modelRegistry: {
      find: () => ctx.model,
      complete: async (_model: any, context: any, options: any) => {
        calls.push({ context, options })
        return {
          ...assistant('COMPACTED SUMMARY'),
          usage: { ...usage, input: 10, output: 2, totalTokens: 12 },
        }
      },
    },
    getSystemPrompt: () => 'SYSTEM PROMPT',
    ui: { notify: () => {} },
    signal: undefined,
  }
  const api: any = {
    appendEntry: (type: string, data: any) =>
      manager.appendCustomEntry(type, data),
    getAllTools: () => [],
    getActiveTools: () => [],
  }
  const bridge = () =>
    new DshBridge(api, ctx, {
      policy: { headroomTokens: 512, retainTokens: 256, maxTokens: 1024 },
      audit: true,
    })
  return {
    dir,
    ctx,
    api,
    calls,
    bridge,
    get manager() {
      return manager
    },
    reload() {
      manager = SessionManager.open(manager.getSessionFile()!)
      ctx.sessionManager = manager
    },
    cleanup() {
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

test('prune-only progress is durable across restart and preserves metadata', async () => {
  const h = setup()
  try {
    h.manager.appendMessage(user('read'))
    h.manager.appendMessage({
      ...assistant(''),
      content: [{ type: 'toolCall', id: 'call', name: 'read', arguments: {} }],
    })
    h.manager.appendMessage({
      role: 'toolResult',
      toolCallId: 'call',
      toolName: 'read',
      content: [{ type: 'text', text: 'x'.repeat(20000) }],
      isError: false,
      timestamp: Date.now(),
      details: { keep: true },
    } as any)
    h.manager.appendMessage(user('continue'))
    const before = h.manager.buildSessionProjection().messages
    const out = await h.bridge().context(before)
    assert.equal(h.calls.length, 0)
    assert.ok(JSON.stringify(out).length < 10000)
    const journal = h.manager
      .getEntries()
      .find((e) => e.type === 'custom' && e.customType === JOURNAL) as any
    assert.ok(
      journal.data.events.some((e: any) => e.type === 'compaction/prune'),
    )
    const drafts = h.bridge().boundaryEntries()
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].type, 'context_edit')
    for (const draft of drafts)
      if (draft.type === 'context_edit')
        h.manager.appendContextEdit(draft.targetId, draft.replacement)
    assert.deepEqual(h.manager.buildSessionProjection().messages, out)
    h.reload()
    assert.deepEqual(
      h.bridge().replay(h.manager.buildSessionProjection().messages),
      out,
    )
    assert.ok(
      readFileSync(h.manager.getSessionFile()!, 'utf8').includes(
        'x'.repeat(20000),
      ),
      'raw log remains intact',
    )
  } finally {
    h.cleanup()
  }
})

test('automatic summaries retain new answers, signed thinking, injected custom messages and restart replay', async () => {
  const h = setup()
  try {
    h.manager.appendMessage(user('old question '.repeat(2000)))
    h.manager.appendMessage(assistant('old answer '.repeat(200)))
    const latest = {
      ...assistant('LATEST ANSWER'),
      content: [
        {
          type: 'thinking',
          thinking: 'private plan',
          thinkingSignature: 'signature',
        },
        { type: 'text', text: 'LATEST ANSWER' },
      ],
    }
    h.manager.appendMessage(latest)
    const injected: any = {
      role: 'custom',
      customType: 'test',
      content: 'INJECTED GUIDANCE',
      display: false,
      timestamp: Date.now(),
    }
    const input = [...h.manager.buildSessionProjection().messages, injected]
    const out = await h.bridge().context(input)
    assert.ok(h.calls.length >= 1)
    assert.ok(JSON.stringify(out).includes('COMPACTED SUMMARY'))
    assert.ok(
      out.includes(latest) || JSON.stringify(h.calls).includes('LATEST ANSWER'),
    )
    assert.equal(
      out.at(-1),
      injected,
      'unmodified injected tail keeps its identity',
    )
    assert.ok(
      readFileSync(h.manager.getSessionFile()!, 'utf8').includes(
        'LATEST ANSWER',
      ),
    )
    assert.equal(h.calls[0].context.systemPrompt, 'SYSTEM PROMPT')
    const extra = user('another question')
    const replayed = h.bridge().replay([...input, extra])
    assert.deepEqual(replayed, [...out, extra])
  } finally {
    h.cleanup()
  }
})

test('branching before a checkpoint and context edits invalidate its replay', async () => {
  const h = setup()
  try {
    const root = h.manager.appendMessage(user('old '.repeat(6000)))
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    const input = h.manager.buildSessionProjection().messages
    const compacted = await h.bridge().context(input)
    const checkpoint = h.manager
      .getEntries()
      .find((e) => e.type === 'custom' && e.customType === JOURNAL) as any
    assert.ok(checkpoint)
    h.manager.branch(checkpoint.parentId)
    h.manager.appendCustomEntry('zcp/transaction-v1', checkpoint.data)
    assert.deepEqual(h.bridge().replay(input), compacted)
    h.manager.branch(root)
    h.manager.appendMessage(user('NEW BRANCH'))
    const fresh = h.manager.buildSessionProjection().messages
    assert.deepEqual(h.bridge().replay(fresh), fresh)
    h.manager.appendContextEdit(root, {
      role: 'user',
      content: 'EDITED',
      timestamp: Date.now(),
    } as any)
    const edited = h.manager.buildSessionProjection().messages
    assert.deepEqual(h.bridge().replay(edited), edited)
  } finally {
    h.cleanup()
  }
})

test('manual host compaction includes the latest answer and commits a real pi checkpoint', async () => {
  const h = setup(20000)
  try {
    h.manager.appendMessage(user('old '.repeat(3000)))
    h.manager.appendMessage(assistant('latest answer'))
    const before = h.manager.buildSessionProjection().messages
    const result = await h.bridge().prepareNative({
      reason: 'manual',
      signal: new AbortController().signal,
      preparation: { tokensBefore: 5000 },
    } as any)
    assert.ok(result)
    assert.equal((result.details as any).dcp.trigger, 'manual')
    assert.equal((result.details as any).dcp.summaries, 1)
    assert.deepEqual((result.details as any).dcp.targets, ['fake/fake'])
    const id = h.manager.appendCompaction(
      result.summary,
      result.firstKeptEntryId,
      result.tokensBefore,
      result.details,
      true,
    )
    assert.ok(id)
    const projected = h.manager.buildSessionProjection().messages
    assert.ok(JSON.stringify(projected).includes('COMPACTED SUMMARY'))
    assert.ok(JSON.stringify(projected).includes('latest answer'))
    h.reload()
    assert.deepEqual(h.manager.buildSessionProjection().messages, projected)
    assert.ok(before.length === 2)
  } finally {
    h.cleanup()
  }
})

test('abort and truncated summary never commit a checkpoint', async () => {
  const h = setup()
  try {
    h.manager.appendMessage(user('old '.repeat(6000)))
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    const bridge = h.bridge()
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(
      bridge.context(
        h.manager.buildSessionProjection().messages,
        controller.signal,
      ),
    )
    h.ctx.modelRegistry.complete = async () => ({
      ...assistant('partial'),
      stopReason: 'length',
    })
    const original = h.manager.buildSessionProjection().messages
    assert.deepEqual(await bridge.context(original), original)
    assert.equal(
      h.manager.getEntries().filter((e) => e.type === 'custom').length,
      0,
    )
  } finally {
    h.cleanup()
  }
})

test('overflow fallback has a bounded retry budget; output length alone is not overflow', async () => {
  const h = setup(20000)
  try {
    h.manager.appendMessage(user('old '.repeat(3000)))
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    const bridge = h.bridge()
    bridge.noteAgentEnd({
      messages: [{ ...assistant(''), stopReason: 'length' }],
    })
    assert.equal(bridge.overflowPending, false)
    const error = {
      ...assistant(''),
      stopReason: 'error',
      errorMessage: 'context_length_exceeded',
    }
    bridge.noteAgentEnd({ messages: [error] })
    assert.equal(await bridge.recoverOverflow(), true)
    bridge.noteAgentEnd({ messages: [error] })
    assert.equal(await bridge.recoverOverflow(), false)
  } finally {
    h.cleanup()
  }
})

test('in-flight cancellation leaves the session untouched', async () => {
  const h = setup()
  try {
    h.manager.appendMessage(user('old '.repeat(6000)))
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    const controller = new AbortController()
    h.ctx.modelRegistry.complete = async (
      _model: any,
      _context: any,
      options: any,
    ) => {
      assert.equal(options.signal, controller.signal)
      controller.abort(new Error('cancelled by user'))
      return assistant('summary arrived after cancellation')
    }
    await assert.rejects(
      h
        .bridge()
        .context(
          h.manager.buildSessionProjection().messages,
          controller.signal,
        ),
      /cancelled/,
    )
    assert.equal(
      h.manager.getEntries().filter((e) => e.type === 'custom').length,
      0,
    )
  } finally {
    h.cleanup()
  }
})

test('pruning survives a later summarizer failure and records the original pressure', async () => {
  const h = setup()
  try {
    h.manager.appendMessage(user('x'.repeat(20000)))
    h.manager.appendMessage({
      ...assistant(''),
      content: [{ type: 'toolCall', id: 'call', name: 'read', arguments: {} }],
    })
    h.manager.appendMessage({
      role: 'toolResult',
      toolCallId: 'call',
      toolName: 'read',
      content: [{ type: 'text', text: 'y'.repeat(20000) }],
      isError: false,
      timestamp: Date.now(),
    })
    h.manager.appendMessage(user('tail'))
    h.ctx.modelRegistry.complete = async () => {
      throw new Error('provider unavailable')
    }
    const input = h.manager.buildSessionProjection().messages
    const output = await h.bridge().context(input)
    assert.ok(JSON.stringify(output).length < JSON.stringify(input).length)
    const record = h.manager
      .getEntries()
      .find((e) => e.type === 'custom') as any
    assert.ok(record.data.tokensBefore > record.data.tokensAfter)
    h.reload()
    assert.deepEqual(
      h.bridge().replay(h.manager.buildSessionProjection().messages),
      output,
    )
  } finally {
    h.cleanup()
  }
})

test('branch changes while the summarizer is running cannot commit on the new branch', async () => {
  const h = setup()
  try {
    const root = h.manager.appendMessage(user('old '.repeat(6000)))
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    h.ctx.modelRegistry.complete = async () => {
      h.manager.branch(root)
      return assistant('summary')
    }
    await assert.rejects(
      h.bridge().context(h.manager.buildSessionProjection().messages),
      /branch changed/,
    )
    assert.equal(
      h.manager.getEntries().filter((e) => e.type === 'custom').length,
      0,
    )
  } finally {
    h.cleanup()
  }
})

test('tool schemas and signed reasoning reach the auxiliary request without losing tail metadata', async () => {
  const h = setup(20000)
  try {
    h.api.getActiveTools = () => ['read']
    h.api.getAllTools = () => [
      {
        name: 'read',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
        },
      },
    ]
    h.manager.appendMessage(user('old '.repeat(2000)))
    h.manager.appendMessage({
      ...assistant(''),
      content: [
        { type: 'thinking', thinking: 'plan', thinkingSignature: 'SIGNED' },
        { type: 'text', text: 'answer' },
      ],
    })
    h.manager.appendMessage(user('tail'))
    await h.bridge().prepareNative({
      reason: 'manual',
      signal: new AbortController().signal,
      preparation: { tokensBefore: 10000 },
    } as any)
    assert.equal(h.calls[0].context.tools[0].name, 'read')
    assert.ok(JSON.stringify(h.calls[0].context.messages).includes('SIGNED'))
  } finally {
    h.cleanup()
  }
})

test('real TypeBox schemas are persisted as wire JSON for automatic and manual compaction', async () => {
  const h = setup()
  try {
    const read = createReadTool(h.dir)
    const schema = read.parameters
    const wireSchema = JSON.parse(JSON.stringify(schema))
    h.api.getActiveTools = () => ['read']
    h.api.getAllTools = () => [read]
    h.manager.appendMessage(user('old '.repeat(6000)))
    h.manager.appendMessage(assistant('retained answer '.repeat(150)))
    const bridge = h.bridge()
    await bridge.context(h.manager.buildSessionProjection().messages)
    const record = h.manager
      .getEntries()
      .find(
        (entry) => entry.type === 'custom' && entry.customType === JOURNAL,
      ) as any
    assert.ok(record)
    const header = record.data.events.find(
      (event: any) => event.type === 'request/header',
    ).data.header
    assert.deepEqual(header.tools[0].parameters, wireSchema)
    assert.deepEqual(h.calls[0].context.tools[0].parameters, wireSchema)
    assert.ok(
      Reflect.ownKeys(schema).includes('~kind'),
      'normalization leaves the live TypeBox schema untouched',
    )
    assert.ok(Reflect.ownKeys(schema.properties.offset).includes('~optional'))

    // Use fresh raw history so manual compaction has a useful prefix to shrink.
    h.manager.appendMessage(user('more '.repeat(4000)))
    h.manager.appendMessage(assistant('newest answer'))
    const manual = await bridge.prepareNative({
      reason: 'manual',
      signal: new AbortController().signal,
      preparation: { tokensBefore: 10000 },
    } as any)
    assert.ok(manual)
    assert.deepEqual(h.calls.at(-1).context.tools[0].parameters, wireSchema)
  } finally {
    h.cleanup()
  }
})

test('automatic native checkpoint retains compact provenance with audit disabled', async () => {
  const h = setup()
  try {
    h.manager.appendMessage(user('old '.repeat(6000)))
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    const bridge = new DshBridge(h.api, h.ctx, {
      policy: { headroomTokens: 512, retainTokens: 256, maxTokens: 1024 },
      audit: false,
    })
    await bridge.context(h.manager.buildSessionProjection().messages)
    const record = h.manager
      .getEntries()
      .find(
        (entry) => entry.type === 'custom' && entry.customType === JOURNAL,
      ) as any
    assert.equal(record.data.events, undefined)
    assert.equal(record.data.info.trigger, 'pressure')
    const draft = bridge
      .boundaryEntries()
      .find((entry) => entry.type === 'compaction')!
    assert.equal(draft.type, 'compaction')
    if (draft.type !== 'compaction') throw new Error('missing checkpoint')
    assert.deepEqual((draft.details as any).dcp, record.data.info)
    h.manager.appendCompaction(
      draft.summary,
      draft.firstKeptEntryId,
      record.data.tokensBefore,
      draft.details,
      true,
    )
    h.reload()
    const persisted = h.manager
      .getEntries()
      .find((entry) => entry.type === 'compaction') as any
    assert.equal(
      persisted.details.dcp.pluginVersion,
      record.data.info.pluginVersion,
    )
    assert.ok(!persisted.summary.includes('事务耗时'))
  } finally {
    h.cleanup()
  }
})

test('summary calls inherit DSH headroom defaults and honor explicit global/model output budgets', async () => {
  for (const { policy, expected } of [
    { policy: {}, expected: 65536 },
    { policy: { headroomTokens: 24000 }, expected: 24000 },
    { policy: { headroomTokens: 24000, maxTokens: 32000 }, expected: 32000 },
    {
      policy: {
        modelPolicies: [
          { provider: 'fake', model: 'fake', headroomTokens: 28000 },
        ],
      },
      expected: 28000,
    },
    {
      policy: {
        modelPolicies: [
          {
            provider: 'fake',
            model: 'fake',
            headroomTokens: 28000,
            maxTokens: 36000,
          },
        ],
      },
      expected: 36000,
    },
  ]) {
    const h = setup(1_000_000)
    try {
      h.ctx.model.maxTokens = 131072
      h.manager.appendMessage(user('older request '.repeat(1000)))
      h.manager.appendMessage(assistant('latest answer'))
      const bridge = new DshBridge(h.api, h.ctx, { policy, audit: false })
      const result = await bridge.prepareNative({
        reason: 'manual',
        signal: new AbortController().signal,
        preparation: { tokensBefore: 10000 },
      } as any)
      assert.ok(result)
      assert.equal(h.calls.length, 1)
      assert.equal(h.calls[0].options.maxTokens, expected)
    } finally {
      h.cleanup()
    }
  }
})

test('unsupported attachments, virtual routing and manual instructions preserve the original pi history', async () => {
  const h = setup(200000)
  try {
    h.manager.appendMessage(user('older '.repeat(3000)))
    h.manager.appendMessage(assistant('tail'))
    const input = h.manager.buildSessionProjection().messages
    const bridge = h.bridge()
    const image: any = {
      role: 'user',
      content: [{ type: 'file', data: 'aGVsbG8=', mimeType: 'application/pdf' }],
      timestamp: 1,
    }
    await assert.rejects(bridge.context([...input, image]), /unsupported attachment/)
    h.ctx.model.api = 'pi-virtual'
    await assert.rejects(bridge.context(input), /virtual routing/)
    h.ctx.model.api = 'openai-completions'
    await assert.rejects(
      bridge.prepareNative({
        reason: 'manual',
        signal: new AbortController().signal,
        customInstructions: 'extra',
        preparation: { tokensBefore: 10000 },
      } as any),
      /argument-free/,
    )
    assert.equal(h.calls.length, 0)
    assert.deepEqual(h.manager.buildSessionProjection().messages, input)
    assert.equal(
      h.manager.getEntries().filter((entry) => entry.type === 'custom').length,
      0,
    )
    await bridge.close()
  } finally {
    h.cleanup()
  }
})

test('manual flush is a real pi journal commit and persistence failure cannot report success', async () => {
  const h = setup(200000)
  try {
    h.manager.appendMessage(user('older '.repeat(3000)))
    h.manager.appendMessage(assistant('tail'))
    const original = h.manager.buildSessionProjection().messages
    const bridge = h.bridge()
    h.api.appendEntry = () => {
      throw new Error('disk unavailable')
    }
    await assert.rejects(
      bridge.prepareNative({
        reason: 'manual',
        signal: new AbortController().signal,
        preparation: { tokensBefore: 10000 },
      } as any),
      (error: any) =>
        error.code === 'persistence' &&
        error.cause?.message === 'disk unavailable',
    )
    assert.deepEqual(h.manager.buildSessionProjection().messages, original)
    assert.equal(
      h.manager.getEntries().filter((entry) => entry.type === 'custom').length,
      0,
    )
    await bridge.close()
  } finally {
    h.cleanup()
  }
})
