/** Copy the upstream source closure byte-for-byte, then build only from that copy. */
import { execFileSync } from 'node:child_process'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  renameSync,
} from 'node:fs'
import path from 'node:path'
import {
  upstreamBuild,
  snapshotBuild,
  sha,
  sourceKey,
  ownerOf,
} from './dsh-vendor-lib.mjs'
const root = path.resolve(process.argv[2] ?? '../deepseek-harness')
const vendor = path.resolve(import.meta.dirname, '../vendor')
const stage = path.join(vendor, `.dsh-sync-${process.pid}`)
mkdirSync(stage, { recursive: true })
try {
  const { result, edges } = await upstreamBuild(
    root,
    path.join(stage, 'probe.mjs'),
  )
  const inputs = [],
    owners = new Map(),
    files = new Set()
  for (const file of Object.keys(result.metafile.inputs))
    if (file !== '<stdin>') files.add(path.resolve(file))
  for (const file of files) {
    const owner = ownerOf(file)
    owners.set(owner.dir, owner)
  }
  for (const { dir } of owners.values())
    files.add(path.join(dir, 'package.json'))
  for (const file of [...files].sort()) {
    const key = sourceKey(root, file),
      bytes = readFileSync(file)
    const target = path.join(stage, 'dsh-source', key)
    mkdirSync(path.dirname(target), { recursive: true })
    copyFileSync(file, target)
    inputs.push({
      file: key,
      upstreamFile: path.relative(root, file).split(path.sep).join('/'),
      sha256: sha(bytes),
    })
  }
  const piRoot = path.resolve(
    import.meta.dirname,
    '../node_modules/@earendil-works/pi-coding-agent',
  )
  const piPackage = JSON.parse(
    readFileSync(path.join(piRoot, 'package.json'), 'utf8'),
  )
  const piMessages = readFileSync(
    path.join(piRoot, 'dist/core/messages.js'),
    'utf8',
  ).replace('//# sourceMappingURL=messages.js.map', '')
  const manifest = {
    upstream: 'https://github.com/deepseek-ai/deepseek-harness',
    commit: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    version: JSON.parse(
      readFileSync(
        path.join(root, 'packages/compaction/compaction-basic/package.json'),
        'utf8',
      ),
    ).version,
    sourceDirectory: 'dsh-source',
    inputs,
    resolutions: edges,
    pi: {
      version: piPackage.version,
      file: 'dist/core/messages.js',
      sha256: sha(piMessages),
    },
  }
  writeFileSync(
    path.join(stage, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
  await snapshotBuild(stage, path.join(stage, 'dsh-runtime.mjs'))
  manifest.runtimeSha256 = sha(
    readFileSync(path.join(stage, 'dsh-runtime.mjs')),
  )
  writeFileSync(
    path.join(stage, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
  const licenses = []
  for (const { dir, pkg } of owners.values())
    for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license']) {
      try {
        licenses.push(
          `${pkg.name}@${pkg.version}\n${readFileSync(path.join(dir, name), 'utf8')}`,
        )
        break
      } catch {}
    }
  writeFileSync(path.join(stage, 'THIRD-PARTY-NOTICES'), licenses.join('\n\n'))
  // Publish only a successfully rebuilt snapshot. No upstream file is rewritten.
  rmSync(path.join(vendor, 'dsh-source'), { recursive: true, force: true })
  renameSync(path.join(stage, 'dsh-source'), path.join(vendor, 'dsh-source'))
  for (const file of [
    'manifest.json',
    'dsh-runtime.mjs',
    'THIRD-PARTY-NOTICES',
  ])
    copyFileSync(path.join(stage, file), path.join(vendor, file))
  copyFileSync(
    path.join(root, 'LICENSE'),
    path.join(vendor, 'LICENSE-DeepSeek'),
  )
  writeFileSync(path.join(vendor, 'pi-messages.mjs'), piMessages)
  console.log(
    `Copied ${inputs.length} unmodified files; rebuilt from the local source snapshot (${manifest.commit}).`,
  )
} finally {
  rmSync(stage, { recursive: true, force: true })
}
