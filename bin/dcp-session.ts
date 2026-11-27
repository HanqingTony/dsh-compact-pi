/** CLI: convert pi and DSH session JSONL files. */

import { dshToPi, piToDsh } from '../src/dsh/convert.ts'
import { importPiToDsh } from '../src/dsh/import.ts'
import { runMigration } from '../src/dsh/migration-cli.ts'

const help = `Usage:
  dcp-session migrate --help
  dcp-session pi2dsh <pi-session.jsonl> <out.dsh.jsonl>
  dcp-session pi2dsh-import <pi-session.jsonl> [dsh-session-root] [--plain]
  dcp-session dsh2pi <dsh-session.jsonl> <out.pi.jsonl>
  dcp-session --help

pi2dsh exports the active pi context and archives the original pi entries.
pi2dsh-import installs that export as a new DSH session. The default root is
$DSH_HOME/sessions with Zstandard encoding. Use --plain only for a DSH profile
configured with plaintext session storage.
dsh2pi restores those entries from an unchanged export. For a native or
continued DSH session it imports the active DSH context.

Use a separate output path. DSH input may be .jsonl or .zstd (requires zstd).
Image references are resolved under DSH_HOME (default ~/.dsh).`

async function main([command, input, ...args]: string[]) {
  if (command === '--help' || command === '-h') {
    console.log(help)
    return
  }
  if (command === 'migrate') return runMigration(input === undefined ? [] : [input, ...args])
  const importing = command === 'pi2dsh-import'
  const plain = importing && args.at(-1) === '--plain'
  if (plain) args.pop()
  const [output, ...extra] = args
  const valid = importing
    ? !output?.startsWith('--')
    : (command === 'pi2dsh' || command === 'dsh2pi') && output
  if (!input || !valid || extra.length) {
    console.error(help)
    process.exitCode = 2
    return
  }

  const report =
    importing ? await importPiToDsh(input, output, plain)
      : command === 'pi2dsh' ? await piToDsh(input, output!)
      : await dshToPi(input, output!)
  console.log(JSON.stringify(report, null, 2))
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
