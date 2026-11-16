/** Render through pi's actual expandable compaction component. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  SessionManager,
  CompactionSummaryMessageComponent,
  initTheme,
} from '@earendil-works/pi-coding-agent'
import {
  compactionDetails,
  describeCompaction,
  describeSummary,
  type CompactionInfo,
} from '../src/compaction-info.ts'
import packageInfo from '../package.json' with { type: 'json' }

const info: CompactionInfo = {
  pluginVersion: packageInfo.dcpVersion,
  dshVersion: '0.2.2-rc.1',
  dshCommit: '66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db',
  trigger: 'manual',
  tokensBefore: 12000,
  tokensAfter: 3000,
  messagesBefore: 30,
  messagesAfter: 8,
  summaries: 1,
  prunedResults: 2,
  durationMs: 1250,
  targets: ['fake/model'],
}
const plain = (lines: string[]) =>
  lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '')

test('Ctrl+O expansion shows DCP provenance and stats without changing the model summary', () => {
  initTheme('dark', false)
  const manager = SessionManager.inMemory()
  const kept = manager.appendMessage({
    role: 'user',
    content: 'latest request',
    timestamp: Date.now(),
  })
  const id = manager.appendCompaction(
    'MODEL SUMMARY',
    kept,
    12000,
    compactionDetails(info),
    true,
  )
  const entry = manager.getEntry(id)!
  const message = manager
    .buildSessionProjection()
    .messages.find((message) => message.role === 'compactionSummary')!
  assert.equal(message.role, 'compactionSummary')
  if (message.role !== 'compactionSummary')
    throw new Error('missing compaction')
  for (const messageId of [id, undefined]) {
    const component = new CompactionSummaryMessageComponent(
      message,
      undefined,
      1,
      [
        (markdown, context) =>
          describeSummary(markdown, context.messageId, manager),
      ],
      messageId,
    )
    assert.ok(!plain(component.render(120)).includes('fake/model'))
    component.setExpanded(true)
    const expanded = plain(component.render(120))
    for (const expected of [
      'DCP 压缩',
      `v${packageInfo.dcpVersion}`,
      '0.2.2-rc.1',
      '66491b05e3f0',
      '手动压缩',
      'fake/model',
      '12,000',
      '3,000',
      '75.0%',
      '1.25',
      'MODEL SUMMARY',
    ])
      assert.ok(expanded.includes(expected), expected)
  }
  assert.equal(entry.type, 'compaction')
  if (entry.type === 'compaction') assert.equal(entry.summary, 'MODEL SUMMARY')
  assert.equal(message.summary, 'MODEL SUMMARY')
})

test('expanded provenance distinguishes pi native and other extensions and leaves branch summaries alone', () => {
  const manager = SessionManager.inMemory()
  const kept = manager.appendMessage({
    role: 'user',
    content: 'tail',
    timestamp: Date.now(),
  })
  const native = manager.appendCompaction('native summary', kept, 12000)
  assert.ok(
    describeCompaction('native summary', manager.getEntry(native)).includes(
      'pi 原生压缩（非 DCP）',
    ),
  )
  const other = manager.appendCompaction(
    'other summary',
    kept,
    12000,
    { engine: 'another-engine' },
    true,
  )
  assert.ok(
    describeCompaction('other summary', manager.getEntry(other)).includes(
      '其他扩展压缩（非 DCP）',
    ),
  )
  assert.equal(
    describeCompaction('branch summary', manager.getEntry(kept)),
    'branch summary',
  )
  assert.equal(
    describeCompaction('unknown summary', undefined),
    'unknown summary',
  )
})

test('legacy DCP cards never claim the currently loaded plugin version generated them', () => {
  const manager = SessionManager.inMemory()
  const kept = manager.appendMessage({
    role: 'user',
    content: 'tail',
    timestamp: Date.now(),
  })
  const legacy = manager.appendCompaction(
    'old checkpoint',
    kept,
    12000,
    compactionDetails(),
    true,
  )
  const text = describeCompaction('old checkpoint', manager.getEntry(legacy))
  assert.ok(text.includes('DCP 压缩'))
  assert.ok(text.includes('旧记录未保存'))
  assert.ok(!text.includes(`v${packageInfo.dcpVersion}`))
})
