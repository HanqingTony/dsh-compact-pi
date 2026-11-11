# Native DSH session codec in pi (v0.1.0)

## Why a patch

pi's `SessionManager` owns the session file and opens it **before extensions
load**. The extension API has no session-codec hook, so a plugin alone cannot
make plain `pi` read/write DSH JSONL. v0.1.0 therefore ships a narrow,
reversible patch to `dist/core/session-manager.js` and the bundled CLI chunk.

## What the patch changes

| pi function | Change |
|---|---|
| `loadEntriesFromFile` | if the first row is a DSH v4 header, convert the event log to a pi header + pi entries and return them |
| `readSessionHeader` | recognize DSH headers for `--continue` / `--resume` discovery |
| `_persist` (first write) | write one complete DSH file from the in-memory pi entries |
| `_persist` (append) | map one pi entry to DSH event(s) and append |
| `_rewriteFile` | rewrite the DSH file from all pi entries |
| `forkFrom` | write the forked session as DSH |
| `buildSessionInfo` | feed `--resume` metadata from the DSH surface |

The conversion is synchronous and lives in `src/codec.ts`, bundled to
`dist/codec.mjs`. During installation it is copied to
`<pi>/dist/dsh-pi-codec.mjs`, so the patched pi is self-contained.

## Consistency model

- pi keeps its normal in-memory pi entries; only the file boundary changes.
- File appends and plugin rewrites are reconciled by mtime/size: the codec
  reloads the DSH file before appending after an external (plugin) rewrite.
- The plugin detects the native DSH file lazily (pi creates the session file
  on the first persisted message) and uses the native file as its canonical
  log, instead of a `.dsh/` sidecar.

## Install / restore

```bash
node scripts/patch-pi.mjs                 # auto-discovers pi
node scripts/patch-pi.mjs --pi-dir <dir>  # explicit
node scripts/patch-pi.mjs --restore
```

Backups are `<file>.dsh-pi.bak`; restore copies them back and removes the
installed codec. Re-apply after a pi upgrade.

## Remaining gaps

- `--continue` is exercised heavily; the `--resume` selector has the
  `buildSessionInfo` adaptation but has not been exercised as much.
- `model_change`, `thinking_level_change`, `session_info`, `label`, `usage`,
  and native `compaction` entries are not represented in DSH; they are
  dropped on the file boundary. The in-memory pi session still has them.
- `context_edit`, branches, and tree navigation are not mapped. The plugin
  uses the current branch only.
- An open turn is left at process exit; DSH repair closes it on import.
- The patch is tied to pi 1.5.0's function shapes. A newer pi may need the
  patch refreshed; the script fails loudly if a patch point is missing.
