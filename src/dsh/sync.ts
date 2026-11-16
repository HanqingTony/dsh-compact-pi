/** Append pi session entries to a DSH Session as native DSH events. */

import type { Session } from '../../vendor/dsh-runtime.mjs'
import { piContentToDsh, type PiMessage } from './messages.ts'

export interface SyncState {
  imageToDsh?: (image: any) => any
  turn: number
  step: number
  turnStarted: boolean
  systemSeq: number | undefined
  stepOpen: boolean
  seen: Set<string>
  toolCalls: Map<string, number>
  appended: number
}

export function createSyncState(): SyncState {
  return {
    turn: 1,
    step: 0,
    turnStarted: false,
    systemSeq: undefined,
    stepOpen: false,
    seen: new Set(),
    toolCalls: new Map(),
    appended: 0,
  }
}

/** Binary payloads live in pi's original log and the attachment store, not duplicated in audit metadata. */
function piMetadata(message: PiMessage): PiMessage | Record<string, any> {
  if (
    !Array.isArray(message.content) ||
    !message.content.some((block) => block.type === 'image')
  )
    return message
  const { content: _content, ...metadata } = message
  return metadata
}

function append(session: Session, type: string, data: any, options?: any): any {
  return session.append(type, JSON.parse(JSON.stringify(data)), options)
}

function ensureTurn(session: Session, state: SyncState): void {
  if (state.turnStarted) return
  append(session, 'turn/start', { turn: state.turn })
  state.turnStarted = true
}

function appendSystem(
  session: Session,
  state: SyncState,
  entry: any,
  message: PiMessage,
  systemPrompt?: string,
): void {
  if (state.systemSeq !== undefined) return
  ensureTurn(session, state)
  let content = piContentToDsh(
    systemPrompt && systemPrompt.trim().length > 0
      ? systemPrompt
      : typeof message.content === 'string'
        ? message.content
        : [],
  )
  if (
    !content.some(
      (block) =>
        block.type === 'text' && String(block.text ?? '').trim().length > 0,
    )
  ) {
    const sections = (message as any).sections
    if (sections && typeof sections === 'object') {
      const text = Object.values(sections)
        .filter((value) => typeof value === 'string' && value.trim())
        .join('\n\n')
      if (text) content = [{ type: 'text', text }]
    }
  }
  const event = append(
    session,
    'system/message',
    {
      turn: state.turn,
      step: Math.max(state.step, 1),
      message: {
        role: 'system',
        id: entry.id,
        source: { kind: 'system-prompt' },
        content,
      },
    },
    { surfaceOp: 'append' },
  )
  state.systemSeq = event.seq
}

function appendUser(
  session: Session,
  state: SyncState,
  entry: any,
  message: PiMessage,
): void {
  ensureTurn(session, state)
  if (state.stepOpen) {
    append(session, 'step/end', { turn: state.turn, step: state.step })
    state.stepOpen = false
  }
  append(
    session,
    'user/message',
    {
      role: 'user',
      id: entry.id,
      source: { kind: 'user', pi: piMetadata(message) },
      content: piContentToDsh(message.content as any, state.imageToDsh),
    },
    { surfaceOp: 'append' },
  )
}

function appendAssistant(
  session: Session,
  state: SyncState,
  entry: any,
  message: PiMessage,
): void {
  ensureTurn(session, state)
  if (state.stepOpen) {
    append(session, 'step/end', { turn: state.turn, step: state.step })
    state.stepOpen = false
  }
  state.step += 1
  append(session, 'step/start', { turn: state.turn, step: state.step })
  state.stepOpen = true
  if (['error', 'aborted'].includes(message.stopReason)) {
    append(session, 'assistant/attempt', {
      turn: state.turn,
      step: state.step,
      stream: [],
    })
    return
  }
  const content = piContentToDsh(message.content as any, state.imageToDsh)
  append(
    session,
    'assistant/message',
    {
      turn: state.turn,
      step: state.step,
      message: {
        role: 'assistant',
        id: entry.id,
        source: {
          kind: 'model',
          pi: piMetadata(message),
          provider: String((message as any).provider ?? 'pi'),
          model: String((message as any).model ?? 'pi'),
        },
        content,
      },
      // Final-block replay preserves usage pricing; original delta timing is unavailable.
      stream: content.map((block, index) => ({
        type: 'chunk',
        time: 0,
        chunk: { type: 'block-end', index, block },
      })),
      ...((message as any).usage &&
      !['error', 'aborted'].includes((message as any).stopReason)
        ? {
            usage: {
              inputTokens: Number(message.usage.input ?? 0),
              outputTokens: Number(message.usage.output ?? 0),
              cacheReadTokens: Number(message.usage.cacheRead ?? 0),
              cacheWriteTokens: Number(message.usage.cacheWrite ?? 0),
            },
          }
        : {}),
    },
    { surfaceOp: 'append' },
  )
  for (const block of content) {
    if (block.type !== 'tool-call') continue
    const callId = String(block.id ?? '')
    if (!callId) continue
    const call = append(session, 'tool/call', {
      turn: state.turn,
      step: state.step,
      callId,
      name: String(block.name ?? ''),
      arguments: String(block.arguments ?? '{}'),
    })
    state.toolCalls.set(callId, call.seq)
  }
}

function appendToolResult(
  session: Session,
  state: SyncState,
  entry: any,
  message: PiMessage,
): void {
  ensureTurn(session, state)
  const toolCallId = String((message as any).toolCallId ?? '')
  let callSeq = state.toolCalls.get(toolCallId)
  if (callSeq === undefined) {
    const call = append(session, 'tool/call', {
      turn: state.turn,
      step: Math.max(state.step, 1),
      callId: toolCallId,
      name: String((message as any).toolName ?? ''),
      arguments: '{}',
    })
    callSeq = call.seq
    state.toolCalls.set(toolCallId, call.seq)
  }
  const content = piContentToDsh(
    (message as any).content ?? [],
    state.imageToDsh,
  )
  append(
    session,
    'tool/result',
    {
      turn: state.turn,
      step: Math.max(state.step, 1),
      message: {
        role: 'tool',
        id: entry.id,
        source: { kind: 'tool', callId: toolCallId, pi: piMetadata(message) },
        toolCallId,
        content,
        isError: (message as any).isError === true,
      },
    },
    { surfaceOp: 'append', sourceEventSeqs: [callSeq] },
  )
}

/**
 * Append every not-yet-seen pi message entry to the DSH session.
 * Non-message pi entries (model/thinking changes, context_edit, ...) are
 * ignored in this first slice; compaction only needs the model-visible
 * message surface.
 */
export function syncPiEntries(
  session: Session,
  entries: readonly any[],
  state: SyncState,
  options: { systemPrompt?: string; imageToDsh?: (image: any) => any } = {},
): number {
  if (options.imageToDsh) state.imageToDsh = options.imageToDsh
  let count = 0
  for (const entry of entries) {
    if (entry?.type !== 'message' || !entry.message) continue
    const id = String(entry.id ?? '')
    if (id && state.seen.has(id)) continue
    const message = entry.message as PiMessage
    switch (message.role) {
      case 'system':
        appendSystem(session, state, entry, message, options.systemPrompt)
        break
      case 'user':
        appendUser(session, state, entry, message)
        break
      case 'assistant':
        appendAssistant(session, state, entry, message)
        break
      case 'toolResult':
        appendToolResult(session, state, entry, message)
        break
      default:
        break
    }
    if (id) state.seen.add(id)
    count += 1
    state.appended += 1
  }
  return count
}

/** Close the current DSH turn so the log looks like a completed DSH session. */
export function closeTurn(session: Session, state: SyncState): void {
  if (state.stepOpen) {
    append(session, 'step/end', { turn: state.turn, step: state.step })
    state.stepOpen = false
  }
  if (state.turnStarted) {
    append(session, 'turn/end', {
      turn: state.turn,
      reason: { kind: 'completed' },
    })
    state.turnStarted = false
    state.turn += 1
  }
}

/** Next free turn number for a restored session. */
export function nextTurn(session: Session): number {
  let max = 0
  for (const event of session.snapshotEvents()) {
    if (event.type === 'turn/start')
      max = Math.max(max, Number((event.data as any)?.turn ?? 0))
  }
  return max + 1
}
