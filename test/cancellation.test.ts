/** Exercise Esc via the real pi abort API, including cancellation of an ordinary tool. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  createAgentSession, DefaultResourceLoader, SessionManager,
  SettingsManager, ModelRuntime,
} from '@earendil-works/pi-coding-agent'
import {
  createAssistantMessageEventStream, InMemoryCredentialStore, InMemoryModelsStore,
} from '@earendil-works/pi-ai'

const usage = {
  input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
}

for (const phase of ['tool', 'summary'] as const) {
  test(`Esc during ${phase} ends normally without a DCP extension error or retry`, async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-cancel-'))
    mkdirSync(path.join(dir, '.pi'))
    writeFileSync(path.join(dir, '.pi/dcp.json'), JSON.stringify({
      policy: { headroomTokens: 512, retainTokens: 256, maxTokens: 1024 },
    }))
    const errors: any[] = []
    let session: any, abortPromise: Promise<void> | undefined
    let cancelled = false, summaryCalls = 0, mainCalls = 0
    const abort = () => {
      cancelled = true
      abortPromise = session.abort()
    }
    const runtime = await ModelRuntime.create({
      credentials: new InMemoryCredentialStore(), modelsStore: new InMemoryModelsStore(),
      modelsPath: null, refreshOnCreate: false,
    })
    runtime.registerProvider('cancel-test', {
      api: 'cancel-test', apiKey: 'test', baseUrl: 'http://unused.invalid',
      models: [{ id: 'test', name: 'test', reasoning: false, input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000, maxTokens: 1024 }] as any,
      streamSimple: (model, context, options) => {
        const summary = JSON.stringify(context.messages.at(-1)).includes('You are now acting as a compaction engine')
        if (summary) summaryCalls++
        else mainCalls++
        const stream = createAssistantMessageEventStream()
        const message: any = {
          role: 'assistant', api: 'cancel-test', provider: model.provider, model: model.id,
          content: [{ type: 'text', text: summary ? 'CHECKPOINT' : 'DONE' }],
          usage, stopReason: 'stop', timestamp: Date.now(),
        }
        const finishAbort = () => {
          message.content = []
          message.stopReason = 'aborted'
          message.errorMessage = 'Operation aborted'
          stream.push({ type: 'error', reason: 'aborted', error: message })
          stream.end(message)
        }
        if (options?.signal?.aborted) finishAbort()
        else if (phase === 'summary' && summary && !cancelled) {
          options?.signal?.addEventListener('abort', finishAbort, { once: true })
          setTimeout(abort, 10)
        } else {
          if (phase === 'tool' && !cancelled) {
            message.content = [{ type: 'toolCall', id: 'slow-tool', name: 'bash', arguments: { command: 'sleep 30' } }]
            message.stopReason = 'toolUse'
          }
          stream.push({ type: 'start', partial: message })
          stream.push({ type: 'done', reason: message.stopReason, message })
          stream.end(message)
        }
        return stream
      },
    })
    try {
      const settings = SettingsManager.inMemory({ compaction: { enabled: true, reserveTokens: 1000, keepRecentTokens: 1000 } })
      const loader = new DefaultResourceLoader({
        cwd: dir, agentDir: dir, settingsManager: settings, noExtensions: true,
        additionalExtensionPaths: [path.resolve('dist/index.js')],
        disabledBuiltinExtensions: ['mcp', 'codemode', 'tool-search'],
        noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
        systemPrompt: 'Test agent.',
      })
      await loader.reload()
      assert.deepEqual(loader.getExtensions().errors, [])
      const manager = SessionManager.create(dir, dir)
      if (phase === 'summary') {
        manager.appendMessage({ role: 'user', content: 'OLD HISTORY '.repeat(3000), timestamp: 1 })
        manager.appendMessage({ role: 'assistant', api: 'cancel-test', provider: 'cancel-test', model: 'test',
          content: [{ type: 'text', text: 'Old answer '.repeat(300) }], usage, stopReason: 'stop', timestamp: 2 })
      }
      session = (await createAgentSession({
        cwd: dir, agentDir: dir, modelRuntime: runtime,
        model: runtime.getModel('cancel-test', 'test')!, sessionManager: manager,
        settingsManager: settings, resourceLoader: loader, tools: ['bash'],
      })).session
      await session.bindExtensions({ mode: 'print', onError: (error: any) => errors.push(error) })
      session.subscribe((event: any) => {
        if (phase === 'tool' && event.type === 'tool_execution_start' && !cancelled)
          setTimeout(abort, 10)
      })
      await session.prompt('Do the task')
      await abortPromise
      assert.equal(cancelled, true)
      assert.equal(summaryCalls, phase === 'tool' ? 0 : 1, 'ordinary tool cancellation does not require compaction')
      assert.deepEqual(errors, [], 'normal cancellation must not be emitted as an extension error')
      assert.ok(!manager.getEntries().some((e) => e.type === 'compaction'), 'cancelled attempt creates no summary')
      const callsAtAbort = mainCalls + summaryCalls
      await new Promise((resolve) => setTimeout(resolve, 20))
      assert.equal(mainCalls + summaryCalls, callsAtAbort, 'no automatic retry after Esc')
      await session.prompt('A new task after cancellation')
      assert.deepEqual(errors, [])
      assert.equal(session.agent.state.messages.at(-1).stopReason, 'stop')
    } finally {
      session?.dispose()
      rmSync(dir, { recursive: true, force: true })
    }
  })
}
