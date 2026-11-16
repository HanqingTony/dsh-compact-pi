/** Keyless SDK integration: real extension loader, agent loop, provider seam and disk sessions. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
  ModelRuntime,
} from '@earendil-works/pi-coding-agent'
import {
  createAssistantMessageEventStream,
  InMemoryCredentialStore,
  InMemoryModelsStore,
} from '@earendil-works/pi-ai'

const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
}

test('built installable extension summarizes images and resumes in the real pi agent loop', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-sdk-'))
  mkdirSync(path.join(dir, '.pi'), { recursive: true })
  writeFileSync(
    path.join(dir, '.pi/dcp.json'),
    JSON.stringify({
      policy: { headroomTokens: 512, retainTokens: 256, maxTokens: 1024 },
    }),
  )
  const errors: any[] = []
  const calls: any[] = []
  const runtime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsStore: new InMemoryModelsStore(),
    modelsPath: null,
    refreshOnCreate: false,
  })
  const modelConfig = {
    id: 'test',
    name: 'test',
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8000,
    maxTokens: 1024,
  }
  runtime.registerProvider('dcp-test', {
    api: 'dcp-test',
    apiKey: 'test',
    baseUrl: 'http://unused.invalid',
    models: [modelConfig] as any,
    streamSimple: (model, context) => {
      calls.push(context)
      const isSummary = JSON.stringify(context.messages.at(-1)).includes(
        'You are now acting as a compaction engine',
      )
      const message: any = {
        role: 'assistant',
        api: 'dcp-test',
        provider: model.provider,
        model: model.id,
        content: [
          {
            type: 'text',
            text: isSummary
              ? '## Primary Request and Intent\nPreserve the request.'
              : 'FINAL ANSWER',
          },
        ],
        usage,
        stopReason: 'stop',
        timestamp: Date.now(),
      }
      const stream = createAssistantMessageEventStream()
      stream.push({ type: 'start', partial: message })
      const finish = () => {
        stream.push({ type: 'done', reason: 'stop', message })
        stream.end(message)
      }
      if (isSummary)
        void session
          .prompt('SHOULD_NOT_BE_QUEUED', { streamingBehavior: 'followUp' })
          .then(finish)
      else finish()
      return stream
    },
  })
  let session: any
  try {
    const settings = SettingsManager.inMemory({
      compaction: {
        enabled: true,
        reserveTokens: 1000,
        keepRecentTokens: 1000,
      },
    })
    const loader = new DefaultResourceLoader({
      cwd: dir,
      agentDir: dir,
      settingsManager: settings,
      noExtensions: true,
      additionalExtensionPaths: [path.resolve('dist/index.js')],
      disabledBuiltinExtensions: ['mcp', 'codemode', 'tool-search'],
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPrompt: 'Test agent.',
    })
    await loader.reload()
    assert.deepEqual(loader.getExtensions().errors, [])
    const manager = SessionManager.create(dir, dir)
    manager.appendMessage({
      role: 'user',
      content: [
        { type: 'text', text: 'OLD HISTORY '.repeat(3000) },
        {
          type: 'image',
          mimeType: 'image/png',
          data: (
            await sharp({
              create: { width: 24, height: 16, channels: 3, background: 'red' },
            })
              .png()
              .toBuffer()
          ).toString('base64'),
        },
      ],
      timestamp: Date.now(),
    })
    manager.appendMessage({
      role: 'assistant',
      api: 'dcp-test',
      provider: 'dcp-test',
      model: 'test',
      content: [{ type: 'text', text: 'old answer '.repeat(300) }],
      usage,
      stopReason: 'stop',
      timestamp: Date.now(),
    })
    const created = await createAgentSession({
      cwd: dir,
      agentDir: dir,
      modelRuntime: runtime,
      model: runtime.getModel('dcp-test', 'test')!,
      sessionManager: manager,
      settingsManager: settings,
      resourceLoader: loader,
      tools: ['read'],
    })
    session = created.session
    await session.bindExtensions({
      mode: 'print',
      onError: (error: any) => errors.push(error),
    })
    await session.prompt('Continue the request')
    assert.deepEqual(errors, [])
    assert.ok(
      !JSON.stringify(manager.getEntries()).includes('SHOULD_NOT_BE_QUEUED'),
      'input during compaction is rejected rather than queued',
    )
    assert.ok(
      calls.length >= 2,
      'one auxiliary summary and one main provider request',
    )
    assert.ok(
      manager
        .getEntries()
        .some(
          (e) => e.type === 'custom' && e.customType === 'dcp/transaction-v1',
        ),
    )
    const last = calls.at(-1)
    assert.ok(JSON.stringify(last).includes('Preserve the request.'))
    const summaryRequest = calls.find((context) =>
      JSON.stringify(context.messages.at(-1)).includes(
        'You are now acting as a compaction engine',
      ),
    )
    assert.ok(
      summaryRequest.messages.some(
        (message: any) =>
          Array.isArray(message.content) &&
          message.content.some((block: any) => block.type === 'image'),
      ),
      'real provider seam receives the prefix image',
    )
    const declaredTools = summaryRequest.messages
      .filter((message: any) => message.role === 'system')
      .flatMap((message: any) => message.toolsAdded ?? [])
    assert.ok(
      declaredTools.some((tool: any) => tool.name === 'read'),
      'real built-in tool schema reaches the summarizer',
    )
    assert.ok(
      JSON.stringify(last).length < 10000,
      'provider receives compacted history',
    )
    assert.ok(
      manager.getEntries().some((e) => e.type === 'compaction'),
      'safe boundary commits a native pi compaction',
    )
    assert.ok(
      JSON.stringify(manager.buildSessionProjection().messages).length < 10000,
    )
    const checkpoint = manager
      .getEntries()
      .find((entry) => entry.type === 'compaction')!
    const transformer =
      created.extensionsResult.extensions[0].markdownTransformer!.transformer
    if (checkpoint.type !== 'compaction') throw new Error('missing checkpoint')
    const expanded = transformer(checkpoint.summary, {
      messageType: 'summary',
      messageId: checkpoint.id,
      isStreaming: false,
      availableWidth: 100,
    })
    assert.ok(expanded.includes('DCP 压缩'))
    const liveExpanded = transformer(checkpoint.summary, {
      messageType: 'summary',
      isStreaming: false,
      availableWidth: 100,
    })
    assert.ok(
      liveExpanded.includes('DCP 压缩'),
      'freshly completed card without an entry id',
    )
    assert.ok(expanded.includes('自动压力压缩'))
    assert.ok(expanded.includes('dcp-test/test'))
    assert.ok(!checkpoint.summary.includes('事务耗时'))
    const firstCalls = calls.length
    await session.prompt('One more question')
    assert.equal(
      calls.length,
      firstCalls + 1,
      'the next turn reuses the checkpoint without summarizing again',
    )
    const file = manager.getSessionFile()!
    session.dispose()
    session = undefined
    const restored = SessionManager.open(file)
    assert.ok(
      restored
        .getEntries()
        .some(
          (e) =>
            e.type === 'message' &&
            JSON.stringify(e.message).includes('FINAL ANSWER'),
        ),
    )
  } finally {
    session?.dispose()
    rmSync(dir, { recursive: true, force: true })
  }
})

for (const keepsFailing of [false, true])
  test(`real pi overflow recovery ${keepsFailing ? 'stops after one retry' : 'retries successfully'}`, async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-overflow-'))
    mkdirSync(path.join(dir, '.pi'), { recursive: true })
    writeFileSync(
      path.join(dir, '.pi/dcp.json'),
      JSON.stringify({
        policy: { headroomTokens: 512, retainTokens: 256, maxTokens: 1024 },
      }),
    )
    const errors: any[] = []
    let mainCalls = 0,
      summaryCalls = 0,
      session: any
    const runtime = await ModelRuntime.create({
      credentials: new InMemoryCredentialStore(),
      modelsStore: new InMemoryModelsStore(),
      modelsPath: null,
      refreshOnCreate: false,
    })
    runtime.registerProvider('dcp-overflow', {
      api: 'dcp-overflow',
      apiKey: 'test',
      baseUrl: 'http://unused.invalid',
      models: [
        {
          id: 'test',
          name: 'test',
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 20000,
          maxTokens: 1024,
        },
      ],
      streamSimple: (model, context) => {
        const summary = JSON.stringify(context.messages.at(-1)).includes(
          'You are now acting as a compaction engine',
        )
        if (summary) summaryCalls++
        else mainCalls++
        const failed = !summary && (keepsFailing || mainCalls === 1)
        const message: any = {
          role: 'assistant',
          api: 'dcp-overflow',
          provider: model.provider,
          model: model.id,
          content: [
            {
              type: 'text',
              text: summary
                ? 'RECOVERED CHECKPOINT'
                : failed
                  ? ''
                  : 'SUCCESS AFTER RETRY',
            },
          ],
          usage,
          stopReason: failed ? 'error' : 'stop',
          ...(failed
            ? { errorMessage: 'maximum context length exceeded' }
            : {}),
          timestamp: Date.now(),
        }
        const stream = createAssistantMessageEventStream()
        stream.push({ type: 'start', partial: message })
        if (failed)
          stream.push({ type: 'error', reason: 'error', error: message })
        else stream.push({ type: 'done', reason: 'stop', message })
        stream.end(message)
        return stream
      },
    })
    try {
      const settings = SettingsManager.inMemory({
        compaction: {
          enabled: true,
          reserveTokens: 1024,
          keepRecentTokens: 1000,
        },
        retry: { enabled: false, maxRetries: 0, baseDelayMs: 1 },
      })
      const loader = new DefaultResourceLoader({
        cwd: dir,
        agentDir: dir,
        settingsManager: settings,
        noExtensions: true,
        additionalExtensionPaths: [path.resolve('dist/index.js')],
        disabledBuiltinExtensions: ['mcp', 'codemode', 'tool-search'],
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
        noContextFiles: true,
        systemPrompt: 'Test agent.',
      })
      await loader.reload()
      const manager = SessionManager.create(dir, dir)
      manager.appendMessage({
        role: 'user',
        content: 'Earlier request '.repeat(300),
        timestamp: Date.now(),
      })
      manager.appendMessage({
        role: 'assistant',
        api: 'dcp-overflow',
        provider: 'dcp-overflow',
        model: 'test',
        content: [{ type: 'text', text: 'Earlier response '.repeat(200) }],
        usage,
        stopReason: 'stop',
        timestamp: Date.now(),
      })
      session = (
        await createAgentSession({
          cwd: dir,
          agentDir: dir,
          modelRuntime: runtime,
          model: runtime.getModel('dcp-overflow', 'test')!,
          sessionManager: manager,
          settingsManager: settings,
          resourceLoader: loader,
          noTools: 'all',
        })
      ).session
      await session.bindExtensions({
        mode: 'print',
        onError: (error: any) => errors.push(error),
      })
      await session.prompt('Continue')
      assert.deepEqual(errors, [])
      assert.equal(mainCalls, 2)
      assert.equal(summaryCalls, 1)
      assert.ok(manager.getEntries().some((e) => e.type === 'compaction'))
      if (!keepsFailing)
        assert.ok(
          JSON.stringify(manager.getEntries()).includes('SUCCESS AFTER RETRY'),
        )
    } finally {
      session?.dispose()
      rmSync(dir, { recursive: true, force: true })
    }
  })
