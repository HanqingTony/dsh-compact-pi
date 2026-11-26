/** Narrow host-facing declarations for the pinned bundled runtime.
 * DSH events/services are merge-extensible; payloads at this adapter seam are
 * dynamic. The upstream implementation and input hashes live in this directory.
 */
export interface DshEvent {
  type: string
  seq: number
  time: number
  data: any
  sourceEventSeqs?: number[]
  surfaceOp?: any
}
export class Session {
  static create(...args: any[]): Session
  readonly id: string
  readonly seq: number
  readonly surface: { nodes: number[]; replaceGeneration: number }
  append(type: string, data: any, options?: any): DshEvent
  eventAt(seq: number): DshEvent | undefined
  deriveEventMessage(event: DshEvent): any
  snapshotEvents(): DshEvent[]
  requestHeader(): any
  toolHistory(): any
}
export class Context {
  logger: {
    exporter(options: {
      levels?: Record<string, number>
      export: (record: { type: string; args: unknown[] }) => void
    }): () => void
  }
  plugin(plugin: any, config?: any): Promise<any>
  on(event: string, handler: (...args: any[]) => any): () => void
  emit(event: string, ...args: any[]): any
  waterfall(event: string, payload: any, next: (...args: any[]) => any): any
  provide(name: string, value: any): void
  get(name: string): any
  fiber: { dispose(): Promise<void> }
}
export interface Measurement {
  totalTokens: number
  nodes: { seq: number; tokens: number; heuristicTokens: number }[]
}
export class TokenMeter {
  constructor(ctx: Context)
  measure(session: Session): Measurement
  estimateMessage(message: any): number
}
export interface Policy {
  auto?: boolean
  thresholdRatio?: number
  headroomTokens?: number
  retainRatio?: number
  retainTokens?: number
  maxTokens?: number
  compactionRetries?: number
  maxOverflowRetries?: number
  summarizationProvider?: string
  summarizationModel?: string
  modelPolicies?: any[]
}
export class BasicCompactionEngine {
  constructor(ctx: Context, config?: Policy)
  readonly config: Policy
  compactIfNeeded(
    agent: any,
    trigger: 'pressure' | 'context-overflow',
    signal: AbortSignal,
  ): Promise<any>
  compactNow(
    agent: any,
    signal: AbortSignal,
    sourceCommandId?: string,
  ): Promise<any>
  compactRegion(
    start: number,
    end: number,
    agent: any,
    signal?: AbortSignal,
  ): Promise<any>
}
export class ToolResultPruner {
  constructor(
    ctx: Context,
    config?: {
      thresholdChars?: number
      headChars?: number
      tailChars?: number
    },
  )
  pruneSession(session: Session): {
    pruned: { originalSeq: number; replacementSeq: number }[]
    charsRemoved: number
  }
  pruneContent(content: any[]): any[] | null
}
export function resolveConfig(config?: Policy): any
export function resolveTargetPolicy(
  config: any,
  target: { provider: string; model: string },
): any
export function resolveCompactSpec(
  policy: any,
  window: number,
  output: number,
): {
  contextWindow: number
  thresholdTokens: number
  retainTokens: number
  maxOverflowRetries: number
}
export function selectCompactableRange(
  session: Session,
  measurement: Measurement,
  retainTokens: number,
): { start: number; end: number } | null
export function toolPairingBalancedBefore(
  session: Session,
  seq: number,
): boolean
export function appendPluginRecord(
  session: Session,
  type: string,
  data: unknown,
): number
export function SessionSeq(seq: number): number
export const SESSION_FORMAT_VERSION: number

export class SessionProjectionRegistry {
  constructor(ctx: Context)
}
export class SessionStore {
  constructor(ctx: Context)
  readonly messageProjections: readonly any[]
  prepare(id?: string, options?: any): Session
  enter(session: Session): () => void
  announce(session: Session): void
  flush(session: Session): Promise<boolean>
  create(id?: string, options?: any): Session
}
export class Service {
  constructor(ctx: Context, name: string)
}

export const CONTEXT_WINDOW_EXCEEDED_CODE: string

export class LocalAttachmentStore extends Service {
  constructor(ctx: Context, config: any)
  saveImage(input: any): Promise<any>
  readImage(ref: any, signal?: AbortSignal): Promise<any>
  readImageRequest(
    ref: any,
    target: {
      width: number
      height: number
      maxImageBytes: number
      imageTargetBytes: number
    },
    signal?: AbortSignal,
  ): Promise<any>
  imageHostPath(ref: any): string | undefined
}
export const ImageOffloadPlugin: any
export const IMAGE_OFFLOAD_REQUIRED_CODE: string
export class LlmError extends Error {
  constructor(message: string, code: string, failure?: any)
  readonly code: string
  readonly failure: any
}
export function requiredImageOffload(
  messages: readonly any[],
  budget: any,
  bytes: (block: any) => number,
): number
export function offloadedImageText(ref: any, access?: any): string
export function requestImageHandleText(
  ref: any,
  version: any,
  access?: any,
): string
export function requestImageDimensions(
  width: number,
  height: number,
  maxPixels: number,
  maxWidth?: number,
  maxHeight?: number,
): { width: number; height: number }

export const imageOffloadProjection: any
