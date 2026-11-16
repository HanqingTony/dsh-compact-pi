#!/usr/bin/env node
/**
 * Restore a legacy v0.1 DSH session codec patch.
 * New patch installation is retired; v0.2 uses normal pi extensions.
 *
 *   node scripts/patch-pi.mjs --restore [--pi-dir <dir>]
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  copyFileSync,
  statSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import * as os from 'node:os'
import * as path from 'node:path'

function arg(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const restore = process.argv.includes('--restore')
const explicitPiDir = arg('--pi-dir', process.env.PI_PACKAGE_DIR)

function findPiPackageDir() {
  if (explicitPiDir) return explicitPiDir
  try {
    const shim = execFileSync('which', ['pi'], { encoding: 'utf8' }).trim()
    const text = readFileSync(shim, 'utf8')
    const match = text.match(
      /(\/[^"'\s]*\/node_modules\/@earendil-works\/pi-coding-agent)\//,
    )
    if (match) {
      const dir = path.resolve(path.dirname(shim), `.${match[1]}`)
      if (existsSync(path.join(dir, 'dist', 'core', 'session-manager.js')))
        return dir
    }
  } catch {
    // Fall through.
  }
  for (const base of [
    path.join(os.homedir(), '.local', 'share', 'pnpm', 'global'),
    path.join(os.homedir(), '.local', 'share', 'pnpm'),
  ]) {
    if (!existsSync(base)) continue
    for (const version of readdirSync(base)) {
      const versionDir = path.join(base, version)
      const direct = path.join(
        versionDir,
        'node_modules',
        '@earendil-works',
        'pi-coding-agent',
      )
      if (existsSync(path.join(direct, 'dist', 'core', 'session-manager.js')))
        return direct
      if (!statSync(versionDir).isDirectory()) continue
      for (const hash of readdirSync(versionDir)) {
        const candidate = path.join(
          versionDir,
          hash,
          'node_modules',
          '@earendil-works',
          'pi-coding-agent',
        )
        if (
          existsSync(path.join(candidate, 'dist', 'core', 'session-manager.js'))
        )
          return candidate
      }
    }
  }
  return undefined
}

const piDir = findPiPackageDir()
if (!piDir) {
  console.error(
    'dsh-pi: could not locate @earendil-works/pi-coding-agent; pass --pi-dir',
  )
  process.exit(1)
}

const bundleDir = path.join(piDir, 'dist', 'bundle', 'chunks')
const bundleFiles = existsSync(bundleDir)
  ? readdirSync(bundleDir)
      .filter((name) => name.endsWith('.js'))
      .map((name) => path.join(bundleDir, name))
  : []
const targets = [
  path.join(piDir, 'dist', 'core', 'session-manager.js'),
  ...bundleFiles,
]

if (restore) {
  let restored = 0
  for (const target of targets) {
    const backup = `${target}.dsh-pi.bak`
    if (!existsSync(backup)) continue
    if (!readFileSync(target, 'utf8').includes('dsh-pi codec patch')) {
      console.error(
        `dsh-pi: refusing to overwrite an unpatched or upgraded file: ${target}`,
      )
      continue
    }
    copyFileSync(backup, target)
    unlinkSync(backup)
    restored += 1
    console.log(`dsh-pi: restored ${target}`)
  }
  const installedCodec = path.join(piDir, 'dist', 'dsh-pi-codec.mjs')
  if (restored === 0) {
    console.error('dsh-pi: no backups found')
    process.exit(1)
  }
  if (existsSync(installedCodec)) unlinkSync(installedCodec)
  process.exit(0)
}

console.error(
  'dcp 0.2 uses the standard pi extension API. Native codec patch installation is retired. Install this package with pi install; use --restore to remove a legacy patch.',
)
process.exit(1)
