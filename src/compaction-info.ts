/** Persisted DCP provenance and display-only expansion of pi compaction cards. */
import type {
  SessionEntry,
  ExtensionContext,
} from '@earendil-works/pi-coding-agent'
import packageInfo from '../package.json' with { type: 'json' }
import dshInfo from '../vendor/manifest.json' with { type: 'json' }
import type { DshEvent } from '../vendor/dsh-runtime.mjs'

export interface CompactionInfo {
  pluginVersion: string
  dshVersion: string
  dshCommit: string
  trigger: 'pressure' | 'manual' | 'overflow'
  tokensBefore: number
  tokensAfter: number
  messagesBefore: number
  messagesAfter: number
  summaries: number
  imageOffloads?: number
  prunedResults: number
  durationMs: number
  targets: string[]
}

export function compactionInfo(
  stats: Pick<
    CompactionInfo,
    | 'trigger'
    | 'tokensBefore'
    | 'tokensAfter'
    | 'messagesBefore'
    | 'messagesAfter'
    | 'durationMs'
  >,
  events: readonly DshEvent[],
): CompactionInfo {
  const summaries = events.filter(
    (event) => event.type === 'compaction/summary',
  )
  return {
    ...stats,
    pluginVersion: packageInfo.dcpVersion,
    dshVersion: dshInfo.version,
    dshCommit: dshInfo.commit,
    summaries: summaries.length,
    imageOffloads: events
      .filter((event) => event.type === 'image/offload')
      .reduce(
        (count, event) =>
          count +
          event.data.targets.reduce(
            (n: number, target: any) => n + target.imageIndexes.length,
            0,
          ),
        0,
      ),
    prunedResults: events.filter((event) => event.type === 'compaction/prune')
      .length,
    targets: [
      ...new Set(
        summaries.map((event) => `${event.data.provider}/${event.data.model}`),
      ),
    ],
  }
}

export function compactionDetails(info?: CompactionInfo) {
  return {
    engine: 'deepseek-harness',
    version: 1,
    ...(info ? { dcp: info } : {}),
  }
}

/** Runs on the UI summary surface only; never changes persisted/model-visible text. */
export function describeCompaction(
  markdown: string,
  entry: SessionEntry | undefined,
): string {
  if (entry?.type !== 'compaction') return markdown
  const details = entry.details as
    | { engine?: string; dcp?: CompactionInfo }
    | undefined
  if (details?.engine !== 'deepseek-harness') {
    return `### ${entry.fromHook ? '其他扩展压缩（非 DCP）' : 'pi 原生压缩（非 DCP）'}\n\n${markdown}`
  }
  const info = details.dcp
  if (!info)
    return `### DCP 压缩 · DeepSeek Harness\n\n旧记录未保存插件版本和运行统计。\n\n---\n\n${markdown}`
  const trigger = {
    pressure: '自动压力压缩',
    manual: '手动压缩',
    overflow: '上下文溢出恢复',
  }[info.trigger]
  const saved = info.tokensBefore - info.tokensAfter
  const percent =
    info.tokensBefore > 0
      ? ((100 * saved) / info.tokensBefore).toFixed(1)
      : '0.0'
  const n = (value: number) => value.toLocaleString('en-US')
  const rows = [
    `- 插件：dsh-compact-pi **v${info.pluginVersion}**`,
    `- 引擎：DeepSeek Harness **${info.dshVersion}** · \`${info.dshCommit.slice(0, 12)}\``,
    `- 触发：${trigger}`,
    `- 摘要模型：${info.targets.map((target) => `\`${target}\``).join(', ') || '未调用摘要模型'}`,
    `- 压缩时 token 估算：**${n(info.tokensBefore)} → ${n(info.tokensAfter)}**；减少 ${n(saved)}（${percent}%），包含系统提示和工具声明`,
    `- 事务内消息：${n(info.messagesBefore)} → ${n(info.messagesAfter)}；摘要 ${info.summaries} 次；工具结果裁剪 ${info.prunedResults} 条；图片省略 ${info.imageOffloads ?? 0} 处`,
    `- 事务耗时：${(info.durationMs / 1000).toFixed(2)} 秒`,
  ]
  return `### DCP 压缩 · DeepSeek Harness\n\n${rows.join('\n')}\n\n---\n\n${markdown}`
}

/** pi's freshly completed compaction card omits the persisted entry id. */
export function describeSummary(
  markdown: string,
  messageId: string | undefined,
  manager:
    | Pick<ExtensionContext['sessionManager'], 'getEntry' | 'getBranch'>
    | undefined,
): string {
  if (!manager) return markdown
  if (messageId)
    return describeCompaction(markdown, manager.getEntry(messageId))
  // Only the latest summary can own a live card. Match its exact text and keep
  // branch summaries untouched; never guess provenance from the loaded plugin.
  const latest = [...manager.getBranch()]
    .reverse()
    .find(
      (entry) => entry.type === 'compaction' || entry.type === 'branch_summary',
    )
  return latest?.type === 'compaction' && latest.summary === markdown
    ? describeCompaction(markdown, latest)
    : markdown
}
