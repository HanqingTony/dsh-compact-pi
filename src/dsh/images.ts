/** pi owns the original bytes; upstream owns immutable attachment storage and offload policy. */
import { createHash } from 'node:crypto'
import {
  Context,
  LocalAttachmentStore,
  LlmError,
  IMAGE_OFFLOAD_REQUIRED_CODE,
  requiredImageOffload,
  offloadedImageText,
  requestImageHandleText,
  requestImageDimensions,
} from '../../vendor/dsh-runtime.mjs'
import type { DshContentBlock, DshMessage } from './messages.ts'

type PiImage = { type: 'image'; data: string; mimeType: string }
const identity = (image: PiImage) =>
  createHash('sha256')
    .update(image.mimeType)
    .update('\0')
    .update(image.data)
    .digest('hex')

export class ImageBridge {
  private refs = new Map<string, Promise<any>>()
  private admitted = new Map<string, any>()
  private originals = new Map<string, PiImage>()
  constructor(readonly store: LocalAttachmentStore) {}

  async prepare(messages: readonly any[], signal?: AbortSignal): Promise<void> {
    const active = new Set<string>(),
      attachments = new Set<string>()
    for (const message of messages) {
      if (!Array.isArray(message.content)) continue
      for (const image of message.content) {
        if (image.type !== 'image') continue
        signal?.throwIfAborted()
        const key = identity(image)
        active.add(key)
        let pending = this.refs.get(key)
        if (!pending) {
          pending = this.store.saveImage({
            data: Buffer.from(image.data, 'base64'),
            mediaType: image.mimeType,
          })
          this.refs.set(key, pending)
        }
        let ref
        try {
          ref = await pending
        } catch (error) {
          this.refs.delete(key)
          throw error
        }
        attachments.add(ref.attachmentId)
        this.admitted.set(key, ref)
        this.originals.set(ref.attachmentId, image)
        signal?.throwIfAborted()
      }
    }
    for (const key of this.refs.keys())
      if (!active.has(key)) this.refs.delete(key)
    for (const key of this.admitted.keys())
      if (!active.has(key)) this.admitted.delete(key)
    for (const key of this.originals.keys())
      if (!attachments.has(key)) this.originals.delete(key)
  }
  toDsh = (image: PiImage): DshContentBlock => {
    const attachment = this.admitted.get(identity(image))
    if (!attachment)
      throw new Error(
        'dcp: image has not been admitted to the attachment store',
      )
    return { type: 'image', attachment }
  }
  private access(ref: any): { readonlyPath: string } | undefined {
    const readonlyPath = this.store.imageHostPath(ref)
    return readonlyPath ? { readonlyPath } : undefined
  }
  toPi = (block: DshContentBlock): any => {
    const ref: any = block.attachment
    if (!ref)
      throw new Error('dcp: image is missing its durable attachment reference')
    if (block.offloaded)
      return { type: 'text', text: offloadedImageText(ref, this.access(ref)) }
    const original = this.originals.get(ref.attachmentId)
    if (!original)
      throw new Error(
        `dcp: image bytes are unavailable for ${ref.attachmentId}`,
      )
    return original
  }
  async hydrate(
    messages: readonly DshMessage[],
    signal?: AbortSignal,
  ): Promise<void> {
    for (const message of messages)
      for (const block of message.content) {
        if (block.type !== 'image' || block.offloaded || !block.attachment)
          continue
        const ref: any = block.attachment
        if (this.originals.has(ref.attachmentId)) continue
        const stored = await this.store.readImage(ref, signal)
        this.originals.set(ref.attachmentId, {
          type: 'image',
          data: Buffer.from(stored.data).toString('base64'),
          mimeType: ref.mediaType,
        })
      }
  }

  /** Route checks use the exact encoded bytes subsequently sent, never base64-as-token estimates. */
  assertRequest(
    messages: readonly DshMessage[],
    model: any,
    imageOf = this.toPi,
  ): void {
    const retained = messages.flatMap((message) =>
      message.content.filter(
        (block) => block.type === 'image' && !block.offloaded,
      ),
    )
    if (
      retained.length &&
      Array.isArray(model.input) &&
      !model.input.includes('image')
    )
      throw new LlmError(
        `pi model "${model.id}" does not support image input`,
        'UNSUPPORTED_CONTENT',
      )
    const limits = model.inputLimits?.images
    const maxImages = limits?.maxPerRequest ?? 50
    const budget = {
      representation: 'base64',
      maxBytes: 20 * 1024 * 1024,
      maxImages,
      countQuantum: Math.min(10, maxImages),
    }
    const bytesOf = (block: any) =>
      Buffer.from(imageOf(block).data, 'base64').length
    let count = requiredImageOffload(messages, budget, bytesOf)
    if (limits?.maxPerMessage)
      for (const message of messages)
        count = Math.max(
          count,
          requiredImageOffload(
            [message],
            {
              representation: 'base64',
              maxImages: limits.maxPerMessage,
            },
            bytesOf,
          ),
        )
    if (count > 0)
      throw new LlmError(
        `pi request image budget requires omitting ${count} oldest image occurrence(s)`,
        IMAGE_OFFLOAD_REQUIRED_CODE,
        { offloadImages: count },
      )
  }

  async requestMapper(
    messages: readonly DshMessage[],
    model: any,
    signal?: AbortSignal,
  ) {
    const versions = new Map<string, any>()
    for (const message of messages)
      for (const block of message.content) {
        if (block.type !== 'image' || block.offloaded) continue
        const ref: any = block.attachment
        if (versions.has(ref.attachmentId)) continue
        const resize = model.inputLimits?.images?.resize
        const dimensions = requestImageDimensions(
          ref.width,
          ref.height,
          2048 * 2048,
        )
        const scale = Math.min(
          1,
          (resize?.maxWidth ?? dimensions.width) / dimensions.width,
          (resize?.maxHeight ?? dimensions.height) / dimensions.height,
        )
        const version = await this.store.readImageRequest(
          ref,
          {
            width: Math.max(1, Math.floor(dimensions.width * scale)),
            height: Math.max(1, Math.floor(dimensions.height * scale)),
            maxBytes: resize?.maxBytes ?? 1024 * 1024,
          },
          signal,
        )
        versions.set(ref.attachmentId, version)
      }
    const imageOf = (block: DshContentBlock): PiImage => {
      const version = versions.get((block.attachment as any).attachmentId)
      return {
        type: 'image',
        data: Buffer.from(version.data).toString('base64'),
        mimeType: version.mediaType,
      }
    }
    this.assertRequest(messages, model, imageOf)
    return (block: DshContentBlock): any[] => {
      const ref: any = block.attachment
      if (block.offloaded) return [this.toPi(block)]
      const version = versions.get(ref.attachmentId)
      return [
        {
          type: 'text',
          text: requestImageHandleText(ref, version, this.access(ref)),
        },
        imageOf(block),
      ]
    }
  }
}

/** Standalone converters use DSH_HOME/default ~/.dsh so DSH can resolve exported references. */
export async function openImageBridge(home?: string) {
  const ctx = new Context()
  try {
    await ctx.plugin(LocalAttachmentStore, home ? { dshHome: home } : {})
    return {
      images: new ImageBridge(ctx.get('attachments')),
      close: () => ctx.fiber.dispose(),
    }
  } catch (error) {
    await ctx.fiber.dispose()
    throw error
  }
}
