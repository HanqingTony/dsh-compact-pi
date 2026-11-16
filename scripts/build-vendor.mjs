/** Rebuild from checked-in source; does not read an upstream checkout or its lib/. */
import { readFileSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { snapshotBuild, sha } from './dsh-vendor-lib.mjs'
const vendor = path.resolve(import.meta.dirname, '../vendor')
const target = path.join(vendor, 'dsh-runtime.mjs')
const temporary = `${target}.${process.pid}.tmp`
try {
  await snapshotBuild(vendor, temporary)
  const manifest = JSON.parse(
    readFileSync(path.join(vendor, 'manifest.json'), 'utf8'),
  )
  if (sha(readFileSync(temporary)) !== manifest.runtimeSha256)
    throw new Error(
      'Rebuilt DSH runtime differs from the snapshot manifest. Use the pinned esbuild and resync upstream.',
    )
  renameSync(temporary, target)
} finally {
  rmSync(temporary, { force: true })
}
