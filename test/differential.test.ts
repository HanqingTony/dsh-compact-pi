/** Compare pi compatibility with direct calls to the unmodified upstream Cordis plugins. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  Context,
  SessionStore,
  SessionProjectionRegistry,
  TokenMeter,
  ToolResultPruner,
  BasicCompactionEngine,
  type Session,
  type DshEvent,
} from '../vendor/dsh-runtime.mjs'
import {
  createEngine,
  enterSession,
  executeCompaction,
  type CompatibleAgent,
  type EngineBundle,
} from '../src/dsh/engine.ts'
import { createSession } from '../src/dsh/session.ts'
import { createSyncState, syncPiEntries, closeTurn } from '../src/dsh/sync.ts'

type Item = {
  role: 'user' | 'assistant' | 'tool'
  text?: string
  call?: boolean
  usage?: { input: number; output: number }
}
const policy = {
  headroomTokens: 512,
  retainTokens: 256,
  maxTokens: 2048,
  maxOverflowRetries: 1,
}
const model = {
  provider: 'fixed',
  id: 'text',
  contextWindow: 12000,
  maxTokens: 2048,
}
const summary = 'STRUCTURED SUMMARY'
function content(item: Item) {
  return item.call
    ? [
        {
          type: 'tool-call',
          id: 'call',
          name: 'read',
          arguments: '{"path":"file"}',
        },
      ]
    : [{ type: 'text', text: item.text ?? '' }]
}
function pi(item: Item) {
  return item.role === 'tool'
    ? {
        role: 'toolResult',
        toolCallId: 'call',
        toolName: 'read',
        content: content(item),
        timestamp: 1,
      }
    : item.role === 'assistant'
      ? {
          role: 'assistant',
          content: item.call
            ? [
                {
                  type: 'toolCall',
                  id: 'call',
                  name: 'read',
                  arguments: { path: 'file' },
                },
              ]
            : content(item),
          provider: 'fixed',
          model: 'text',
          timestamp: 1,
          ...(item.usage ? { usage: item.usage } : {}),
        }
      : { role: 'user', content: item.text ?? '', timestamp: 1 }
}
function logical(message: any): any {
  const blocks =
    typeof message.content === 'string'
      ? [{ type: 'text', text: message.content }]
      : message.content
  return {
    role: message.role === 'toolResult' ? 'tool' : message.role,
    content: blocks.map((block: any) =>
      block.type === 'toolCall'
        ? {
            type: 'tool-call',
            id: block.id,
            name: block.name,
            arguments: JSON.stringify(block.arguments),
          }
        : block.type === 'thinking'
          ? { type: 'reasoning', text: block.thinking }
          : Object.fromEntries(
              Object.entries(block).filter(([key]) =>
                ['type', 'text', 'id', 'name', 'arguments'].includes(key),
              ),
            ),
    ),
  }
}
function surface(session: Session) {
  return session.surface.nodes.map((seq) =>
    logical(session.deriveEventMessage(session.eventAt(seq)!)),
  )
}
// Store admission may add host-specific seed markers. Compare the selected
// logical input messages, not numeric offsets or random compaction identities.
function trace(session: Session) {
  const ref = (seq: number) => {
    const event = session.eventAt(seq)!
    const message = session.deriveEventMessage(event)
    return message?.id?.startsWith('input-') ? message.id : event.type
  }
  return session
    .snapshotEvents()
    .filter(
      (event) =>
        event.type.startsWith('compaction/') ||
        typeof event.surfaceOp === 'object',
    )
    .map((event) => ({
      type: event.type,
      range: event.data.shadowedRange
        ? {
            start: ref(event.data.shadowedRange.start),
            end: ref(event.data.shadowedRange.end),
          }
        : undefined,
      shadowed: event.data.shadowedSeqs?.map(ref),
      summary: event.data.summary,
      error: Boolean(event.data.error),
      op:
        typeof event.surfaceOp === 'object'
          ? {
              op: event.surfaceOp.op,
              start: ref(event.surfaceOp.startSeq),
              end: ref(event.surfaceOp.endSeq),
            }
          : undefined,
    }))
}

async function reference(
  calls: any[],
  failure?: 'error' | 'length' | 'flush',
): Promise<EngineBundle> {
  const ctx = new Context()
  await ctx.plugin({
    name: 'reference-model',
    apply(service: Context) {
      service.provide('llm', {
        imageRequestPricing: () => undefined,
        resolveModelInfo: async () => ({
          context: { contextWindow: model.contextWindow },
          defaultMaxTokens: model.maxTokens,
        }),
        async *stream(options: any) {
          calls.push({
            messages: options.messages.map(logical),
            maxTokens: options.maxTokens,
            tools: options.tools,
          })
          if (failure === 'error') throw new Error('provider unavailable')
          yield { type: 'block-start', index: 0, blockType: 'text' }
          yield { type: 'text-delta', index: 0, text: summary }
          yield {
            type: 'block-end',
            index: 0,
            block: { type: 'text', text: summary },
          }
          yield {
            type: 'finish',
            reason: { kind: failure === 'length' ? 'max-tokens' : 'stop' },
          }
        },
      })
    },
  })
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(TokenMeter)
  await ctx.plugin(ToolResultPruner)
  await ctx.plugin(BasicCompactionEngine, policy)
  const bundle = {
    ctx,
    engine: ctx.get('compaction'),
    sessions: ctx.get('sessions'),
    meter: ctx.get('tokenMeter'),
    pruner: ctx.get('toolResultPruner'),
  } as EngineBundle
  ctx.on('session/flush', async (session: Session) => {
    if (!bundle.flush) throw new Error('missing carrier')
    await bundle.flush(session)
  })
  return bundle
}
function seedReference(bundle: EngineBundle, items: Item[], manual: boolean) {
  const session = bundle.sessions.create()
  session.append('turn/start', { turn: 1 })
  session.append(
    'system/message',
    {
      turn: 1,
      step: 1,
      message: {
        role: 'system',
        id: 'system',
        source: { kind: 'system-prompt' },
        content: [{ type: 'text', text: 'SYSTEM' }],
      },
    },
    { surfaceOp: 'append' },
  )
  session.append('request/header', {
    header: {
      config: {
        provider: model.provider,
        model: model.id,
        maxTokens: model.maxTokens,
      },
    },
    reason: 'initial',
  })
  let step = 0,
    open = false,
    callSeq = 0
  for (const [index, item] of items.entries()) {
    if (item.role === 'assistant') {
      if (open) session.append('step/end', { turn: 1, step })
      step++
      open = true
      session.append('step/start', { turn: 1, step })
      session.append(
        'assistant/message',
        {
          turn: 1,
          step,
          message: {
            role: 'assistant',
            id: `input-${index}`,
            source: { kind: 'model', provider: 'fixed', model: 'text' },
            content: content(item),
          },
          stream: content(item).map((block, index) => ({
            type: 'chunk',
            time: 0,
            chunk: { type: 'block-end', index, block },
          })),
          ...(item.usage
            ? {
                usage: {
                  inputTokens: item.usage.input,
                  outputTokens: item.usage.output,
                  cacheReadTokens: 0,
                  cacheWriteTokens: 0,
                },
              }
            : {}),
        },
        { surfaceOp: 'append' },
      )
      if (item.call)
        callSeq = session.append('tool/call', {
          turn: 1,
          step,
          callId: 'call',
          name: 'read',
          arguments: '{"path":"file"}',
        }).seq
    } else if (item.role === 'tool')
      session.append(
        'tool/result',
        {
          turn: 1,
          step,
          message: {
            role: 'tool',
            id: `input-${index}`,
            source: { kind: 'tool', callId: 'call' },
            toolCallId: 'call',
            content: content(item),
            isError: false,
          },
        },
        { surfaceOp: 'append', sourceEventSeqs: [callSeq] },
      )
    else {
      if (open) {
        session.append('step/end', { turn: 1, step })
        open = false
      }
      session.append(
        'user/message',
        {
          role: 'user',
          id: `input-${index}`,
          source: { kind: 'user' },
          content: content(item),
        },
        { surfaceOp: 'append' },
      )
    }
  }
  if (manual) {
    if (open) session.append('step/end', { turn: 1, step })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  }
  return session
}
function seedPi(bundle: EngineBundle, items: Item[], manual: boolean) {
  const { session } = createSession('pi-seed')
  const leave = enterSession(bundle, session)
  const state = createSyncState()
  syncPiEntries(
    session,
    [
      {
        type: 'message',
        id: 'system',
        message: { role: 'system', content: 'SYSTEM' },
      },
    ],
    state,
  )
  session.append('request/header', {
    header: {
      config: {
        provider: model.provider,
        model: model.id,
        maxTokens: model.maxTokens,
      },
    },
    reason: 'initial',
  })
  syncPiEntries(
    session,
    items.map((item, index) => ({
      type: 'message',
      id: `input-${index}`,
      message: pi(item),
    })),
    state,
  )
  if (manual) closeTurn(session, state)
  return { session, leave }
}
const fixtures: {
  name: string
  trigger: 'pressure' | 'manual' | 'overflow'
  items: Item[]
  failure?: 'error' | 'length' | 'flush'
}[] = [
  {
    name: 'below threshold',
    trigger: 'pressure',
    items: [
      { role: 'user', text: 'small' },
      { role: 'assistant', text: 'tail' },
    ],
  },
  {
    name: 'provider usage anchor does not count assistant output twice',
    trigger: 'pressure',
    items: [
      { role: 'user', text: 'x'.repeat(5000) },
      {
        role: 'assistant',
        text: 'tail '.repeat(600),
        usage: { input: 8250, output: 750 },
      },
    ],
  },
  {
    name: 'automatic prefix retention',
    trigger: 'pressure',
    items: [
      { role: 'user', text: 'x'.repeat(70000) },
      { role: 'assistant', text: 'tail '.repeat(300) },
    ],
  },
  {
    name: 'no safe retained span does not invent an emergency pass',
    trigger: 'pressure',
    items: [
      { role: 'user', text: 'x'.repeat(70000) },
      { role: 'assistant', text: 'tail' },
    ],
  },
  {
    name: 'prune-only progress',
    trigger: 'pressure',
    items: [
      { role: 'user', text: 'read' },
      { role: 'assistant', call: true },
      { role: 'tool', text: 'x'.repeat(50000) },
      { role: 'user', text: 'continue' },
    ],
  },
  {
    name: 'manual does not pre-prune',
    trigger: 'manual',
    items: [
      { role: 'user', text: 'read' },
      { role: 'assistant', call: true },
      { role: 'tool', text: 'x'.repeat(50000) },
      { role: 'user', text: 'continue' },
    ],
  },
  {
    name: 'manual checkpoint below pressure threshold',
    trigger: 'manual',
    items: [
      { role: 'user', text: 'x'.repeat(5000) },
      { role: 'assistant', text: 'tail' },
    ],
  },
  {
    name: 'manual no-op',
    trigger: 'manual',
    items: [{ role: 'user', text: 'only message' }],
  },
  {
    name: 'failed manual summary',
    trigger: 'manual',
    failure: 'error',
    items: [
      { role: 'user', text: 'x'.repeat(5000) },
      { role: 'assistant', text: 'tail' },
    ],
  },
  {
    name: 'truncated manual summary',
    trigger: 'manual',
    failure: 'length',
    items: [
      { role: 'user', text: 'x'.repeat(5000) },
      { role: 'assistant', text: 'tail' },
    ],
  },
  {
    name: 'overflow retains prune progress after summary failure',
    trigger: 'overflow',
    failure: 'error',
    items: [
      { role: 'user', text: 'read' },
      { role: 'assistant', call: true },
      { role: 'tool', text: 'x'.repeat(50000) },
      { role: 'user', text: 'continue' },
    ],
  },
  {
    name: 'manual persistence failure',
    trigger: 'manual',
    failure: 'flush',
    items: [
      { role: 'user', text: 'x'.repeat(5000) },
      { role: 'assistant', text: 'tail' },
    ],
  },
  {
    name: 'overflow after prune',
    trigger: 'overflow',
    items: [
      { role: 'user', text: 'read' },
      { role: 'assistant', call: true },
      { role: 'tool', text: 'x'.repeat(50000) },
      { role: 'user', text: 'continue' },
    ],
  },
]
for (const fixture of fixtures)
  test(`upstream differential: ${fixture.name}`, async () => {
    const expectedCalls: any[] = [],
      actualCalls: any[] = []
    const baseline = await reference(expectedCalls, fixture.failure)
    const candidate = await createEngine(
      {
        model: () => model,
        findModel: () => model,
        systemPrompt: () => 'SYSTEM',
        complete: async (_model, context, options) => {
          actualCalls.push({
            messages: [
              {
                role: 'system',
                content: [{ type: 'text', text: context.systemPrompt }],
              },
              ...context.messages,
            ].map(logical),
            maxTokens: options.maxTokens,
            tools: context.tools,
          })
          if (fixture.failure === 'error')
            throw new Error('provider unavailable')
          return {
            content: [{ type: 'text', text: summary }],
            stopReason: fixture.failure === 'length' ? 'length' : 'stop',
          }
        },
      },
      policy,
    )
    const manual = fixture.trigger === 'manual',
      expected = seedReference(baseline, fixture.items, manual),
      actual = seedPi(candidate, fixture.items, manual)
    let flushedA = 0,
      flushedB = 0
    baseline.flush = async () => {
      flushedA++
      if (fixture.failure === 'flush') throw new Error('disk unavailable')
    }
    candidate.flush = async () => {
      flushedB++
      if (fixture.failure === 'flush') throw new Error('disk unavailable')
    }
    const signal = new AbortController().signal
    const agentA: CompatibleAgent = {
      session: expected,
      options: { provider: model.provider, model: model.id },
      runMaintenance: (task) => task(signal),
    }
    const agentB: CompatibleAgent = { ...agentA, session: actual.session }
    let errorA: any,
      errorB: any,
      retryA = false,
      retryB = false
    try {
      assert.deepEqual(
        surface(actual.session),
        surface(expected),
        'normalized seed',
      )
      assert.equal(
        candidate.meter.measure(actual.session).totalTokens,
        baseline.meter.measure(expected).totalTokens,
        'request pricing',
      )
      try {
        if (manual) await baseline.engine.compactNow(agentA, signal)
        else if (fixture.trigger === 'pressure')
          await baseline.ctx.waterfall(
            'agent/pre-step',
            { agent: agentA, signal },
            async () => ({ kind: 'continue' }),
          )
        else
          retryA =
            (
              await baseline.ctx.waterfall(
                'agent/request-error',
                {
                  agent: agentA,
                  signal,
                  failure: {
                    code: 'CONTEXT_WINDOW_EXCEEDED',
                    message: 'Provider confirmed context window exceeded',
                  },
                },
                async () => ({ kind: 'throw' }),
              )
            ).kind === 'retry'
      } catch (error) {
        errorA = error
      }
      try {
        retryB = (
          await executeCompaction(candidate, agentB, fixture.trigger, signal)
        ).retry
      } catch (error) {
        errorB = error
      }
      assert.equal(errorB?.code, errorA?.code, 'same upstream failure category')
      assert.deepEqual(
        actualCalls,
        expectedCalls,
        'same summary request and output budget',
      )
      assert.deepEqual(
        surface(actual.session),
        surface(expected),
        'same resulting model-visible surface',
      )
      assert.deepEqual(
        trace(actual.session),
        trace(expected),
        'same selected ranges, prune decisions and transaction brackets',
      )
      assert.equal(retryB, retryA, 'same recovery decision')
      assert.equal(flushedB, flushedA, 'same persistence checkpoint')
    } finally {
      actual.leave()
      await candidate.ctx.fiber.dispose()
      await baseline.ctx.fiber.dispose()
    }
  })

test('upstream differential: retry budget survives successive pi projections and resets only at a completed activity', async () => {
  const baseline = await reference([])
  const candidate = await createEngine(
    {
      model: () => model,
      findModel: () => model,
      systemPrompt: () => 'SYSTEM',
      complete: async () => ({
        content: [{ type: 'text', text: summary }],
        stopReason: 'stop',
      }),
    },
    policy,
  )
  const signal = new AbortController().signal
  const items: Item[] = [
    { role: 'user', text: 'x'.repeat(5000) },
    { role: 'assistant', text: 'tail' },
  ]
  let agentA: CompatibleAgent | undefined, agentB: CompatibleAgent | undefined
  try {
    for (const expectedRetry of [true, false, true]) {
      if (expectedRetry && agentA) {
        baseline.ctx.emit('agent/status', { agent: agentA, status: 'idle' })
        candidate.ctx.emit('agent/status', { agent: agentB, status: 'idle' })
      }
      const a = seedReference(baseline, items, false),
        b = seedPi(candidate, items, false)
      agentA ??= {
        session: a,
        options: { provider: model.provider, model: model.id },
        runMaintenance: (task) => task(signal),
      }
      agentB ??= { ...agentA, session: b.session }
      agentA.session = a
      agentB.session = b.session
      try {
        const referenceAction = await baseline.ctx.waterfall(
          'agent/request-error',
          {
            agent: agentA,
            signal,
            failure: {
              code: 'CONTEXT_WINDOW_EXCEEDED',
              message: 'Provider confirmed context window exceeded',
            },
          },
          async () => ({ kind: 'throw' }),
        )
        const actual = await executeCompaction(
          candidate,
          agentB,
          'overflow',
          signal,
        )
        assert.equal(actual.retry, referenceAction.kind === 'retry')
        assert.equal(actual.retry, expectedRetry)
      } finally {
        b.leave()
      }
    }
  } finally {
    await candidate.ctx.fiber.dispose()
    await baseline.ctx.fiber.dispose()
  }
})
