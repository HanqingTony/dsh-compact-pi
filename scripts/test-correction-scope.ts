/** Paired live test. Uses Pi's configured model and synthetic, de-identified dialogue. */
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ModelRuntime } from '@earendil-works/pi-coding-agent'
import { createEngine, enterSession } from '../src/dsh/engine.ts'
import { createSession } from '../src/dsh/session.ts'
import { createSyncState, syncPiEntries, closeTurn } from '../src/dsh/sync.ts'

const [provider = 'deepseek', modelId = 'deepseek-flash', trials = '1', scenario = 'summaries'] = process.argv.slice(2)
const attempts = Number(trials)
assert.ok(Number.isInteger(attempts) && attempts > 0 && attempts <= 10)
assert.ok(['summaries', 'checkpoint', 'text-form'].includes(scenario), 'Choose summaries, checkpoint, or text-form')
const runtime = await ModelRuntime.create({ refreshOnCreate: false })
const model = runtime.getModel(provider, modelId)
assert.ok(model, `Missing configured model ${provider}/${modelId}`)
const root = await mkdtemp(path.join(tmpdir(), 'dcp-scope-'))
const system = 'You are a coding assistant collaborating on image-generation workflows.'
const suffix = '\n\n' + [
  'When recording a user correction, keep its object, triggering condition, and scope together.',
  'Record a correction as task-specific unless the user explicitly made it a standing preference. Name the work item even when the surrounding conversation will be removed.',
  'When merging a prior checkpoint, preserve these scope limits. If the scope of an old correction is unclear, mark it as unclear and avoid applying it to other tasks.',
].join('\n')

type Turn = [role: 'user' | 'assistant', text: string]
// Reconstructed from the PE mini-project: a nearby, unrelated T2I preset and
// a correction about the standalone PE that receives a reference image.
const caseHistory: Turn[] = [
  ['user', 'Park the seed and LoRA investigation on the existing T2I preset. I want to extract the Qwen-Image-2.1 prompt enhancer into its own standalone workflow.'],
  ['assistant', 'I extracted the prompt enhancer from the image editing workflow. It rewrites prompts for Qwen Image.'],
  ['user', 'Stop changing the workflow for a moment. I need the accelerated local model to turn the prompt I enter into a suitable Qwen Image prompt. Let us align on the task first.'],
  ['assistant', 'If the input is just text, I would use the T2I prompt enhancer.'],
  ['user', 'Who said I wanted T2I? I want I2I.'],
  ['assistant', 'Will you also provide a reference image?'],
  ['user', 'Of course I will provide a reference image as well.'],
  ['assistant', 'Understood. Input is a reference image and an edit instruction; output is a rewritten prompt.'],
]
// DSH rejects a framed checkpoint that is larger than its input. Supply
// compressible background in both rounds without adding scope instructions.
const background: Turn[] = [
  ['user', 'The earlier build diagnostics are now complete.'],
  ['assistant', Array.from({ length: 120 }, (_, index) =>
    `Read-only fixture check ${index + 1}: input schema and registry diagnostic both passed.`,
  ).join('\n')],
]

async function summarize(history: Turn[], scoped: boolean) {
  const signal = AbortSignal.timeout(90000)
  const bundle = await createEngine({
    attachmentHome: () => root,
    model: () => model,
    findModel: () => model,
    systemPrompt: () => system,
    complete: async (_model, context, options) => {
      const block = context.messages.at(-1).content[0]
      assert.ok(block.text.startsWith('You are now acting as a compaction engine'))
      if (scoped) block.text += suffix
      return runtime.complete(model, context, options)
    },
  }, { headroomTokens: 512, retainTokens: 32, maxTokens: 2048 })
  const { session } = createSession('scope-test-' + crypto.randomUUID())
  const leave = enterSession(bundle, session)
  try {
    const state = createSyncState()
    const items: Turn[] = [
      ...background,
      ...history,
      ['user', 'Hold there for now. I will specify which work item to continue next.'],
    ]
    syncPiEntries(session, [
      { type: 'message', id: 'system', message: { role: 'system', content: system } },
    ], state)
    session.append('request/header', {
      header: { config: { provider, model: modelId, maxTokens: model.maxTokens } },
      reason: 'initial',
    })
    syncPiEntries(session, items.map(([role, text], index) => ({
      type: 'message', id: `input-${index}`,
      message: role === 'user' ? { role, content: text } : {
        role, provider, model: modelId, stopReason: 'stop',
        content: [{ type: 'text', text }],
      },
    })), state)
    closeTurn(session, state)
    bundle.flush = async () => {}
    await bundle.engine.compactNow({
      session, options: { provider, model: modelId },
      runMaintenance: task => task(signal),
    }, signal)
    const checkpoint = session.surface.nodes
      .map(seq => session.deriveEventMessage(session.eventAt(seq)!))
      .find(message => message?.source?.kind === 'compact-checkpoint')
    assert.ok(checkpoint, 'Expected compaction to produce a real checkpoint')
    return checkpoint.content.map((block: { text?: string }) => block.text).join('\n')
  } finally {
    leave()
    await bundle.ctx.fiber.dispose()
  }
}

const followups = [
  ['resumeA', 'Resume the standalone prompt enhancer we aligned on. Which kind of input should I wire up?', 'I2I'],
  ['newB', 'New work item: generate an entirely new product poster from a text brief. I have no input image. What workflow mode should this work item use?', 'T2I'],
  ['newUnspecified', 'Separate new workflow for product posters. I have not said whether there will be an input image. Is either workflow mode already required for this new work item?', 'UNCLEAR'],
]

async function completeText(checkpoint: string | undefined, request: string) {
  const result = await runtime.complete(model, {
    systemPrompt: system,
    messages: [
      ...(checkpoint ? [{ role: 'user' as const, content: checkpoint, timestamp: 1 }] : []),
      { role: 'user', content: request, timestamp: 2 },
    ],
  }, { maxTokens: 2048, signal: AbortSignal.timeout(90000) })
  if (result.stopReason === 'error' || result.stopReason === 'aborted')
    throw new Error(result.errorMessage ?? result.stopReason)
  return result.content.flatMap(block => block.type === 'text' ? [block.text.trim()] : []).join('\n')
}

// A redacted extract of the recorded zup checkpoint. Change only the scope
// of the two statements that generalized the correction.
const checkpoint = `This is an automatically generated checkpoint condensing an earlier span of the conversation to free up context. Treat the captured context as established background and build on it without restating it. Continue the task directly from the messages that follow, without acknowledging this checkpoint.

<compacted-summary>
## Primary Request and Intent
- Extract the prompt enhancer into its own standalone workflow.
- The assistant suggested T2I. The user corrected the choice to I2I.
## Key Technical Concepts
- Qwen Image has separate PE-I2I (reference image and edit instruction) and PE-T2I (text brief) prompt enhancers. User wants **I2I only**.
## Critical Context
- Work on the existing T2I preset is parked.
- User explicitly wants **I2I**, not T2I; will always supply a reference image.
</compacted-summary>`
const scopedCheckpoint = checkpoint
  .replace('User wants **I2I only**.', 'For the standalone prompt enhancer, the user wants **I2I only**.')
  .replace('User explicitly wants **I2I**, not T2I; will always supply a reference image.', 'For this standalone prompt enhancer, the user wants **I2I**, not T2I, and will supply a reference image.')

async function comparePlans(trial: number, arm: 'recorded' | 'scoped' | 'no-checkpoint') {
  const newWorkflow = scenario === 'text-form'
    ? '另做一个读书会活动海报工作流。表单固定就三个字段：活动名称、主题、配色。输出一张新的活动海报。先列出运行所需的输入项和主要处理节点。'
    : '另做一个商品宣传海报工作流，从表单里填商品名称、卖点和画面风格，输出一张新的宣传海报。先列出我需要填写或上传的输入项和主要处理节点。'
  const probes = [
    ['resumeA', '继续做刚才那个独立提示词增强工作流。先列出我需要填写或上传的输入项和主要处理节点。', true],
    ['newB', newWorkflow, false],
  ] as const
  const selected = arm === 'no-checkpoint' ? probes.slice(1) : probes
  const context = arm === 'scoped' ? scopedCheckpoint : arm === 'recorded' ? checkpoint : undefined
  const results = await Promise.all(selected.map(async ([name, request, expectedImage]) => {
    const answer = await completeText(context, request +
      '\n只输出 JSON：{"requiredInputs":[{"name":"输入名称","type":"text/image/number/other"}],"steps":["处理步骤"]}。requiredInputs 只列运行所需输入。')
    const json = answer.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/gi, '')
    const plan = JSON.parse(json)
    assert.ok(Array.isArray(plan.requiredInputs) && Array.isArray(plan.steps), 'Expected workflow plan JSON')
    const requiredImage = plan.requiredInputs.some((input: { type: string }) => input.type.toLowerCase() === 'image')
    const editingSteps = plan.steps.filter((step: string) => /\bi2i\b|图生图|image-to-image|img2img/i.test(step))
    return { name, expectedImage, requiredImage, editingSteps, plan }
  }))
  console.log(JSON.stringify({ trial, arm, results }))
}

try {
  for (let trial = 1; trial <= attempts; trial++) {
    if (scenario !== 'summaries') {
      await Promise.all([comparePlans(trial, 'recorded'), comparePlans(trial, 'scoped')])
      await comparePlans(trial, 'no-checkpoint')
      continue
    }
    await Promise.all([false, true].map(async scoped => {
      const first = await summarize(caseHistory, scoped)
      const second = await summarize([
        ['user', first],
        ['assistant', 'The standalone workflow design is aligned. We can continue once a work item is specified.'],
      ], scoped)
      const results = await Promise.all(followups.map(async ([name, request, expected]) => {
        const answer = await completeText(second, request! + '\nStart your answer with exactly one of: I2I, T2I, or UNCLEAR. Then give a one-sentence reason.')
        return { name, expected, actual: answer.match(/\b(I2I|T2I|UNCLEAR)\b/i)?.[0]?.toUpperCase(), answer }
      }))
      console.log(JSON.stringify({
        trial, arm: scoped ? 'scoped' : 'upstream',
        summary1: first, summary2: second, results,
      }))
    }))
  }
} finally {
  await rm(root, { recursive: true, force: true })
}
