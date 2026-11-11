/** CLI: convert pi and DSH session JSONL files. */

import { dshToPi, piToDsh } from '../src/dsh/convert.ts'

function usage(): never {
  console.error(`Usage:
  dsh-session pi2dsh <pi-session.jsonl> <out.dsh.jsonl>
  dsh-session dsh2pi <dsh-session.jsonl> <out.pi.jsonl>

Notes:
  - Reads plain .jsonl and .jsonl.zstd (zstd CLI) input.
  - With the native codec patch, pi itself writes the DSH v4 session file.
`)
  process.exit(2)
}

const [command, input, output] = process.argv.slice(2)
if (!command || !input || !output) usage()

try {
  const report = command === 'pi2dsh'
    ? await piToDsh(input, output)
    : command === 'dsh2pi'
      ? await dshToPi(input, output)
      : usage()
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
