import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { piToDsh, dshToPi, readPiSession } from '../src/dsh/convert.ts'
import { readDshFile, writeDshFile } from '../src/dsh/store.ts'
import { makeHeader, restoreSession } from '../src/dsh/session.ts'
import { openImageBridge } from '../src/dsh/images.ts'
import { createSyncState, syncPiEntries } from '../src/dsh/sync.ts'

const data = (
  await sharp({
    create: { width: 24, height: 16, channels: 3, background: 'red' },
  })
    .png()
    .toBuffer()
).toString('base64')
const picture = { type: 'image', data, mimeType: 'image/png' }
test('CLI exports valid image refs and retains byte-exact pi archive round trips', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-image-convert-')),
    previous = process.env.DSH_HOME
  process.env.DSH_HOME = dir
  try {
    const input = path.join(dir, 'input.pi.jsonl'),
      output = path.join(dir, 'output.dsh.jsonl'),
      back = path.join(dir, 'back.pi.jsonl')
    const rows = [
      {
        type: 'session',
        version: 3,
        id: 'image-export',
        cwd: dir,
        timestamp: new Date().toISOString(),
      },
      {
        type: 'message',
        id: 'u1',
        parentId: null,
        timestamp: new Date().toISOString(),
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'look' }, picture],
          timestamp: 1,
        },
      },
    ]
    writeFileSync(
      input,
      rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
    )
    await piToDsh(input, output)
    const exported = (await readDshFile(output))!
    const image = exported.events
      .find((e) => e.type === 'user/message')
      .data.content.find((b: any) => b.type === 'image')
    assert.match(image.attachment.attachmentId, /^sha256:/)
    assert.equal(image.data, undefined)
    await dshToPi(output, back)
    assert.deepEqual(await readPiSession(back), {
      header: rows[0],
      entries: [rows[1]],
    })
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    rmSync(dir, { recursive: true, force: true })
  }
})

test('foreign DSH import resolves attachments, replays omissions, and fails explicitly on missing assets', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dcp-foreign-image-')),
    previous = process.env.DSH_HOME
  process.env.DSH_HOME = dir
  const carrier = await openImageBridge()
  try {
    const header = makeHeader('foreign', dir),
      session = restoreSession(header, [])
    const message = { role: 'user', content: [picture, picture], timestamp: 1 }
    await carrier.images.prepare([message])
    syncPiEntries(
      session,
      [{ type: 'message', id: 'image', message }],
      createSyncState(),
      { imageToDsh: carrier.images.toDsh },
    )
    const event = session
      .snapshotEvents()
      .find((e) => e.type === 'user/message')!
    session.append('image/offload', {
      targets: [{ seq: event.seq, imageIndexes: [0] }],
    })
    const input = path.join(dir, 'foreign.dsh.jsonl'),
      output = path.join(dir, 'foreign.pi.jsonl')
    await writeDshFile(input, header, session.snapshotEvents())
    await dshToPi(input, output)
    const imported = await readPiSession(output),
      content = imported.entries[0].message.content
    assert.equal(content.filter((b: any) => b.type === 'image').length, 1)
    assert.match(content[0].text, /image omitted to fit request image limits/)
    assert.equal(content[1].data, data)
    const imageRef = event.data.content[1].attachment
    const stored = carrier.images.store.imageHostPath(imageRef)!
    assert.ok(existsSync(stored))
    rmSync(stored)
    const missing = path.join(dir, 'missing.pi.jsonl')
    await assert.rejects(dshToPi(input, missing), /image|attachment|ENOENT/i)
    assert.equal(existsSync(missing), false)
  } finally {
    await carrier.close()
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    rmSync(dir, { recursive: true, force: true })
  }
})
