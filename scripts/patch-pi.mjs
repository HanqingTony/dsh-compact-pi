#!/usr/bin/env node
/**
 * Install/restore the DSH session codec in pi's session manager.
 * Patches both the package module and the bundled CLI chunk.
 *
 *   node scripts/patch-pi.mjs [--pi-dir <dir>] [--codec <file>] [--restore]
 */

import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MARKER = '/* dsh-pi codec patch v0.1.0 */'
const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(here, '..')

function arg(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const restore = process.argv.includes('--restore')
const explicitPiDir = arg('--pi-dir', process.env.PI_PACKAGE_DIR)
const codecFile = path.resolve(arg('--codec', path.join(pkgRoot, 'dist', 'codec.mjs')))

function findPiPackageDir() {
  if (explicitPiDir) return explicitPiDir
  try {
    const shim = execFileSync('which', ['pi'], { encoding: 'utf8' }).trim()
    const text = readFileSync(shim, 'utf8')
    const match = text.match(/(\/[^"'\s]*\/node_modules\/@earendil-works\/pi-coding-agent)\//)
    if (match) {
      const dir = path.resolve(path.dirname(shim), `.${match[1]}`)
      if (existsSync(path.join(dir, 'dist', 'core', 'session-manager.js'))) return dir
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
      const direct = path.join(versionDir, 'node_modules', '@earendil-works', 'pi-coding-agent')
      if (existsSync(path.join(direct, 'dist', 'core', 'session-manager.js'))) return direct
      if (!existsSync(versionDir)) continue
      for (const hash of readdirSync(versionDir)) {
        const candidate = path.join(versionDir, hash, 'node_modules', '@earendil-works', 'pi-coding-agent')
        if (existsSync(path.join(candidate, 'dist', 'core', 'session-manager.js'))) return candidate
      }
    }
  }
  return undefined
}

const piDir = findPiPackageDir()
if (!piDir) {
  console.error('dsh-pi: could not locate @earendil-works/pi-coding-agent; pass --pi-dir')
  process.exit(1)
}

const bundleDir = path.join(piDir, 'dist', 'bundle', 'chunks')
const bundleFiles = existsSync(bundleDir)
  ? readdirSync(bundleDir).filter((name) => name.endsWith('.js')).map((name) => path.join(bundleDir, name))
  : []
const bundleTarget = bundleFiles.find((file) => readFileSync(file, 'utf8').includes('function loadEntriesFromFile(filePath){'))
const targets = [path.join(piDir, 'dist', 'core', 'session-manager.js'), ...(bundleTarget ? [bundleTarget] : [])]

if (restore) {
  let restored = 0
  for (const target of targets) {
    const backup = `${target}.dsh-pi.bak`
    if (!existsSync(backup)) continue
    copyFileSync(backup, target)
    unlinkSync(backup)
    restored += 1
    console.log(`dsh-pi: restored ${target}`)
  }
  const installedCodec = path.join(piDir, 'dist', 'dsh-pi-codec.mjs')
  if (existsSync(installedCodec)) unlinkSync(installedCodec)
  if (restored === 0) {
    console.error('dsh-pi: no backups found')
    process.exit(1)
  }
  process.exit(0)
}

if (!existsSync(codecFile)) {
  console.error(`dsh-pi: codec not found: ${codecFile}`)
  process.exit(1)
}
const installedCodec = path.join(piDir, 'dist', 'dsh-pi-codec.mjs')
copyFileSync(codecFile, installedCodec)
const importLine = `import * as __dshPiCodec from ${JSON.stringify(pathToFileURL(installedCodec).href)}; ${MARKER}\n`

function replaceOnce(source, needle, replacement, label) {
  const index = source.indexOf(needle)
  if (index < 0) throw new Error(`patch point not found: ${label}`)
  return source.slice(0, index) + replacement + source.slice(index + needle.length)
}

function patchReadable(source) {
  source = importLine + source
  source = replaceOnce(
    source,
    `export function loadEntriesFromFile(filePath) {\n    const resolvedFilePath = normalizePath(filePath);`,
    `export function loadEntriesFromFile(filePath) {\n    const resolvedFilePath = normalizePath(filePath);\n    if (__dshPiCodec.isDshFile(resolvedFilePath)) {\n        const converted = __dshPiCodec.readDshAsPi(resolvedFilePath);\n        return converted ? [converted.header, ...converted.entries] : [];\n    }`,
    'readable loadEntriesFromFile',
  )
  source = replaceOnce(
    source,
    `function readSessionHeader(filePath) {\n    const fd = openSync(filePath, "r");`,
    `function readSessionHeader(filePath) {\n    if (__dshPiCodec.isDshFile(filePath)) {\n        return __dshPiCodec.readPiHeader(filePath);\n    }\n    const fd = openSync(filePath, "r");`,
    'readable readSessionHeader',
  )
  source = replaceOnce(
    source,
    `async function buildSessionInfo(filePath, signal, fileStats) {\n    try {\n        const stats = fileStats ?? (await stat(filePath));`,
    `async function buildSessionInfo(filePath, signal, fileStats) {\n    try {\n    if (__dshPiCodec.isDshFile(filePath)) {\n        const converted = __dshPiCodec.readDshAsPi(filePath);\n        if (converted) {\n            const messages = converted.entries.filter((entry) => entry.type === "message");\n            const firstUser = messages.find((entry) => entry.message?.role === "user");\n            return {\n                path: filePath,\n                id: converted.header.id,\n                cwd: converted.header.cwd ?? "",\n                name: undefined,\n                parentSessionPath: converted.header.parentSession,\n                created: new Date(converted.header.timestamp),\n                modified: new Date(),\n                messageCount: messages.length,\n                firstMessage: firstUser ? extractTextContent(firstUser.message) || "(no messages)" : "(no messages)",\n                allMessagesText: messages.map((entry) => extractTextContent(entry.message)).filter(Boolean).join(" "),\n            };\n        }\n    }\n        const stats = fileStats ?? (await stat(filePath));`,
    'readable buildSessionInfo',
  )
  source = replaceOnce(
    source,
    `            const fd = openSync(this.sessionFile, "wx");\n            try {\n                for (const e of this.fileEntries) {\n                    writeFileSync(fd, \`\${JSON.stringify(e)}\\n\`);\n                }\n            }`,
    `            const fd = openSync(this.sessionFile, "wx");\n            try {\n                writeFileSync(fd, __dshPiCodec.dshRowsFromPi(this.fileEntries[0], this.fileEntries.slice(1), this.sessionFile));\n            }`,
    'readable _persist initial',
  )
  source = replaceOnce(
    source,
    `            appendFileSync(this.sessionFile, \`\${JSON.stringify(entry)}\\n\`);`,
    `            __dshPiCodec.appendPiEntry(this.sessionFile, entry);`,
    'readable _persist append',
  )
  source = replaceOnce(
    source,
    `            for (const entry of this.fileEntries) {\n                writeFileSync(fd, \`\${JSON.stringify(entry)}\\n\`);\n            }`,
    `            writeFileSync(fd, __dshPiCodec.dshRowsFromPi(this.fileEntries[0], this.fileEntries.slice(1), this.sessionFile));`,
    'readable _rewriteFile',
  )
  source = replaceOnce(
    source,
    `            writeFileSync(fd, \`\${JSON.stringify(newHeader)}\\n\`);\n            for (const entry of sourceEntries) {\n                if (entry.type !== "session") {\n                    writeFileSync(fd, \`\${JSON.stringify(entry)}\\n\`);\n                }\n            }`,
    `            writeFileSync(fd, __dshPiCodec.dshRowsFromPi(newHeader, sourceEntries.filter((e) => e.type !== "session"), newSessionFile));`,
    'readable forkFrom',
  )
  return source
}

function patchBundle(source) {
  source = importLine + source
  source = replaceOnce(
    source,
    'function loadEntriesFromFile(filePath){let resolvedFilePath=normalizePath(filePath);',
    'function loadEntriesFromFile(filePath){let resolvedFilePath=normalizePath(filePath);if(__dshPiCodec.isDshFile(resolvedFilePath)){let c=__dshPiCodec.readDshAsPi(resolvedFilePath);return c?[c.header,...c.entries]:[]}',
    'bundle loadEntriesFromFile',
  )
  source = replaceOnce(
    source,
    'function readSessionHeader(filePath){let fd=openSync(filePath,"r");',
    'function readSessionHeader(filePath){if(__dshPiCodec.isDshFile(filePath))return __dshPiCodec.readPiHeader(filePath);let fd=openSync(filePath,"r");',
    'bundle readSessionHeader',
  )
  source = replaceOnce(
    source,
    'async function buildSessionInfo(filePath,signal,fileStats){try{let stats=fileStats??await stat(filePath),header=null,messageCount=0,firstMessage="",allMessages=[],name,lastActivityTime,rl=createInterface({input:createReadStream(filePath,{encoding:"utf8",signal}),crlfDelay:1/0});',
    'async function buildSessionInfo(filePath,signal,fileStats){try{if(__dshPiCodec.isDshFile(filePath)){let c=__dshPiCodec.readDshAsPi(filePath);if(c){let ms=c.entries.filter(e=>e.type==="message"),fu=ms.find(e=>e.message?.role==="user");return{path:filePath,id:c.header.id,cwd:c.header.cwd??"",name:void 0,parentSessionPath:c.header.parentSession,created:new Date(c.header.timestamp),modified:new Date(),messageCount:ms.length,firstMessage:fu?extractTextContent(fu.message)||"(no messages)":"(no messages)",allMessagesText:ms.map(e=>extractTextContent(e.message)).filter(Boolean).join(" ")}}}let stats=fileStats??await stat(filePath),header=null,messageCount=0,firstMessage="",allMessages=[],name,lastActivityTime,rl=createInterface({input:createReadStream(filePath,{encoding:"utf8",signal}),crlfDelay:1/0});',
    'bundle buildSessionInfo',
  )
  source = replaceOnce(
    source,
    'try{for(let e of this.fileEntries)writeFileSync3(fd,`${JSON.stringify(e)}\n`)}finally{closeSync(fd)}this.flushed=!0',
    'try{writeFileSync3(fd,__dshPiCodec.dshRowsFromPi(this.fileEntries[0],this.fileEntries.slice(1),this.sessionFile))}finally{closeSync(fd)}this.flushed=!0',
    'bundle _persist initial',
  )
  source = replaceOnce(
    source,
    'if(this.flushed)appendFileSync(this.sessionFile,`${JSON.stringify(entry)}\n`);else{',
    'if(this.flushed)__dshPiCodec.appendPiEntry(this.sessionFile,entry);else{',
    'bundle _persist append',
  )
  source = replaceOnce(
    source,
    'try{for(let entry of this.fileEntries)writeFileSync3(fd,`${JSON.stringify(entry)}\n`)}finally{closeSync(fd)}}isPersisted',
    'try{writeFileSync3(fd,__dshPiCodec.dshRowsFromPi(this.fileEntries[0],this.fileEntries.slice(1),this.sessionFile))}finally{closeSync(fd)}}isPersisted',
    'bundle _rewriteFile',
  )
  // forkFrom write loop (optional but cheap)
  const forkNeedle = 'writeFileSync3(fd,`${JSON.stringify(newHeader)}\n`);for(let entry of sourceEntries){if(entry.type!=="session"){writeFileSync3(fd,`${JSON.stringify(entry)}\n`)}}'
  if (source.includes(forkNeedle)) {
    source = source.replace(
      forkNeedle,
      'writeFileSync3(fd,__dshPiCodec.dshRowsFromPi(newHeader,sourceEntries.filter(e=>e.type!=="session"),newSessionFile))',
    )
  }
  return source
}

let patched = 0
try {
  for (const target of targets) {
    if (!existsSync(target)) continue
    let source = readFileSync(target, 'utf8')
    if (source.includes(MARKER)) {
      console.log(`dsh-pi: already patched: ${target}`)
      continue
    }
    const backup = `${target}.dsh-pi.bak`
    if (existsSync(backup)) {
      console.error(`dsh-pi: backup already exists: ${backup}; restore it first`)
      continue
    }
    source = target.endsWith('session-manager.js') ? patchReadable(source) : patchBundle(source)
    copyFileSync(target, backup)
    writeFileSync(target, source)
    patched += 1
    console.log(`dsh-pi: patched ${target}`)
  }
} catch (error) {
  console.error(`dsh-pi: patch failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

if (patched === 0) {
  console.log('dsh-pi: nothing to patch (already installed)')
} else {
  console.log(`dsh-pi: codec ${codecFile}`)
  console.log('dsh-pi: restore with --restore')
}
