/** Reject accidental changes to the pinned upstream runtime. */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..', 'vendor')
const manifest = JSON.parse(
  readFileSync(path.join(root, 'manifest.json'), 'utf8'),
)
// attachment-local loads Sharp lazily with createRequire; esbuild cannot see
// that dependency edge. Keep the declared production version in sync explicitly.
const attachmentPackage = JSON.parse(
  readFileSync(
    path.join(
      root,
      manifest.sourceDirectory,
      'packages/attachment/attachment-local/package.json',
    ),
    'utf8',
  ),
)
const packageInfo = JSON.parse(
  readFileSync(path.join(root, '../package.json'), 'utf8'),
)
if (packageInfo.dependencies?.sharp !== attachmentPackage.dependencies.sharp)
  throw new Error(
    `attachment-local requires sharp ${attachmentPackage.dependencies.sharp}; update DCP's production dependency before building`,
  )
for (const [file, expected] of [
  ['dsh-runtime.mjs', manifest.runtimeSha256],
  ['pi-messages.mjs', manifest.pi.sha256],
]) {
  const actual = createHash('sha256')
    .update(readFileSync(path.join(root, file)))
    .digest('hex')
  if (actual !== expected)
    throw new Error(
      `${file} differs from the pinned upstream snapshot; refresh with npm run vendor:dsh`,
    )
}

for (const input of manifest.inputs) {
  const file = path.join(root, manifest.sourceDirectory, input.file)
  if (sha256(file) !== input.sha256)
    throw new Error(
      `Copied upstream file changed: ${input.file}. Resync with npm run vendor:dsh.`,
    )
}
function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}
if (process.argv[2] === '--upstream') {
  const upstream = path.resolve(process.argv[3] ?? '../deepseek-harness')
  for (const input of manifest.inputs)
    if (sha256(path.join(upstream, input.upstreamFile)) !== input.sha256)
      throw new Error(`Snapshot differs from upstream: ${input.upstreamFile}`)
  console.log(
    `Verified ${manifest.inputs.length} files byte-for-byte against upstream.`,
  )
}
