import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { SessionManager } from '@earendil-works/pi-coding-agent'
import { DshBridge, JOURNAL } from '../src/bridge.ts'
import { createEngine, enterSession } from '../src/dsh/engine.ts'
import { createSyncState, syncPiEntries } from '../src/dsh/sync.ts'
import {
  IMAGE_OFFLOAD_REQUIRED_CODE,
  ImageOffloadPlugin,
  Context,
  SessionStore,
  SessionProjectionRegistry,
} from '../vendor/dsh-runtime.mjs'

const data = (
  await sharp({
    create: { width: 32, height: 24, channels: 3, background: '#368cf1' },
  })
    .png()
    .toBuffer()
).toString('base64')
const image = () => ({ type: 'image' as const, data, mimeType: 'image/png' })
const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
}
const user = (content: any): any => ({ role: 'user', content, timestamp: 1 })
const assistant = (text = 'answer'): any => ({
  role: 'assistant',
  content: [{ type: 'text', text }],
  api: 'openai-completions',
  provider: 'fake',
  model: 'fake',
  stopReason: 'stop',
  usage,
  timestamp: 2,
})
function fixture(policy: any = {}, limits?: any) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-images-'))
  let manager = SessionManager.create(dir, dir)
  const calls: any[] = [],
    notices: string[] = []
  const model: any = {
    provider: 'fake',
    id: 'fake',
    input: ['text', 'image'],
    contextWindow: 6000,
    maxTokens: 1024,
    inputLimits: { images: limits },
  }
  const ctx: any = {
    cwd: dir,
    model,
    sessionManager: manager,
    getSystemPrompt: () => 'SYSTEM',
    ui: { notify: (text: string) => notices.push(text) },
    modelRegistry: {
      find: () => model,
      complete: async (_m: any, context: any) => {
        calls.push(context)
        return assistant('IMAGE SUMMARY')
      },
    },
  }
  const api: any = {
    getAllTools: () => [],
    getActiveTools: () => [],
    appendEntry: (type: string, value: any) =>
      manager.appendCustomEntry(type, value),
  }
  const make = () =>
    new DshBridge(api, ctx, {
      audit: true,
      policy: {
        headroomTokens: 512,
        maxTokens: 1024,
        retainTokens: 256,
        ...policy,
      },
    })
  const bridge = make()
  return {
    dir,
    ctx,
    model,
    calls,
    notices,
    api,
    bridge,
    make,
    get manager() {
      return manager
    },
    messages: () => manager.buildSessionProjection().messages,
    reload() {
      manager = SessionManager.open(manager.getSessionFile()!)
      ctx.sessionManager = manager
    },
    journals: () =>
      manager
        .getEntries()
        .filter((e: any) => e.type === 'custom' && e.customType === JOURNAL)
        .map((e: any) => e.data),
    async close() {
      await bridge.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
const images = (messages: readonly any[]) =>
  messages.flatMap((m) =>
    Array.isArray(m.content)
      ? m.content.filter((b: any) => b.type === 'image')
      : [],
  )

test('images below pressure pass through unchanged and are admitted as durable references', async () => {
  const h = fixture({ auto: false })
  try {
    h.manager.appendMessage(user([{ type: 'text', text: 'look' }, image()]))
    const input = h.messages(),
      output = await h.bridge.context(input)
    assert.equal(output[0], input[0])
    assert.equal(images(output)[0].data, data)
    assert.equal(h.calls.length, 0)
    assert.equal(h.journals().length, 0)
    assert.ok(existsSync(path.join(h.dir, '.dcp-assets/attachments/v1')))
  } finally {
    await h.close()
  }
})

test('automatic summary sees prefix images and preserves the latest image tail', async () => {
  const h = fixture(
    {},
    { resize: { maxWidth: 12, maxHeight: 8, maxBytes: 1024 } },
  )
  try {
    h.manager.appendMessage(
      user([{ type: 'text', text: 'history '.repeat(3500) }, image()]),
    )
    h.manager.appendMessage(assistant())
    h.manager.appendMessage(
      user([{ type: 'text', text: 'latest '.repeat(200) }, image()]),
    )
    const input = h.messages(),
      output = await h.bridge.context(input)
    assert.equal(h.calls.length, 1, JSON.stringify(h.notices))
    assert.equal(images(h.calls[0].messages).length, 1)
    const bytes = Buffer.from(images(h.calls[0].messages)[0].data, 'base64')
    assert.ok(bytes.length > 0 && bytes.length <= 1024)
    const requestImage = await sharp(bytes).metadata()
    assert.ok(requestImage.width! <= 12 && requestImage.height! <= 8)
    assert.equal(output.at(-1), input.at(-1))
    assert.equal(images(output).length, 1)
    assert.match(JSON.stringify(output[0]), /IMAGE SUMMARY/)
    const event = h
      .journals()[0]
      .events.find(
        (e: any) =>
          e.type === 'user/message' &&
          e.data.content.some((b: any) => b.type === 'image'),
      )
    const block = event.data.content.find((b: any) => b.type === 'image')
    assert.match(block.attachment.attachmentId, /^sha256:/)
    assert.equal(block.attachment.width, 32)
    assert.equal(block.data, undefined)
  } finally {
    await h.close()
  }
})

test('mixed tool-result pruning preserves images and pi metadata', async () => {
  const h = fixture()
  try {
    h.manager.appendMessage(user('read screenshot'))
    h.manager.appendMessage({
      ...assistant(),
      content: [
        {
          type: 'toolCall',
          id: 'read-1',
          name: 'read',
          arguments: { path: 'screenshot.png' },
        },
      ],
    })
    h.manager.appendMessage({
      role: 'toolResult',
      toolCallId: 'read-1',
      toolName: 'read',
      content: [{ type: 'text', text: 'x'.repeat(20000) }, image()],
      isError: false,
      timestamp: 3,
      details: { keep: true },
    } as any)
    h.manager.appendMessage(user('continue'))
    const output = await h.bridge.context(h.messages())
    assert.equal(h.calls.length, 0)
    const tool: any = output.find((m) => m.role === 'toolResult')
    assert.deepEqual(tool.details, { keep: true })
    assert.deepEqual(
      tool.content.find((b: any) => b.type === 'image'),
      image(),
    )
    assert.ok(tool.content[0].text.length < 10000)
  } finally {
    await h.close()
  }
})

test('main request image offload persists same-seq projections and survives restart and native edits', async () => {
  const h = fixture({ auto: false }, { maxPerRequest: 1 })
  try {
    for (let i = 0; i < 3; i++)
      h.manager.appendMessage(
        user([{ type: 'text', text: `shot ${i}` }, image()]),
      )
    const input = h.messages(),
      output = await h.bridge.context(input)
    assert.equal(images(output).length, 1)
    assert.equal(h.calls.length, 0)
    assert.match(
      JSON.stringify(output[0]),
      /image omitted to fit request image limits/,
    )
    const events = h.journals()[0].events
    assert.ok(events.some((e: any) => e.type === 'image/offload'))
    const placeholder = (output[0] as any).content.find((b: any) =>
      b.text?.includes('Normalized copy'),
    )
    const storedPath = JSON.parse(
      placeholder.text.match(/Normalized copy.*?: (".*?")/)[1],
    )
    assert.ok(existsSync(storedPath))
    assert.ok(readFileSync(storedPath).length > 0)
    await h.bridge.close()
    h.reload()
    const resumed = h.make()
    try {
      assert.deepEqual(resumed.replay(h.messages()), output)
      assert.deepEqual(await resumed.context(h.messages()), output)
      const drafts = resumed.boundaryEntries()
      assert.equal(drafts.length, 2)
      for (const draft of drafts)
        if (draft.type === 'context_edit')
          h.manager.appendContextEdit(draft.targetId, draft.replacement)
      assert.deepEqual(h.messages(), output)
      h.reload()
      assert.equal(images(h.messages()).length, 1)
    } finally {
      await resumed.close()
    }
  } finally {
    await h.close()
  }
})

test('summary image limit is repaired inside upstream compaction transaction', async () => {
  const h = fixture({}, { maxPerRequest: 1 })
  try {
    h.manager.appendMessage(
      user([
        { type: 'text', text: 'history '.repeat(3500) },
        image(),
        image(),
        image(),
      ]),
    )
    h.manager.appendMessage(assistant())
    h.manager.appendMessage(user('latest '.repeat(300)))
    const output = await h.bridge.context(h.messages())
    assert.equal(h.calls.length, 1, JSON.stringify(h.notices))
    assert.equal(images(h.calls[0].messages).length, 1)
    const events = h.journals()[0].events,
      offload = events.findIndex((e: any) => e.type === 'image/offload')
    assert.ok(
      offload > events.findIndex((e: any) => e.type === 'compaction/start'),
    )
    assert.ok(
      offload < events.findIndex((e: any) => e.type === 'compaction/end'),
    )
    assert.match(JSON.stringify(output), /IMAGE SUMMARY/)
  } finally {
    await h.close()
  }
})

test('summary failure preserves completed image offload without inventing a checkpoint', async () => {
  const h = fixture({}, { maxPerRequest: 1 })
  try {
    h.manager.appendMessage(
      user([
        { type: 'text', text: 'history '.repeat(3500) },
        image(),
        image(),
        image(),
      ]),
    )
    h.manager.appendMessage(assistant())
    h.manager.appendMessage(user('latest '.repeat(300)))
    h.ctx.modelRegistry.complete = async () => {
      throw new Error('provider unavailable')
    }
    const output = await h.bridge.context(h.messages())
    assert.equal(images(output).length, 1)
    assert.ok(
      h.journals()[0].events.some((e: any) => e.type === 'image/offload'),
    )
    assert.ok(
      !h.journals()[0].events.some((e: any) => e.type === 'compaction/summary'),
    )
    h.reload()
    assert.deepEqual(h.bridge.replay(h.messages()), output)
  } finally {
    await h.close()
  }
})

test('invalid image and text-only summary model never silently discard pictures', async () => {
  const h = fixture()
  try {
    const input = [
      user([{ type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' }]),
    ]
    await assert.rejects(h.bridge.context(input))
    assert.equal(h.journals().length, 0)
    h.manager.appendMessage(
      user([{ type: 'text', text: 'history '.repeat(3500) }, image()]),
    )
    h.manager.appendMessage(assistant())
    h.manager.appendMessage(user('tail'))
    h.model.input = ['text']
    await assert.rejects(
      h.bridge.prepareNative({
        reason: 'manual',
        signal: new AbortController().signal,
        preparation: { tokensBefore: 9000 },
      } as any),
      /image input|summary/i,
    )
    assert.equal(h.journals().length, 0)
    assert.equal(images(h.messages()).length, 1)
  } finally {
    await h.close()
  }
})

test('upstream differential: identical image offload selections and derived content', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-image-diff-'))
  const bundle = await createEngine({
    attachmentHome: () => dir,
    model: () => ({}),
    findModel: () => undefined,
    complete: async () => undefined,
    systemPrompt: () => '',
  })
  const direct = new Context()
  try {
    direct.provide('agents', new Map())
    await direct.plugin(SessionStore)
    await direct.plugin(SessionProjectionRegistry)
    await direct.plugin(ImageOffloadPlugin)
    const messages = [user([image(), image()]), user([image()])]
    await bundle.images.prepare(messages)
    const seed = (id: string, store: any) => {
      const session = store.prepare(id)
      store.enter(session)
      store.announce(session)
      syncPiEntries(
        session,
        messages.map((message, i) => ({
          type: 'message',
          id: `input-${i}`,
          message,
        })),
        createSyncState(),
        { imageToDsh: bundle.images.toDsh },
      )
      return session
    }
    const a = seed('adapter', bundle.sessions),
      b = seed('direct', direct.get('sessions'))
    for (const [ctx, session] of [
      [bundle.ctx, a],
      [direct, b],
    ] as const) {
      const action = await ctx.waterfall(
        'agent/request-error',
        {
          agent: { session },
          signal: new AbortController().signal,
          failure: {
            code: IMAGE_OFFLOAD_REQUIRED_CODE,
            message: 'image limit',
            offloadImages: 2,
          },
        },
        async () => ({ kind: 'throw' }),
      )
      assert.equal(action.kind, 'retry')
    }
    assert.deepEqual(
      a
        .snapshotEvents()
        .filter((e) => e.type === 'image/offload')
        .map((e) => e.data),
      b
        .snapshotEvents()
        .filter((e) => e.type === 'image/offload')
        .map((e) => e.data),
    )
    assert.deepEqual(
      a.surface.nodes.map((seq) => a.deriveEventMessage(a.eventAt(seq)!)),
      b.surface.nodes.map((seq) => b.deriveEventMessage(b.eventAt(seq)!)),
    )
  } finally {
    await bundle.ctx.fiber.dispose()
    await direct.fiber.dispose()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('manual image summary uses the real flush and returns a native pi checkpoint', async () => {
  const h = fixture()
  try {
    h.manager.appendMessage(
      user([{ type: 'text', text: 'history '.repeat(3500) }, image()]),
    )
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    const result = await h.bridge.prepareNative({
      reason: 'manual',
      signal: new AbortController().signal,
      preparation: { tokensBefore: 9000 },
    } as any)
    assert.ok(result)
    assert.match(result.summary, /IMAGE SUMMARY/)
    assert.equal(images(h.calls[0].messages).length, 1)
    assert.equal(h.journals().length, 1)
    h.manager.appendCompaction(
      result.summary,
      result.firstKeptEntryId,
      result.tokensBefore,
      result.details,
    )
    assert.match(JSON.stringify(h.messages()), /IMAGE SUMMARY/)
    h.reload()
    assert.equal(images(h.messages()).length, 0)
  } finally {
    await h.close()
  }
})

test('cancellation after summary image offload preserves only the committed omission', async () => {
  const h = fixture({}, { maxPerRequest: 1 })
  const controller = new AbortController()
  try {
    h.manager.appendMessage(
      user([
        { type: 'text', text: 'history '.repeat(3500) },
        image(),
        image(),
        image(),
      ]),
    )
    h.manager.appendMessage(assistant())
    h.manager.appendMessage(user('tail '.repeat(300)))
    h.ctx.modelRegistry.complete = async () => {
      controller.abort(new Error('cancelled'))
      throw controller.signal.reason
    }
    await assert.rejects(
      h.bridge.context(h.messages(), controller.signal),
      /cancelled/,
    )
    assert.equal(h.journals().length, 1)
    const output = h.bridge.replay(h.messages())
    assert.equal(images(output).length, 1)
    assert.ok(
      h.journals()[0].events.some((e: any) => e.type === 'image/offload'),
    )
    assert.ok(
      !h.journals()[0].events.some((e: any) => e.type === 'compaction/summary'),
    )
    h.reload()
    assert.deepEqual(h.bridge.replay(h.messages()), output)
  } finally {
    await h.close()
  }
})

test('assistant image output from the summarizer is rejected rather than stripped', async () => {
  const h = fixture()
  try {
    h.manager.appendMessage(
      user([{ type: 'text', text: 'history '.repeat(3500) }, image()]),
    )
    h.manager.appendMessage(assistant('tail '.repeat(300)))
    h.ctx.modelRegistry.complete = async () => ({
      ...assistant('text with a picture'),
      content: [{ type: 'text', text: 'unsafe summary' }, image()],
    })
    await assert.rejects(
      h.bridge.prepareNative({
        reason: 'manual',
        signal: new AbortController().signal,
        preparation: { tokensBefore: 9000 },
      } as any),
      /summary/,
    )
    assert.equal(h.journals().length, 0)
    assert.equal(images(h.messages()).length, 1)
  } finally {
    await h.close()
  }
})

test('image admission and route heuristics price attachment references, not base64 payloads', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-image-meter-'))
  const bundle = await createEngine({
    attachmentHome: () => dir,
    model: () => ({}),
    findModel: () => undefined,
    complete: async () => undefined,
    systemPrompt: () => '',
  })
  const session = bundle.sessions.prepare('meter')
  const leave = enterSession(bundle, session)
  try {
    let seed = 1
    const raw = Buffer.alloc(128 * 128 * 3)
    for (let i = 0; i < raw.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      raw[i] = seed >>> 24
    }
    const noisy = await sharp(raw, {
      raw: { width: 128, height: 128, channels: 3 },
    })
      .png()
      .toBuffer()
    const message = user([
      { type: 'image', data: noisy.toString('base64'), mimeType: 'image/png' },
    ])
    await bundle.images.prepare([message])
    syncPiEntries(
      session,
      [{ type: 'message', id: 'image', message }],
      createSyncState(),
      { imageToDsh: bundle.images.toDsh },
    )
    assert.ok(noisy.length > 40000)
    assert.ok(bundle.meter.measure(session).totalTokens < 1000)
    assert.ok(
      !JSON.stringify(session.snapshotEvents()).includes(
        message.content[0].data,
      ),
    )
  } finally {
    leave()
    await bundle.ctx.fiber.dispose()
    rmSync(dir, { recursive: true, force: true })
  }
})
