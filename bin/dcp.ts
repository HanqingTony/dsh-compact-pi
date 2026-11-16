/** Launch pi with dcp. DSH input is imported into a new pi session, never overwritten. */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { dshToPi } from '../src/dsh/convert.ts'
import { isDshFile } from '../src/codec.ts'
const args = process.argv.slice(2)
const plugin = path.join(import.meta.dirname, 'index.js')
async function main() {
  for (let index = 0; index < args.length; index++) {
    const equals = args[index]!.startsWith('--session=')
    if (args[index] !== '--session' && !equals) continue
    const file = equals ? args[index]!.slice(10) : args[index + 1]
    if (file && (isDshFile(file) || file.endsWith('.zstd'))) {
      const output = `${file}.${Date.now()}.pi.jsonl`
      if (existsSync(output))
        throw new Error(`Import destination exists: ${output}`)
      await dshToPi(file, output)
      if (equals) args[index] = `--session=${output}`
      else args[index + 1] = output
      console.error(`dcp: imported DSH session into ${output}`)
    }
    break
  }
  // Explicit extension loading is reliable for one-shot use outside an installed package.
  args.push('-e', plugin)
  const child = spawn(process.env.PI_BIN ?? 'pi', args, { stdio: 'inherit' })
  child.on('error', (error) => {
    console.error(`dcp: ${error.message}`)
    process.exitCode = 1
  })
  child.on('exit', (code) => {
    process.exitCode = code ?? 1
  })
}
main().catch((error) => {
  console.error(`dcp: ${error.message}`)
  process.exitCode = 1
})
