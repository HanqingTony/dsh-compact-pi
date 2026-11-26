/** CLI: convert pi and DSH session JSONL files. */

import { dshToPi, piToDsh } from '../src/dsh/convert.ts'

const help = `Usage:
  dcp-session pi2dsh <pi-session.jsonl> <out.dsh.jsonl>
  dcp-session dsh2pi <dsh-session.jsonl> <out.pi.jsonl>
  dcp-session --help

pi2dsh exports the active pi context and archives the original pi entries.
dsh2pi restores those entries from an unchanged export. For a native or
continued DSH session it imports the active DSH context.

Use a separate output path. DSH input may be .jsonl or .zstd (requires zstd).
Image references are resolved under DSH_HOME (default ~/.dsh).`

const [command, input, output, ...extra] = process.argv.slice(2)
if (command === '--help' || command === '-h') {
  console.log(help)
  process.exit(0)
}
if ((command !== 'pi2dsh' && command !== 'dsh2pi') || !input || !output || extra.length) {
  console.error(help)
  process.exit(2)
}

try {
  const report =
    command === 'pi2dsh'
      ? await piToDsh(input, output)
      : await dshToPi(input, output)
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
