/** DCP-owned source resolver; upstream source files never receive import edits. */
import { build } from 'esbuild'
import { builtinModules } from 'node:module'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
export const entry = `
export { Context, Service } from '@deepseek-ai/cordis'
export { CONTEXT_WINDOW_EXCEEDED_CODE, IMAGE_OFFLOAD_REQUIRED_CODE, LlmError, requiredImageOffload, offloadedImageText, requestImageHandleText } from '@deepseek-ai/dsh-llm'
export { LocalAttachmentStore } from '@deepseek-ai/dsh-attachment-local'
export { requestImageDimensions } from '@deepseek-ai/dsh-attachment'
export * as ImageOffloadPlugin from '@deepseek-ai/dsh-compaction-image-offload'
export { imageOffloadProjection } from '@deepseek-ai/dsh-compaction-image-offload/projection'
export { BasicCompactionEngine } from '@deepseek-ai/dsh-compaction-basic'
export { ToolResultPruner } from '@deepseek-ai/dsh-compaction-tool-result-pruner'
export { TokenMeter } from '@deepseek-ai/dsh-token-meter'
export { SessionProjectionRegistry } from '@deepseek-ai/dsh-session-projection'
export { Session, SessionStore, appendPluginRecord } from '@deepseek-ai/dsh-session'
export { SESSION_FORMAT_VERSION, SessionSeq } from '@deepseek-ai/dsh-session/types'
export { toolPairingBalancedBefore } from '@deepseek-ai/dsh-compaction'
export { selectCompactableRange } from '@deepseek-ai/dsh-compaction-basic/src/region.ts'
export { resolveConfig, resolveTargetPolicy, resolveCompactSpec } from '@deepseek-ai/dsh-compaction-basic/src/config.ts'
`
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
])
export function ownerOf(file) {
  for (
    let dir = path.dirname(file);
    dir !== path.dirname(dir);
    dir = path.dirname(dir)
  ) {
    const pkg = path.join(dir, 'package.json')
    if (existsSync(pkg)) {
      const data = JSON.parse(readFileSync(pkg, 'utf8'))
      if (data.name) return { dir, pkg: data }
    }
  }
  throw new Error(`No package owner for ${file}`)
}
export function sourceKey(root, file) {
  const relative = path.relative(root, file).split(path.sep).join('/')
  if (
    !relative.startsWith('../') &&
    !relative.split('/').includes('node_modules')
  )
    return relative
  const { dir, pkg } = ownerOf(file)
  return `dependencies/${pkg.name.replaceAll('/', '__')}@${pkg.version}/${path.relative(dir, file).split(path.sep).join('/')}`
}
function packages(root) {
  const result = new Map()
  for (const group of ['packages', 'vendor']) {
    const base = path.join(root, group)
    for (const name of readdirSync(base)) {
      const dir = path.join(base, name)
      if (!statSync(dir).isDirectory()) continue
      const candidates = existsSync(path.join(dir, 'package.json'))
        ? [dir]
        : readdirSync(dir).map((child) => path.join(dir, child))
      for (const candidate of candidates) {
        const file = path.join(candidate, 'package.json')
        if (existsSync(file))
          result.set(JSON.parse(readFileSync(file, 'utf8')).name, candidate)
      }
    }
  }
  return result
}
function sourceExport(dir, subpath) {
  if (subpath === 'package.json') return path.join(dir, 'package.json')
  const leaf = subpath.startsWith('src/')
    ? subpath.slice(4)
    : subpath || 'index'
  for (const file of [
    path.join(dir, 'src', leaf),
    path.join(dir, 'src', leaf + '.ts'),
    path.join(dir, 'src', leaf, 'index.ts'),
  ]) {
    if (existsSync(file) && statSync(file).isFile()) return file
  }
  throw new Error(`No source export for ${dir}/${subpath}`)
}
export async function upstreamBuild(root, outfile) {
  const registry = packages(root),
    edges = new Map()
  const result = await build({
    stdin: { contents: entry, resolveDir: root, loader: 'ts' },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    metafile: true,
    legalComments: 'eof',
    plugins: [
      {
        name: 'dsh-unmodified-source',
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, async (args) => {
            if (args.pluginData?.resolving) return
            const importer =
              args.importer && args.importer !== '<stdin>'
                ? sourceKey(root, args.importer)
                : '<entry>'
            let resolved
            if (builtins.has(args.path))
              resolved = { path: args.path, external: true }
            else {
              const match = /^(@[^/]+\/[^/]+|[^/]+)(?:\/(.*))?$/.exec(args.path)
              if (match && registry.has(match[1]))
                resolved = {
                  path: sourceExport(registry.get(match[1]), match[2] ?? ''),
                }
              else
                resolved = await builder.resolve(args.path, {
                  resolveDir: args.resolveDir,
                  kind: args.kind,
                  pluginData: { resolving: true },
                })
            }
            if (resolved.errors?.length) return resolved
            if (!resolved.path)
              throw new Error(`Cannot resolve ${args.path} in ${args.importer}`)
            const edge = {
              importer,
              specifier: args.path,
              kind: args.kind,
              ...(resolved.external
                ? { external: true, target: resolved.path }
                : { target: sourceKey(root, resolved.path) }),
            }
            const key = JSON.stringify([importer, args.path, args.kind])
            edges.set(key, edge)
            return { path: resolved.path, external: resolved.external }
          })
        },
      },
    ],
  })
  return {
    result,
    edges: [...edges.values()].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
  }
}
export async function snapshotBuild(vendor, outfile) {
  const manifest = JSON.parse(
    readFileSync(path.join(vendor, 'manifest.json'), 'utf8'),
  )
  const sourceRoot = path.join(vendor, manifest.sourceDirectory)
  const edges = new Map(
    manifest.resolutions.map((edge) => [
      JSON.stringify([edge.importer, edge.specifier, edge.kind]),
      edge,
    ]),
  )
  return build({
    absWorkingDir: sourceRoot,
    stdin: { contents: entry, resolveDir: sourceRoot, loader: 'ts' },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    legalComments: 'eof',
    plugins: [
      {
        name: 'dsh-snapshot-imports',
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, (args) => {
            const importer =
              args.importer && args.importer !== '<stdin>'
                ? path
                    .relative(sourceRoot, args.importer)
                    .split(path.sep)
                    .join('/')
                : '<entry>'
            const edge = edges.get(
              JSON.stringify([importer, args.path, args.kind]),
            )
            if (!edge)
              throw new Error(
                `DSH dependency changed: ${importer} imports ${args.path}. Resync from upstream with npm run vendor:dsh.`,
              )
            return edge.external
              ? { path: edge.target, external: true }
              : { path: path.join(sourceRoot, edge.target) }
          })
        },
      },
    ],
  })
}
